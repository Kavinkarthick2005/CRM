from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models.models import Communication, Campaign
from models.schemas import ReceiptWebhook

router = APIRouter()

@router.post("/receipt")
async def process_receipt(webhook: ReceiptWebhook, db: Session = Depends(get_db)):
    comm = db.query(Communication).filter(Communication.id == webhook.comm_id).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")
        
    comm.status = webhook.event
    comm.timestamp = webhook.timestamp
    db.commit()
    
    campaign_id = comm.campaign_id
    all_comms = db.query(Communication).filter(Communication.campaign_id == campaign_id).all()
    
    terminal_statuses = {"delivered", "failed", "opened", "clicked"}
    all_terminal = all(c.status in terminal_statuses for c in all_comms)
    
    if all_terminal:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign and campaign.status != "completed":
            campaign.status = "completed"
            db.commit()
            
    return {"message": "Receipt processed"}
