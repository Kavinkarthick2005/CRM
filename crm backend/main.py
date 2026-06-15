from fastapi import FastAPI
from contextlib import asynccontextmanager
import httpx
import os

CHANNEL_SERVICE_AVAILABLE = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global CHANNEL_SERVICE_AVAILABLE
    channel_url = os.getenv("CHANNEL_SERVICE_URL", "http://localhost:8001")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{channel_url}/health", timeout=3.0)
            if resp.status_code == 200:
                print("[✅ Channel] Service connected")
                CHANNEL_SERVICE_AVAILABLE = True
            else:
                print("[⚠️ Channel] Service offline, fake mode active")
    except Exception:
        print("[⚠️ Channel] Service offline, fake mode active")
        
    yield
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()
from routes import customers_router, segment_router, campaigns_router, receipt_router, chat_router

app = FastAPI(title="AI-Native CRM Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers_router, prefix="/api", tags=["customers"])
app.include_router(segment_router, prefix="/api", tags=["segment"])
app.include_router(campaigns_router, prefix="/api", tags=["campaigns"])
app.include_router(receipt_router, prefix="/api", tags=["receipts"])
app.include_router(chat_router, prefix="/api", tags=["chat"])

@app.get("/")
def read_root():
    return {"message": "Welcome to AI-Native CRM API"}
