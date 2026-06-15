import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.models import AgentExecutionLog
from db import SessionLocal

def generate_execution_group_id():
    return str(uuid.uuid4())

def log_agent_start(execution_group_id: str, agent_name: str, campaign_id: int = None) -> int:
    """Logs the start of an agent execution and returns the log ID."""
    db: Session = SessionLocal()
    try:
        log = AgentExecutionLog(
            execution_group_id=execution_group_id,
            agent_name=agent_name,
            campaign_id=campaign_id,
            status="executing",
            started_at=datetime.now(timezone.utc)
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log.id
    finally:
        db.close()

def log_agent_complete(log_id: int, status: str, fallback_used: bool = False, confidence_score: int = None, notes: str = None):
    """Updates an existing log with completion details."""
    db: Session = SessionLocal()
    try:
        log = db.query(AgentExecutionLog).filter(AgentExecutionLog.id == log_id).first()
        if log:
            log.status = status
            log.completed_at = datetime.now(timezone.utc)
            # Calculate duration
            if log.started_at:
                delta = log.completed_at - log.started_at
                log.duration_ms = int(delta.total_seconds() * 1000)
            
            log.fallback_used = fallback_used
            if confidence_score is not None:
                log.confidence_score = confidence_score
            if notes is not None:
                log.notes = notes
            db.commit()
    finally:
        db.close()
