import csv
from datetime import datetime, timezone, timedelta
from io import StringIO
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db import get_db
from models.models import Customer
from models.schemas import CustomerOut

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
                # Parse YYYY-MM-DD
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
    limit: int = Query(20, ge=1, le=100),
    min_spend: int = None,
    max_days_inactive: int = None,
    min_orders: int = None,
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    if min_spend is not None:
        query = query.filter(Customer.total_spend >= min_spend)
    if min_orders is not None:
        query = query.filter(Customer.total_orders >= min_orders)
    if max_days_inactive is not None:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=max_days_inactive)
        query = query.filter(Customer.last_order_at >= cutoff_date)
        
    total = query.count()
    customers = query.order_by(desc(Customer.id)).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": customers
    }
