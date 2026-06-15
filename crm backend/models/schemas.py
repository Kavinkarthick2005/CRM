from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

class CustomerOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    total_spend: int
    total_orders: int
    last_order_at: Optional[datetime]
    channel_preference: str
    tags: Optional[str]

    class Config:
        from_attributes = True

class SegmentFilter(BaseModel):
    gte: Optional[int] = None
    lte: Optional[int] = None
    eq: Optional[Any] = None
    contains: Optional[str] = None # For tags

class SegmentQuery(BaseModel):
    total_spend: Optional[SegmentFilter] = None
    total_orders: Optional[SegmentFilter] = None
    last_order_days_ago: Optional[SegmentFilter] = None
    channel_preference: Optional[SegmentFilter] = None
    tags: Optional[SegmentFilter] = None

class PreviewResponse(BaseModel):
    count: int
    sample: List[CustomerOut]

class CampaignCreate(BaseModel):
    name: str
    segment_query: SegmentQuery
    message_text: str
    channel: str

class CampaignOut(BaseModel):
    id: int
    name: str
    segment_query: dict
    message_text: str
    channel: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class CampaignStats(BaseModel):
    id: int
    name: str
    status: str
    total: int
    sent: int
    delivered: int
    failed: int
    opened: int
    clicked: int
    created_at: datetime | None = None

class ReceiptWebhook(BaseModel):
    comm_id: int
    event: str
    timestamp: datetime
