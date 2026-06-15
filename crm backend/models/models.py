from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db import Base
from datetime import datetime, timezone

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    
    total_spend = Column(Integer, default=0)
    total_orders = Column(Integer, default=0)
    last_order_at = Column(DateTime(timezone=True), nullable=True)
    channel_preference = Column(String, default="email")
    tags = Column(String, nullable=True)

    communications = relationship("Communication", back_populates="customer", cascade="all, delete-orphan")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    segment_query = Column(JSON, nullable=False)
    message_text = Column(Text, nullable=False)
    channel = Column(String, nullable=False)
    status = Column(String, default="draft")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    communications = relationship("Communication", back_populates="campaign", cascade="all, delete-orphan")

class Communication(Base):
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"))
    status = Column(String, default="queued")
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    campaign = relationship("Campaign", back_populates="communications")
    customer = relationship("Customer", back_populates="communications")
