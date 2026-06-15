from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models.models import Customer
from models.schemas import SegmentQuery, PreviewResponse
from datetime import datetime, timezone, timedelta

router = APIRouter()

def apply_segment_filters(query, segment: SegmentQuery):
    if segment.total_spend:
        if segment.total_spend.gte is not None:
            query = query.filter(Customer.total_spend >= segment.total_spend.gte)
        if segment.total_spend.lte is not None:
            query = query.filter(Customer.total_spend <= segment.total_spend.lte)
        if segment.total_spend.eq is not None:
            query = query.filter(Customer.total_spend == segment.total_spend.eq)
            
    if segment.total_orders:
        if segment.total_orders.gte is not None:
            query = query.filter(Customer.total_orders >= segment.total_orders.gte)
        if segment.total_orders.lte is not None:
            query = query.filter(Customer.total_orders <= segment.total_orders.lte)
        if segment.total_orders.eq is not None:
            query = query.filter(Customer.total_orders == segment.total_orders.eq)
            
    if segment.last_order_days_ago:
        now = datetime.now(timezone.utc)
        if segment.last_order_days_ago.gte is not None:
            # days_ago >= X means last_order_at <= (now - X days)
            cutoff = now - timedelta(days=segment.last_order_days_ago.gte)
            query = query.filter(Customer.last_order_at <= cutoff)
        if segment.last_order_days_ago.lte is not None:
            # days_ago <= X means last_order_at >= (now - X days)
            cutoff = now - timedelta(days=segment.last_order_days_ago.lte)
            query = query.filter(Customer.last_order_at >= cutoff)
        if segment.last_order_days_ago.eq is not None:
            start_of_day = now - timedelta(days=segment.last_order_days_ago.eq + 1)
            end_of_day = now - timedelta(days=segment.last_order_days_ago.eq)
            query = query.filter(Customer.last_order_at >= start_of_day, Customer.last_order_at <= end_of_day)
            
    if segment.channel_preference and segment.channel_preference.eq is not None:
        query = query.filter(Customer.channel_preference == segment.channel_preference.eq)
        
    if segment.tags and segment.tags.contains is not None:
        query = query.filter(Customer.tags.like(f"%{segment.tags.contains}%"))
        
    return query

@router.post("/segment/preview", response_model=PreviewResponse)
async def preview_segment(segment: SegmentQuery, db: Session = Depends(get_db)):
    query = db.query(Customer)
    query = apply_segment_filters(query, segment)
    
    count = query.count()
    sample = query.limit(5).all()
    
    return PreviewResponse(count=count, sample=sample)
