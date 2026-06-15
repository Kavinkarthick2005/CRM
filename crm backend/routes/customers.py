import csv
import math
from datetime import datetime, timezone, timedelta
from io import StringIO
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_, and_, func
from db import get_db
from models.models import Customer, Order, Communication, Campaign

router = APIRouter()

@router.post("/customers/upload")
async def upload_customers(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(StringIO(text))
    
    expected_fields = {"name", "email", "phone", "channel_preference", "tags", "total_orders", "total_spend", "last_order_at"}
    if not expected_fields.issubset(set(reader.fieldnames or [])):
        raise HTTPException(status_code=422, detail=f"CSV must contain headers: {', '.join(expected_fields)}")
        
    customers_to_insert = []
    for row in reader:
        try:
            last_order_at = None
            if row.get("last_order_at"):
                dt = datetime.strptime(row["last_order_at"], "%Y-%m-%d")
                last_order_at = dt.replace(tzinfo=timezone.utc)
                
            c = Customer(
                name=row["name"],
                email=row["email"],
                phone=row.get("phone", ""),
                channel_preference=row.get("channel_preference", "email"),
                tags=row.get("tags", ""),
                total_orders=int(row.get("total_orders", 0)),
                total_spend=int(row.get("total_spend", 0)),
                last_order_at=last_order_at
            )
            customers_to_insert.append(c)
        except Exception as e:
            continue
            
    db.bulk_save_objects(customers_to_insert)
    db.commit()
    return {"message": f"Successfully imported {len(customers_to_insert)} customers"}

@router.get("/customers")
async def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100000),
    search: str = None,
    channel: str = None,
    tag: str = None,
    status: str = None,
    sort_by: str = Query("id"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(Customer.name.ilike(search_term), Customer.email.ilike(search_term)))
        
    if channel and channel != "all":
        query = query.filter(Customer.channel_preference.ilike(channel))
        
    if tag and tag != "all":
        query = query.filter(Customer.tags.ilike(f"%{tag}%"))
        
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)
    
    if status and status != "all":
        if status == "active":
            query = query.filter(Customer.last_order_at >= thirty_days_ago)
        elif status == "at_risk":
            query = query.filter(Customer.last_order_at < thirty_days_ago, Customer.last_order_at >= sixty_days_ago)
        elif status == "churned":
            query = query.filter(or_(Customer.last_order_at < sixty_days_ago, Customer.last_order_at == None))

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    
    sort_column = getattr(Customer, sort_by, Customer.id)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
        
    customers = query.offset((page - 1) * limit).limit(limit).all()
    
    # Add dynamic status to response
    results = []
    for c in customers:
        c_dict = {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "channel_preference": c.channel_preference,
            "tags": c.tags,
            "total_spend": c.total_spend,
            "total_orders": c.total_orders,
            "last_order_at": c.last_order_at,
            "created_at": c.created_at
        }
        
        c_status = "churned"
        if c.last_order_at:
            days_inactive = (now - c.last_order_at.replace(tzinfo=timezone.utc)).days
            if days_inactive < 30:
                c_status = "active"
            elif days_inactive <= 60:
                c_status = "at_risk"
                
        c_dict["status"] = c_status
        results.append(c_dict)
    
    return {
        "data": results,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": pages
    }

@router.get("/customers/{customer_id}")
async def get_customer_profile(customer_id: int = Path(...), db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    orders = db.query(Order).filter(Order.customer_id == customer_id).order_by(desc(Order.created_at)).all()
    
    communications = db.query(Communication).filter(Communication.customer_id == customer_id).all()
    
    # We want a unified timeline of both Orders and Communications
    timeline = []
    
    for o in orders:
        timeline.append({
            "type": "order",
            "date": o.created_at,
            "title": "Order Placed",
            "details": f"${o.amount} spent on {len(o.items) if o.items else 0} items"
        })
        
    comm_history = []
    for comm in communications:
        campaign = comm.campaign
        if campaign:
            comm_history.append({
                "campaign_name": campaign.name,
                "channel": campaign.channel,
                "status": comm.status,
                "sent_at": comm.created_at,
                "updated_at": comm.timestamp
            })
            
            timeline.append({
                "type": "communication",
                "date": comm.created_at,
                "title": f"Campaign Sent: {campaign.name}",
                "details": f"Sent via {campaign.channel}. Status: {comm.status}"
            })
            if comm.status in ["opened", "clicked"]:
                timeline.append({
                    "type": "engagement",
                    "date": comm.timestamp,
                    "title": f"Campaign {comm.status.capitalize()}",
                    "details": f"Customer {comm.status} the {campaign.channel} message."
                })
                
    timeline.append({
        "type": "event",
        "date": customer.created_at,
        "title": "Account Created",
        "details": f"Customer joined with {customer.channel_preference} preference."
    })
    
    if customer.tags and "VIP" in customer.tags.upper():
        vip_date = customer.last_order_at if customer.last_order_at else customer.created_at
        timeline.append({
            "type": "event",
            "date": vip_date,
            "title": "VIP Tag Added",
            "details": "Customer reached VIP status."
        })
                
    # Sort timeline chronologically (oldest to newest) as requested
    timeline.sort(key=lambda x: x["date"], reverse=False)
    
    now = datetime.now(timezone.utc)
    c_status = "churned"
    days_inactive = 0
    if customer.last_order_at:
        days_inactive = (now - customer.last_order_at.replace(tzinfo=timezone.utc)).days
        if days_inactive < 30:
            c_status = "active"
        elif days_inactive <= 60:
            c_status = "at_risk"
            
    avg_order_value = round(customer.total_spend / customer.total_orders, 2) if customer.total_orders > 0 else 0
    
    profile = {
        "id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "channel_preference": customer.channel_preference,
        "tags": customer.tags,
        "created_at": customer.created_at,
        "stats": {
            "total_orders": customer.total_orders,
            "total_spend": customer.total_spend,
            "avg_order_value": avg_order_value,
            "days_inactive": days_inactive,
            "status": c_status
        }
    }
    
    return {
        "customer": profile,
        "orders": [{"id": o.id, "amount": o.amount, "items": o.items, "date": o.created_at} for o in orders],
        "communications": sorted(comm_history, key=lambda x: x["sent_at"], reverse=True),
        "timeline": timeline
    }

@router.get("/customers/{customer_id}/health")
async def get_customer_health(customer_id: int = Path(...), db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    now = datetime.now(timezone.utc)
    
    # 1. Recency (Days Inactive) - 40 points max
    days_inactive = 0
    if customer.last_order_at:
        days_inactive = (now - customer.last_order_at.replace(tzinfo=timezone.utc)).days
    else:
        days_inactive = 100 # Default penalty if no orders
        
    recency_score = max(0, 40 - (days_inactive / 90 * 40))
    
    # 2. Engagement (Open Rate) - 30 points max
    communications = db.query(Communication).filter(Communication.customer_id == customer_id).all()
    delivered = sum(1 for c in communications if c.status in ["delivered", "opened", "clicked"])
    opened = sum(1 for c in communications if c.status in ["opened", "clicked"])
    
    engagement_score = 15 # Default for no communications
    if delivered > 0:
        open_rate = opened / delivered
        engagement_score = open_rate * 30
        
    # 3. Frequency (Total Orders) - 15 points max
    frequency_score = min(15, customer.total_orders * 3)
    
    # 4. Monetary (Lifetime Spend) - 15 points max
    monetary_score = min(15, (customer.total_spend / 1000) * 15)
    
    # Calculate total health score
    health_score = round(recency_score + engagement_score + frequency_score + monetary_score)
    health_score = max(0, min(100, health_score)) # Bound 0-100
    
    # Determine status
    if health_score >= 70:
        status = "Healthy"
    elif health_score >= 40:
        status = "At Risk"
    else:
        status = "Critical"
        
    return {
        "customer_id": customer_id,
        "health_score": health_score,
        "status": status,
        "metrics": {
            "days_inactive": days_inactive,
            "open_rate_percent": round((opened / delivered * 100) if delivered > 0 else 0),
            "total_orders": customer.total_orders,
            "lifetime_spend": customer.total_spend
        },
        "breakdown": {
            "recency_score": round(recency_score),
            "engagement_score": round(engagement_score),
            "frequency_score": round(frequency_score),
            "monetary_score": round(monetary_score)
        }
    }
