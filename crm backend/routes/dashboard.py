from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from db import get_db
from models.models import Customer, Campaign, Communication
from datetime import datetime, timedelta, timezone

router = APIRouter()

@router.get("/dashboard/overview")
def get_overview(db: Session = Depends(get_db)):
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    campaigns_sent = db.query(func.count(Campaign.id)).scalar() or 0
    messages_delivered = db.query(func.count(Communication.id)).filter(Communication.status == 'delivered').scalar() or 0
    
    # Calculate open rate
    total_delivered = db.query(func.count(Communication.id)).filter(Communication.status.in_(['delivered', 'opened', 'clicked'])).scalar() or 0
    total_opened = db.query(func.count(Communication.id)).filter(Communication.status.in_(['opened', 'clicked'])).scalar() or 0
    
    overall_open_rate = 0.0
    if total_delivered > 0:
        overall_open_rate = round((total_opened / total_delivered) * 100, 1)
        
    return {
        "total_customers": total_customers,
        "campaigns_sent": campaigns_sent,
        "messages_delivered": messages_delivered,
        "overall_open_rate": overall_open_rate
    }

@router.get("/dashboard/activity")
def get_activity(db: Session = Depends(get_db)):
    # Last 30 days messaging trends
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    results = db.query(
        func.date(Communication.created_at).label('date'),
        func.count(Communication.id).label('messages_sent')
    ).filter(
        Communication.created_at >= thirty_days_ago
    ).group_by(
        func.date(Communication.created_at)
    ).order_by(
        func.date(Communication.created_at)
    ).all()
    
    return [{"date": str(r.date), "messages_sent": r.messages_sent} for r in results]

@router.get("/dashboard/funnel")
def get_funnel(db: Session = Depends(get_db)):
    sent = db.query(func.count(Communication.id)).scalar() or 0
    delivered = db.query(func.count(Communication.id)).filter(Communication.status.in_(['delivered', 'opened', 'clicked'])).scalar() or 0
    opened = db.query(func.count(Communication.id)).filter(Communication.status.in_(['opened', 'clicked'])).scalar() or 0
    clicked = db.query(func.count(Communication.id)).filter(Communication.status == 'clicked').scalar() or 0
    
    return {
        "sent": sent,
        "delivered": delivered,
        "opened": opened,
        "clicked": clicked
    }

@router.get("/dashboard/channels")
def get_channels(db: Session = Depends(get_db)):
    results = db.query(
        Campaign.channel,
        func.count(Campaign.id).label('count')
    ).group_by(Campaign.channel).all()
    
    # Map back to capitalized friendly names if desired, but raw is fine.
    # Capitalize first letter.
    return [{"channel": r.channel.capitalize() if r.channel else "Unknown", "count": r.count} for r in results]

@router.get("/dashboard/segments")
def get_segments(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)
    
    vip = db.query(func.count(Customer.id)).filter(Customer.total_spend >= 500).scalar() or 0
    active = db.query(func.count(Customer.id)).filter(Customer.last_order_at >= thirty_days_ago, Customer.total_spend < 500).scalar() or 0
    at_risk = db.query(func.count(Customer.id)).filter(Customer.last_order_at < thirty_days_ago, Customer.last_order_at >= sixty_days_ago, Customer.total_spend < 500).scalar() or 0
    churned = db.query(func.count(Customer.id)).filter(Customer.last_order_at < sixty_days_ago, Customer.total_spend < 500).scalar() or 0
    
    # Also handle customers with NO order ever as churned
    never_ordered = db.query(func.count(Customer.id)).filter(Customer.last_order_at == None, Customer.total_spend < 500).scalar() or 0
    churned += never_ordered
    
    return {
        "active": active,
        "at_risk": at_risk,
        "churned": churned,
        "vip": vip
    }

@router.get("/dashboard/recent-campaigns")
def get_recent_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).limit(5).all()
    
    result = []
    for c in campaigns:
        total_comms = db.query(func.count(Communication.id)).filter(Communication.campaign_id == c.id).scalar() or 0
        delivered = db.query(func.count(Communication.id)).filter(Communication.campaign_id == c.id, Communication.status.in_(['delivered', 'opened', 'clicked'])).scalar() or 0
        opened = db.query(func.count(Communication.id)).filter(Communication.campaign_id == c.id, Communication.status.in_(['opened', 'clicked'])).scalar() or 0
        
        delivery_rate = round((delivered / total_comms * 100), 1) if total_comms > 0 else 0
        open_rate = round((opened / delivered * 100), 1) if delivered > 0 else 0
        
        result.append({
            "id": c.id,
            "campaign_name": c.name,
            "channel": c.channel.capitalize() if c.channel else "Unknown",
            "audience_size": total_comms,
            "delivery_rate": delivery_rate,
            "open_rate": open_rate,
            "status": c.status,
            "created_at": c.created_at
        })
    return result

@router.get("/dashboard/at-risk-customers")
def get_at_risk_customers(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)
    
    customers = db.query(Customer).filter(
        Customer.last_order_at < thirty_days_ago, 
        Customer.last_order_at >= sixty_days_ago
    ).order_by(Customer.total_spend.desc()).limit(10).all()
    
    result = []
    for c in customers:
        days_inactive = (now - c.last_order_at.replace(tzinfo=timezone.utc)).days if c.last_order_at else 0
        result.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "last_order_at": c.last_order_at,
            "days_inactive": days_inactive,
            "total_spend": c.total_spend
        })
    return result

@router.get("/dashboard/insights")
def get_insights(db: Session = Depends(get_db)):
    insights = []
    
    # Insight 1: At Risk
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)
    at_risk_count = db.query(func.count(Customer.id)).filter(Customer.last_order_at < thirty_days_ago, Customer.last_order_at >= sixty_days_ago).scalar() or 0
    if at_risk_count > 0:
        insights.append({
            "text": f"{at_risk_count} customers may churn soon.",
            "prompt": "Send a win-back campaign to at-risk customers."
        })
        
    # Insight 2: Channel performance
    # For simplicity, deterministic logic:
    whatsapp_opened = db.query(func.count(Communication.id)).join(Campaign).filter(Campaign.channel == 'whatsapp', Communication.status.in_(['opened', 'clicked'])).scalar() or 0
    whatsapp_delivered = db.query(func.count(Communication.id)).join(Campaign).filter(Campaign.channel == 'whatsapp', Communication.status.in_(['delivered', 'opened', 'clicked'])).scalar() or 0
    email_opened = db.query(func.count(Communication.id)).join(Campaign).filter(Campaign.channel == 'email', Communication.status.in_(['opened', 'clicked'])).scalar() or 0
    email_delivered = db.query(func.count(Communication.id)).join(Campaign).filter(Campaign.channel == 'email', Communication.status.in_(['delivered', 'opened', 'clicked'])).scalar() or 0
    
    w_rate = (whatsapp_opened / whatsapp_delivered) if whatsapp_delivered > 0 else 0
    e_rate = (email_opened / email_delivered) if email_delivered > 0 else 0
    
    if w_rate > e_rate and whatsapp_delivered > 10:
        diff = round((w_rate - e_rate) * 100, 1)
        insights.append({
            "text": f"WhatsApp campaigns outperform Email by {diff}%.",
            "prompt": "Send a WhatsApp campaign to active customers with a special offer."
        })
    elif e_rate > w_rate and email_delivered > 10:
        diff = round((e_rate - w_rate) * 100, 1)
        insights.append({
            "text": f"Email campaigns outperform WhatsApp by {diff}%.",
            "prompt": "Send an email newsletter to all active customers."
        })
        
    # Insight 3: VIPs
    vip_threshold = 500
    vip_count = db.query(func.count(Customer.id)).filter(Customer.total_spend >= vip_threshold, Customer.last_order_at < thirty_days_ago).scalar() or 0
    if vip_count > 0:
        insights.append({
            "text": "VIP customers haven't received campaigns recently.",
            "prompt": "Send an exclusive preview campaign to VIP customers."
        })
        
    return insights
