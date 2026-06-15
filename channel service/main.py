import asyncio
import httpx
import random
from datetime import datetime, timezone
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Channel Service")

class SendRequest(BaseModel):
    comm_id: int
    customer_id: int
    message: str
    channel: str
    crm_receipt_url: str

async def post_receipt(url: str, comm_id: int, event: str):
    payload = {
        "comm_id": comm_id,
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload, timeout=10.0)
            resp.raise_for_status()
            logger.info(f"Successfully posted {event} for comm_id {comm_id}")
        except Exception as e:
            logger.error(f"Failed to post {event} receipt for comm_id {comm_id}: {e}")

async def simulate_delivery(req: SendRequest):
    # Wait 2-8 seconds
    await asyncio.sleep(random.uniform(2, 8))
    
    # 80% delivered, 10% failed, 10% pending
    rand_val = random.random()
    if rand_val < 0.8:
        outcome = "delivered"
    elif rand_val < 0.9:
        outcome = "failed"
    else:
        # Pending/lost
        logger.info(f"comm_id {req.comm_id} lost in transit (pending)")
        return
        
    await post_receipt(req.crm_receipt_url, req.comm_id, outcome)
    
    if outcome == "delivered":
        # Engagement simulation
        await asyncio.sleep(random.uniform(5, 15))
        
        if random.random() < 0.4:
            # Opened
            await post_receipt(req.crm_receipt_url, req.comm_id, "opened")
            
            # Click delay (1-5 seconds)
            await asyncio.sleep(random.uniform(1, 5))
            if random.random() < 0.25:
                # Clicked
                await post_receipt(req.crm_receipt_url, req.comm_id, "clicked")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "channel-service"}

@app.post("/send")
async def send_message(request: SendRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(simulate_delivery, request)
    return {"status": "accepted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
