import os
import json
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from groq import Groq
from db import get_db
from models.models import Customer
from models.schemas import SegmentQuery
from routes.segment import apply_segment_filters
from pydantic import BaseModel
from typing import List, Optional
from ai_service import process_chat

router = APIRouter()

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key) if groq_api_key else None

SYSTEM_PROMPT = """
You are a campaign assistant for a D2C fashion brand's marketing team.
Your job is to help the marketer create and send campaigns in a friendly, efficient way.

You guide them through 3 steps:
1. Understand who they want to reach → parse into a segment_query JSON
2. Draft a short personalized message (under 160 chars, include {name} placeholder)
3. Confirm and send

When you have enough info to build a segment, respond with a JSON block in this exact format:
<segment>
{"total_spend": {"gte": 2000}, "last_order_days_ago": {"gte": 60}}
</segment>

When you have a message draft ready, include it like this:
<message>
Hey {name}, we miss you! Here's 15% off your next order. Use code COMEBACK15.
</message>

When the marketer confirms, respond with:
<action>send</action>

Supported segment_query fields:
- total_spend: {gte, lte}
- total_orders: {gte, lte}
- last_order_days_ago: {gte, lte}
- channel_preference: {eq: 'whatsapp'|'sms'|'email'}
- tags: {contains: 'vip'|'new'|'churned'|'frequent'}

Keep responses short and conversational. Always show a segment preview count before sending.
"""

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    segment_query: Optional[dict] = None
    segment_count: Optional[int] = None
    message_draft: Optional[str] = None
    action: Optional[str] = None
    confidence_score: Optional[int] = None
    failed_agents: Optional[List[str]] = None
    status: Optional[str] = None

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    # Call the new multi-agent orchestrator
    try:
        orchestrator_result = await process_chat(request.message, request.conversation_history, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    segment_query = orchestrator_result.get("segment_query", {})
    message_draft = orchestrator_result.get("message_draft", "")
    campaign_name = orchestrator_result.get("campaign_name", "AI Campaign")
    channel = orchestrator_result.get("channel", "sms")
    is_fallback = orchestrator_result.get("is_fallback_used", False)
    
    # Calculate REAL count from database based on the generated segment
    segment_count = 0
    if segment_query:
        try:
            sq = SegmentQuery(**segment_query)
            query = db.query(Customer)
            query = apply_segment_filters(query, sq)
            segment_count = query.count()
        except Exception as e:
            print("Failed to apply segment filters:", e)
            
    # Build the reply string based on real count
    if is_fallback:
        reply = f"I found {segment_count} matching customers. (Note: I used simplified targeting for this campaign.) Here's a draft message ready to review."
    else:
        reply = f"I've identified {segment_count} customers who match your campaign. Here's a draft message ready to review."

    return ChatResponse(
        reply=reply,
        segment_query=segment_query,
        segment_count=segment_count,
        message_draft=message_draft,
        action="draft_ready",
        confidence_score=orchestrator_result.get("confidence_score"),
        failed_agents=orchestrator_result.get("failed_agents", []),
        status=orchestrator_result.get("status", "success")
    )

class NameRequest(BaseModel):
    prompt: str

class NameResponse(BaseModel):
    name: str

@router.post("/chat/name", response_model=NameResponse)
async def generate_name(request: NameRequest):
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    client = Groq(api_key=groq_api_key)
        
    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You generate short, punchy marketing campaign names (4-6 words) based on a description. Output ONLY the name, nothing else. Do not use quotes."},
                {"role": "user", "content": f"Generate a short campaign name (4-6 words) based on this goal: {request.prompt}"}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=20
        )
        name = completion.choices[0].message.content.strip().strip('"')
        return NameResponse(name=name)
    except Exception as e:
        # Fallback if API fails
        return NameResponse(name="AI Marketing Campaign")
