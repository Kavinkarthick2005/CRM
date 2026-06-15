from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from database import Base

class CampaignStatus(str, enum.Enum):
    pending = "pending"
    sending = "sending"
    completed = "completed"

class CommunicationStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    delivered = "delivered"
    opened = "opened"
    clicked = "clicked"
    failed = "failed"

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    
    total_spend = Column(Integer, default=0)
    total_orders = Column(Integer, default=0)
    last_order_days_ago = Column(Integer, default=0)
    channel_preference = Column(String, default="email")
    tags = Column(JSON, default=[])

    communications = relationship("Communication", back_populates="customer")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    segment_description = Column(JSON, nullable=True) # Storing the parsed query
    message_draft = Column(Text, nullable=True)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    communications = relationship("Communication", back_populates="campaign")

class Communication(Base):
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"))
    status = Column(Enum(CommunicationStatus), default=CommunicationStatus.pending)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    campaign = relationship("Campaign", back_populates="communications")
    customer = relationship("Customer", back_populates="communications")
