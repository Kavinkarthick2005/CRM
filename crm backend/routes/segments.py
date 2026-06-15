from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, timezone
from typing import List, Dict, Any

from db import get_db
from models.models import CustomerGroup, CustomerGroupMember, Customer, TriggerRule

router = APIRouter()

@router.get("/segments")
def get_segments(db: Session = Depends(get_db)):
    groups = db.query(CustomerGroup).all()
    results = []

    now = datetime.now(timezone.utc)

    for group in groups:
        # Fetch members
        members = db.query(Customer).join(CustomerGroupMember, CustomerGroupMember.customer_id == Customer.id).filter(CustomerGroupMember.group_id == group.id).all()
        
        member_count = len(members)
        ltv = sum(c.total_spend for c in members)
        
        at_risk = 0
        churned = 0
        active = 0
        
        for c in members:
            days_inactive = (now - c.last_order_at.replace(tzinfo=timezone.utc)).days if c.last_order_at else 0
            if not c.last_order_at:
                churned += 1
            elif days_inactive < 30:
                active += 1
            elif days_inactive <= 60:
                at_risk += 1
            else:
                churned += 1

        active_triggers = db.query(TriggerRule).filter(TriggerRule.group_id == group.id, TriggerRule.is_active == True).count()

        results.append({
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "group_type": group.group_type,
            "member_count": member_count,
            "ltv": ltv,
            "health": {
                "active": active,
                "at_risk": at_risk,
                "churned": churned
            },
            "active_triggers": active_triggers
        })

    return results
