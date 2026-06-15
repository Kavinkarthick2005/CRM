import asyncio
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from db import SessionLocal
from models.models import TriggerRule, CustomerGroupMember, Customer, Campaign, Communication

# Global state to expose to health check
AUTOMATION_ENGINE_STATUS = "active"
LAST_RUN = None
RULES_EVALUATED = 0

async def automation_worker_loop():
    global AUTOMATION_ENGINE_STATUS
    print("[⚙️ Automation] Worker started.")
    while True:
        try:
            await check_triggers()
        except Exception as e:
            AUTOMATION_ENGINE_STATUS = "degraded"
            print(f"[⚙️ Automation] Worker error: {e}")
        await asyncio.sleep(30)

async def check_triggers():
    global LAST_RUN, RULES_EVALUATED, AUTOMATION_ENGINE_STATUS
    db = SessionLocal()
    try:
        rules = db.query(TriggerRule).filter(TriggerRule.is_active == True).all()
        RULES_EVALUATED = len(rules)
        now = datetime.now(timezone.utc)
        
        for rule in rules:
            if not rule.group_id:
                continue
                
            members = db.query(Customer).join(CustomerGroupMember, CustomerGroupMember.customer_id == Customer.id).filter(CustomerGroupMember.group_id == rule.group_id).all()
            
            triggered_customers = []
            for c in members:
                # We need a cooldown mechanism so we don't spam them every 30s.
                # For demo purposes, we will only trigger if last_triggered_at is over 24h ago, 
                # or we just limit to 1 fire per rule a day.
                
                if rule.trigger_type == "inactivity":
                    days_inactive = (now - c.last_order_at.replace(tzinfo=timezone.utc)).days if c.last_order_at else 0
                    threshold = rule.conditions.get("days_inactive", {}).get("$gt", 30)
                    if days_inactive > threshold:
                        triggered_customers.append(c)
                elif rule.trigger_type == "vip_milestone":
                    spend = c.total_spend
                    threshold = rule.conditions.get("spend", {}).get("$gt", 1000)
                    if spend > threshold:
                        triggered_customers.append(c)
                        
            if triggered_customers:
                # Basic Cooldown: If triggered in the last 24h, skip
                if rule.last_triggered_at:
                    hours_since = (now - rule.last_triggered_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
                    if hours_since < 24:
                        continue

                print(f"[⚙️ Automation] Trigger '{rule.name}' matched {len(triggered_customers)} customers. Creating campaign.")
                
                campaign = Campaign(
                    name=f"Auto: {rule.name} ({now.strftime('%b %d')})",
                    segment_query={"group_id": rule.group_id, "trigger": rule.trigger_type},
                    message_text=f"Automated engagement for {rule.name}",
                    channel="email",
                    status="draft" # Stays draft until a real agent processes it, or we could set to 'completed' for demo
                )
                db.add(campaign)
                db.flush()
                
                for tc in triggered_customers:
                    comm = Communication(campaign_id=campaign.id, customer_id=tc.id, status="queued")
                    db.add(comm)
                
                rule.times_fired += 1
                rule.last_triggered_at = now
                
                db.commit()
                
        LAST_RUN = datetime.now(timezone.utc)
        AUTOMATION_ENGINE_STATUS = "operational"
    finally:
        db.close()
