from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from db import get_db
from models.models import TriggerRule, CustomerGroup
from ai_service import get_llm

router = APIRouter()

class TriggerCreate(BaseModel):
    name: str
    group_id: int
    trigger_type: str
    conditions: Dict[str, Any]
    action_type: str
    action_payload: Dict[str, Any]

class ParseRequest(BaseModel):
    prompt: str

@router.get("/automations")
def list_automations(db: Session = Depends(get_db)):
    rules = db.query(TriggerRule).all()
    results = []
    for r in rules:
        group = db.query(CustomerGroup).filter(CustomerGroup.id == r.group_id).first()
        results.append({
            "id": r.id,
            "name": r.name,
            "group_name": group.name if group else "Unknown",
            "trigger_type": r.trigger_type,
            "conditions": r.conditions,
            "action_type": r.action_type,
            "action_payload": r.action_payload,
            "is_active": r.is_active,
            "times_fired": r.times_fired,
            "last_triggered_at": r.last_triggered_at
        })
    return results

@router.post("/automations")
def create_automation(trigger: TriggerCreate, db: Session = Depends(get_db)):
    rule = TriggerRule(
        name=trigger.name,
        group_id=trigger.group_id,
        trigger_type=trigger.trigger_type,
        conditions=trigger.conditions,
        action_type=trigger.action_type,
        action_payload=trigger.action_payload,
        is_active=True
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.post("/automations/parse")
def parse_automation(req: ParseRequest, db: Session = Depends(get_db)):
    groups = db.query(CustomerGroup).all()
    group_context = ", ".join([f"'{g.name}' (ID: {g.id})" for g in groups])
    
    system_prompt = f"""You are an AI that converts natural language marketing automation rules into JSON.
You have access to the following Customer Groups: {group_context}.
Extract the following:
- group_id: integer
- trigger_type: string (one of: inactivity, churn_risk, new_customer, vip_milestone)
- conditions: JSON object (e.g., {{"days_inactive": {{"$gt": 30}}}})
- action_type: string (one of: email, sms, generate_campaign)
- name: A short title for the rule.

Return ONLY a valid JSON object. No markdown, no explanations."""

    try:
        llm = get_llm()
        response = llm.invoke([
            ("system", system_prompt),
            ("user", req.prompt)
        ])
        
        import json
        content = response.content
        if content.startswith("```json"):
            content = content[7:-3]
        if content.startswith("```"):
            content = content[3:-3]
            
        data = json.loads(content.strip())
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
