from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from db import get_db
from models.models import Campaign, Customer, Communication
from models.schemas import CampaignCreate, CampaignOut, CampaignStats
from routes.segment import apply_segment_filters
import httpx
import os
import asyncio
import random
from db import SessionLocal

router = APIRouter()
CHANNEL_SERVICE_URL = os.getenv("CHANNEL_SERVICE_URL", "http://localhost:8001")

async def update_comm_status(comm_id: int, outcome: str, db: Session):
    comm = db.query(Communication).filter(Communication.id == comm_id).first()
    if comm:
        comm.status = outcome
        db.commit()

async def fake_delivery_simulation(comm_id: int, db: Session):
    await asyncio.sleep(random.uniform(1, 3))
    
    # Simulate outcome
    outcome = random.choices(['delivered', 'failed'], weights=[85, 15])[0]
    await update_comm_status(comm_id, outcome, db)
    
    # Simulate engagement
    if outcome == 'delivered':
        await asyncio.sleep(random.uniform(2, 6))
        if random.random() < 0.4:
            await update_comm_status(comm_id, 'opened', db)
            if random.random() < 0.25:
                await asyncio.sleep(1)
                await update_comm_status(comm_id, 'clicked', db)

async def send_to_channel_service(communications: list, message_text: str):
    import main
    db = SessionLocal()
    try:
        async with httpx.AsyncClient() as client:
            for comm in communications:
                if not main.CHANNEL_SERVICE_AVAILABLE:
                    print(f"[⚠️ Channel] Service offline, using fake delivery for {comm.id}")
                    asyncio.create_task(fake_delivery_simulation(comm.id, db))
                    continue
                    
                receipt_url = "http://localhost:8000/api/receipt"
                payload = {
                    "comm_id": comm.id,
                    "customer_id": comm.customer_id,
                    "message": message_text,
                    "channel": comm.customer.channel_preference,
                    "crm_receipt_url": receipt_url
                }
                try:
                    await client.post(f"{CHANNEL_SERVICE_URL}/send", json=payload, timeout=5.0)
                except Exception as e:
                    print(f"[⚠️ Channel] Service unreachable ({e}), using fake delivery for {comm.id}")
                    asyncio.create_task(fake_delivery_simulation(comm.id, db))
    finally:
        db.close()

@router.post("/campaigns", response_model=CampaignOut)
async def create_campaign(campaign_in: CampaignCreate, db: Session = Depends(get_db)):
    campaign = Campaign(
        name=campaign_in.name,
        segment_query=campaign_in.segment_query.dict(exclude_none=True),
        message_text=campaign_in.message_text,
        channel=campaign_in.channel,
        status="draft"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.post("/campaigns/{id}/send")
async def send_campaign(id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft campaigns can be sent")
        
    campaign.status = "sending"
    db.commit()
    
    from models.schemas import SegmentQuery
    segment = SegmentQuery(**campaign.segment_query)
    
    query = db.query(Customer)
    query = apply_segment_filters(query, segment)
    target_customers = query.all()
    
    comms = []
    for customer in target_customers:
        comm = Communication(
            campaign_id=campaign.id,
            customer_id=customer.id,
            status="queued"
        )
        db.add(comm)
        comms.append(comm)
        
    db.commit()
    for comm in comms:
        db.refresh(comm)
        
    background_tasks.add_task(send_to_channel_service, comms, campaign.message_text)
    
    return {
        "campaign_id": campaign.id,
        "segment_size": len(comms),
        "status": "sending"
    }

@router.get("/campaigns", response_model=list[CampaignStats])
async def list_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).order_by(Campaign.id.desc()).all()
    results = []
    for c in campaigns:
        stats = {
            "queued": 0, "sent": 0, "delivered": 0,
            "failed": 0, "opened": 0, "clicked": 0
        }
        comms = db.query(Communication).filter(Communication.campaign_id == c.id).all()
        for comm in comms:
            if comm.status in stats:
                stats[comm.status] += 1
                
        results.append(CampaignStats(
            id=c.id,
            name=c.name,
            status=c.status,
            total=len(comms),
            sent=stats["sent"],
            delivered=stats["delivered"],
            failed=stats["failed"],
            opened=stats["opened"],
            clicked=stats["clicked"]
        ))
    return results

@router.get("/campaigns/{id}/stats")
async def campaign_stats(id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    comms = db.query(Communication).options(joinedload(Communication.customer)).filter(Communication.campaign_id == id).all()
    stats = {
        "queued": 0, "sent": 0, "delivered": 0,
        "failed": 0, "opened": 0, "clicked": 0
    }
    comm_list = []
    for comm in comms:
        if comm.status in stats:
            stats[comm.status] += 1
        comm_list.append({
            "id": comm.id,
            "customer_id": comm.customer_id,
            "customer_name": comm.customer.name if comm.customer else f"Customer #{comm.customer_id}",
            "status": comm.status,
            "timestamp": comm.timestamp
        })
        
    return {
        "id": campaign.id,
        "name": campaign.name,
        "status": campaign.status,
        "channel": campaign.channel,
        "message_text": campaign.message_text,
        "segment_query": campaign.segment_query,
        "total": len(comms),
        "stats": stats,
        "communications": comm_list
    }
