from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from models.models import AgentExecutionLog
import uuid
import datetime

router = APIRouter()

# Mock data sequences
def get_sequence_a():
    base_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=1)
    return [
        {"agent_name": "Intent Agent", "status": "completed", "duration_ms": 350, "fallback_used": False, "confidence_score": 95, "started_at": base_time.isoformat()},
        {"agent_name": "RAG Agent", "status": "completed", "duration_ms": 200, "fallback_used": False, "confidence_score": 100, "started_at": (base_time + datetime.timedelta(milliseconds=350)).isoformat()},
        {"agent_name": "Segment Agent", "status": "completed", "duration_ms": 420, "fallback_used": False, "confidence_score": 90, "started_at": (base_time + datetime.timedelta(milliseconds=550)).isoformat()},
        {"agent_name": "Message Agent", "status": "completed", "duration_ms": 500, "fallback_used": False, "confidence_score": 85, "started_at": (base_time + datetime.timedelta(milliseconds=970)).isoformat()},
        {"agent_name": "Validator Agent", "status": "completed", "duration_ms": 100, "fallback_used": False, "confidence_score": 98, "started_at": (base_time + datetime.timedelta(milliseconds=1470)).isoformat()},
    ]

def get_sequence_b():
    base_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=1)
    return [
        {"agent_name": "Intent Agent", "status": "completed", "duration_ms": 320, "fallback_used": False, "confidence_score": 92, "started_at": base_time.isoformat()},
        {"agent_name": "RAG Agent", "status": "completed", "duration_ms": 180, "fallback_used": False, "confidence_score": 100, "started_at": (base_time + datetime.timedelta(milliseconds=320)).isoformat()},
        {"agent_name": "Segment Agent", "status": "completed", "duration_ms": 390, "fallback_used": False, "confidence_score": 88, "started_at": (base_time + datetime.timedelta(milliseconds=500)).isoformat()},
        {"agent_name": "Message Agent", "status": "completed", "duration_ms": 850, "fallback_used": True, "confidence_score": 60, "notes": "Primary failed, fallback used", "started_at": (base_time + datetime.timedelta(milliseconds=890)).isoformat()},
        {"agent_name": "Validator Agent", "status": "completed", "duration_ms": 120, "fallback_used": False, "confidence_score": 75, "started_at": (base_time + datetime.timedelta(milliseconds=1740)).isoformat()},
    ]

def get_sequence_c():
    base_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=1)
    return [
        {"agent_name": "Intent Agent", "status": "completed", "duration_ms": 410, "fallback_used": False, "confidence_score": 85, "started_at": base_time.isoformat()},
        {"agent_name": "RAG Agent", "status": "completed", "duration_ms": 220, "fallback_used": False, "confidence_score": 100, "started_at": (base_time + datetime.timedelta(milliseconds=410)).isoformat()},
        {"agent_name": "Segment Agent", "status": "failed", "duration_ms": 1200, "fallback_used": True, "confidence_score": 0, "notes": "API timeout", "started_at": (base_time + datetime.timedelta(milliseconds=630)).isoformat()},
        {"agent_name": "Message Agent", "status": "failed", "duration_ms": 1100, "fallback_used": True, "confidence_score": 0, "notes": "Context missing", "started_at": (base_time + datetime.timedelta(milliseconds=1830)).isoformat()},
        {"agent_name": "Recovery Agent", "status": "completed", "duration_ms": 2500, "fallback_used": False, "confidence_score": 70, "notes": "Fallback rules applied", "started_at": (base_time + datetime.timedelta(milliseconds=2930)).isoformat()},
        {"agent_name": "Validator Agent", "status": "completed", "duration_ms": 150, "fallback_used": False, "confidence_score": 65, "started_at": (base_time + datetime.timedelta(milliseconds=5430)).isoformat()},
    ]

demo_sequences = [get_sequence_a, get_sequence_b, get_sequence_c]
current_sequence_index = 0

@router.get("/agent-logs/demo")
def get_demo_logs():
    global current_sequence_index
    seq = demo_sequences[current_sequence_index]()
    current_sequence_index = (current_sequence_index + 1) % len(demo_sequences)
    return {"execution_group_id": str(uuid.uuid4()), "logs": seq}

@router.get("/agent-logs/campaign/{campaign_id}")
def get_campaign_logs(campaign_id: int, db: Session = Depends(get_db)):
    logs = db.query(AgentExecutionLog).filter(AgentExecutionLog.campaign_id == campaign_id).order_by(AgentExecutionLog.started_at.asc()).all()
    
    execution_groups = {}
    for log in logs:
        if log.execution_group_id not in execution_groups:
            execution_groups[log.execution_group_id] = []
        execution_groups[log.execution_group_id].append({
            "agent_name": log.agent_name,
            "status": log.status,
            "duration_ms": log.duration_ms,
            "fallback_used": log.fallback_used,
            "confidence_score": log.confidence_score,
            "notes": log.notes,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "completed_at": log.completed_at.isoformat() if log.completed_at else None
        })
        
    return {"execution_groups": execution_groups}

@router.get("/agent-logs/metrics")
def get_agent_metrics(db: Session = Depends(get_db)):
    logs = db.query(AgentExecutionLog).all()
    if not logs:
        return {
            "avg_execution_time": 450,
            "fallback_rate": "15%",
            "recovery_activations": 2,
            "avg_confidence": "88%",
            "success_rate": "95%"
        }
    
    total_duration = 0
    duration_count = 0
    fallbacks = 0
    recoveries = 0
    total_confidence = 0
    confidence_count = 0
    
    execution_groups = set()
    successful_groups = set()
    
    for log in logs:
        if log.duration_ms:
            total_duration += log.duration_ms
            duration_count += 1
        if log.fallback_used:
            fallbacks += 1
        if log.agent_name == "Recovery Agent" and log.status == "completed":
            recoveries += 1
        if log.confidence_score is not None:
            total_confidence += log.confidence_score
            confidence_count += 1
        
        execution_groups.add(log.execution_group_id)
        if log.agent_name == "Validator Agent" and log.status == "completed":
            successful_groups.add(log.execution_group_id)
            
    avg_duration = int(total_duration / duration_count) if duration_count else 450
    fallback_rate = int((fallbacks / len(logs)) * 100) if logs else 15
    avg_confidence = int(total_confidence / confidence_count) if confidence_count else 88
    success_rate = int((len(successful_groups) / len(execution_groups)) * 100) if execution_groups else 95
    
    return {
        "avg_execution_time": avg_duration,
        "fallback_rate": f"{fallback_rate}%",
        "recovery_activations": recoveries,
        "avg_confidence": f"{avg_confidence}%",
        "success_rate": f"{success_rate}%"
    }
