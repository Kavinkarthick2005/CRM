from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
import psutil
import os
import time

from db import get_db
from models.models import Communication

router = APIRouter()

start_time = time.time()

@router.get("/health")
def system_health(db: Session = Depends(get_db)):
    # 1. DB connection check
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"
        
    # 2. Queue Status (Number of pending comms)
    pending_comms = 0
    if db_status == "healthy":
        pending_comms = db.query(Communication).filter(Communication.status == "queued").count()
        
    # 3. Memory & CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    mem_percent = mem.percent
    
    # 4. Uptime
    uptime_seconds = int(time.time() - start_time)
    
    # 5. Channel Service
    try:
        from main import CHANNEL_SERVICE_AVAILABLE
        channel_status = "connected" if CHANNEL_SERVICE_AVAILABLE else "mocked"
    except ImportError:
        channel_status = "unknown"

    try:
        from automation_worker import AUTOMATION_ENGINE_STATUS, LAST_RUN, RULES_EVALUATED
        auto_status = AUTOMATION_ENGINE_STATUS
        last_run = LAST_RUN.isoformat() if LAST_RUN else None
        rules_evaluated = RULES_EVALUATED
    except ImportError:
        auto_status = "unknown"
        last_run = None
        rules_evaluated = 0

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "uptime_seconds": uptime_seconds,
        "database": {
            "status": db_status
        },
        "queue": {
            "pending_jobs": pending_comms
        },
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": mem_percent
        },
        "channel_service": {
            "status": channel_status
        },
        "langgraph": {
            "status": "active"
        },
        "automation_engine": {
            "status": auto_status,
            "last_run": last_run,
            "rules_evaluated": rules_evaluated
        }
    }
