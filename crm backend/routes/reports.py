import csv
from io import StringIO
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from datetime import datetime, timezone, timedelta

from db import get_db
from models.models import Customer, Campaign, Communication

router = APIRouter()

@router.get("/reports/campaigns")
def export_campaigns(db: Session = Depends(get_db)):
    def iter_csv():
        output = StringIO()
        writer = csv.writer(output)
        # Header
        writer.writerow([
            "Campaign Name", "Channel", "Status", "Audience Size", 
            "Delivered", "Failed", "Opened", "Clicked", 
            "Delivery Rate %", "Open Rate %", "Click Rate %", 
            "Created At", "Sent At"
        ])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        campaigns = db.query(Campaign).order_by(desc(Campaign.created_at)).all()
        for c in campaigns:
            total_comms = db.query(func.count(Communication.id)).filter(Communication.campaign_id == c.id).scalar() or 0
            delivered = db.query(func.count(Communication.id)).filter(Communication.campaign_id == c.id, Communication.status.in_(['delivered', 'opened', 'clicked'])).scalar() or 0
            failed = db.query(func.count(Communication.id)).filter(Communication.campaign_id == c.id, Communication.status == 'failed').scalar() or 0
            opened = db.query(func.count(Communication.id)).filter(Communication.campaign_id == c.id, Communication.status.in_(['opened', 'clicked'])).scalar() or 0
            clicked = db.query(func.count(Communication.id)).filter(Communication.campaign_id == c.id, Communication.status == 'clicked').scalar() or 0
            
            delivery_rate = round((delivered / total_comms * 100), 1) if total_comms > 0 else 0
            open_rate = round((opened / delivered * 100), 1) if delivered > 0 else 0
            click_rate = round((clicked / opened * 100), 1) if opened > 0 else 0
            
            # Use the created_at of the first communication as sent_at, else c.created_at
            first_comm = db.query(func.min(Communication.created_at)).filter(Communication.campaign_id == c.id).scalar()
            sent_at = first_comm if first_comm else c.created_at

            writer.writerow([
                c.name,
                c.channel,
                c.status,
                total_comms,
                delivered,
                failed,
                opened,
                clicked,
                delivery_rate,
                open_rate,
                click_rate,
                c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else "",
                sent_at.strftime("%Y-%m-%d %H:%M:%S") if sent_at else ""
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    return StreamingResponse(
        iter_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=campaigns_report.csv"}
    )

@router.get("/reports/customers")
def export_customers(
    search: str = None,
    channel: str = None,
    tag: str = None,
    status: str = None,
    db: Session = Depends(get_db)
):
    def iter_csv():
        output = StringIO()
        writer = csv.writer(output)
        # Header
        writer.writerow([
            "Name", "Email", "Phone", "Channel Preference", "Tags",
            "Total Orders", "Total Spend", "Last Order Date",
            "Days Inactive", "Status"
        ])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

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

        # Generator pattern is good for large datasets if we use yield_per, but for simplicity .all() or chunking
        customers = query.order_by(desc(Customer.id)).all()
        
        for c in customers:
            c_status = "churned"
            days_inactive = 0
            if c.last_order_at:
                days_inactive = (now - c.last_order_at.replace(tzinfo=timezone.utc)).days
                if days_inactive < 30:
                    c_status = "active"
                elif days_inactive <= 60:
                    c_status = "at_risk"

            writer.writerow([
                c.name,
                c.email,
                c.phone or "",
                c.channel_preference,
                c.tags or "",
                c.total_orders,
                c.total_spend,
                c.last_order_at.strftime("%Y-%m-%d") if c.last_order_at else "",
                days_inactive,
                c_status
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    return StreamingResponse(
        iter_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=customers_report.csv"}
    )

@router.get("/reports/campaign/{id}")
def export_campaign(id: int, db: Session = Depends(get_db)):
    from models.models import AgentExecutionLog
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Campaign not found")

    def iter_csv():
        output = StringIO()
        writer = csv.writer(output)
        
        # Metrics
        total_comms = db.query(func.count(Communication.id)).filter(Communication.campaign_id == id).scalar() or 0
        sent = db.query(func.count(Communication.id)).filter(Communication.campaign_id == id, Communication.status.in_(['sent', 'delivered', 'opened', 'clicked'])).scalar() or 0
        delivered = db.query(func.count(Communication.id)).filter(Communication.campaign_id == id, Communication.status.in_(['delivered', 'opened', 'clicked'])).scalar() or 0
        failed = db.query(func.count(Communication.id)).filter(Communication.campaign_id == id, Communication.status == 'failed').scalar() or 0
        opened = db.query(func.count(Communication.id)).filter(Communication.campaign_id == id, Communication.status.in_(['opened', 'clicked'])).scalar() or 0
        clicked = db.query(func.count(Communication.id)).filter(Communication.campaign_id == id, Communication.status == 'clicked').scalar() or 0
        
        delivery_rate = round((delivered / total_comms * 100), 1) if total_comms > 0 else 0
        open_rate = round((opened / delivered * 100), 1) if delivered > 0 else 0
        click_rate = round((clicked / opened * 100), 1) if opened > 0 else 0

        # Agent Stats
        logs = db.query(AgentExecutionLog).filter(AgentExecutionLog.campaign_id == id).all()
        total_duration = sum([log.duration_ms for log in logs if log.duration_ms])
        avg_confidence = round(sum([log.confidence_score for log in logs if log.confidence_score]) / len([l for l in logs if l.confidence_score]) if [l for l in logs if l.confidence_score] else 0, 1)
        fallback_used = any([log.fallback_used for log in logs])
        recovery_activation = any([log.agent_name == "Recovery Agent" for log in logs])
        
        writer.writerow(["=== Campaign Summary ==="])
        writer.writerow(["Campaign Name", campaign.name])
        writer.writerow(["Channel", campaign.channel])
        writer.writerow(["Status", campaign.status])
        writer.writerow(["Created Date", campaign.created_at.strftime("%Y-%m-%d %H:%M:%S") if campaign.created_at else ""])
        writer.writerow([])
        
        writer.writerow(["=== Funnel Metrics ==="])
        writer.writerow(["Audience Size", total_comms])
        writer.writerow(["Sent", sent])
        writer.writerow(["Delivered", delivered])
        writer.writerow(["Failed", failed])
        writer.writerow(["Opened", opened])
        writer.writerow(["Clicked", clicked])
        writer.writerow([])
        
        writer.writerow(["=== Conversion Rates ==="])
        writer.writerow(["Delivery Rate %", delivery_rate])
        writer.writerow(["Open Rate %", open_rate])
        writer.writerow(["Click Rate %", click_rate])
        writer.writerow([])
        
        writer.writerow(["=== Agent Intelligence ==="])
        writer.writerow(["Execution Time (ms)", total_duration])
        writer.writerow(["Confidence Score", avg_confidence])
        writer.writerow(["Fallback Used?", "Yes" if fallback_used else "No"])
        writer.writerow(["Recovery Triggered?", "Yes" if recovery_activation else "No"])
        
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

    return StreamingResponse(
        iter_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=campaign_{id}_report.csv"}
    )

@router.get("/reports/customer/{id}")
def export_customer(id: int, db: Session = Depends(get_db)):
    from models.models import Order
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Customer not found")

    def iter_csv():
        output = StringIO()
        writer = csv.writer(output)
        
        now = datetime.now(timezone.utc)
        days_inactive = (now - customer.last_order_at.replace(tzinfo=timezone.utc)).days if customer.last_order_at else 0
        c_status = "active" if days_inactive < 30 else ("at_risk" if days_inactive <= 60 else "churned")
        if not customer.last_order_at: c_status = "churned"
        
        # Calculate health score (deterministic)
        recency_score = max(0, 100 - (days_inactive))
        freq_score = min(100, customer.total_orders * 10)
        monetary_score = min(100, customer.total_spend / 100)
        health_score = int((recency_score * 0.5) + (freq_score * 0.25) + (monetary_score * 0.25))

        writer.writerow(["=== Customer Profile ==="])
        writer.writerow(["Name", customer.name])
        writer.writerow(["Email", customer.email])
        writer.writerow(["Preferred Channel", customer.channel_preference])
        writer.writerow(["Tags", customer.tags])
        writer.writerow([])

        writer.writerow(["=== Customer Health ==="])
        writer.writerow(["Status", c_status])
        writer.writerow(["Days Inactive", days_inactive])
        writer.writerow(["Health Score", health_score])
        writer.writerow([])

        avg_order_value = round(customer.total_spend / customer.total_orders, 2) if customer.total_orders > 0 else 0
        writer.writerow(["=== Spending & Engagement ==="])
        writer.writerow(["Lifetime Spend", customer.total_spend])
        writer.writerow(["Average Order Value", avg_order_value])
        writer.writerow(["Orders Count", customer.total_orders])
        writer.writerow([])

        writer.writerow(["=== Timeline History ==="])
        writer.writerow(["Date", "Type", "Details", "Status/Amount"])
        
        events = []
        orders = db.query(Order).filter(Order.customer_id == id).all()
        for o in orders:
            events.append({
                "date": o.created_at,
                "type": "Order",
                "details": f"Items: {len(o.items) if o.items else 0}",
                "val": f"${o.amount}"
            })
            
        comms = db.query(Communication).filter(Communication.customer_id == id).all()
        for c in comms:
            events.append({
                "date": c.timestamp,
                "type": "Campaign",
                "details": f"Campaign #{c.campaign_id}",
                "val": c.status
            })
            
        events.sort(key=lambda x: x["date"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        
        for e in events:
            writer.writerow([
                e["date"].strftime("%Y-%m-%d %H:%M:%S") if e["date"] else "",
                e["type"],
                e["details"],
                e["val"]
            ])
            
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

    return StreamingResponse(
        iter_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=customer_{id}_report.csv"}
    )
