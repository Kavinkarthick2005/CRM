from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Boolean
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
    company_name = Column(String, nullable=True, index=True)
    
    total_spend = Column(Integer, default=0)
    total_orders = Column(Integer, default=0)
    last_order_at = Column(DateTime(timezone=True), nullable=True)
    channel_preference = Column(String, default="email")
    tags = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    communications = relationship("Communication", back_populates="customer", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    amount = Column(Integer, nullable=False)
    items = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    customer = relationship("Customer", back_populates="orders")

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

class AgentExecutionLog(Base):
    __tablename__ = "agent_execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    execution_group_id = Column(String, index=True)
    agent_name = Column(String)
    status = Column(String)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    fallback_used = Column(Boolean, default=False)
    confidence_score = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class CustomerGroup(Base):
    __tablename__ = "customer_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    group_type = Column(String, nullable=False) # 'company', 'behavioral', 'manual', 'hybrid'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    members = relationship("CustomerGroupMember", back_populates="group", cascade="all, delete-orphan")
    triggers = relationship("TriggerRule", back_populates="group", cascade="all, delete-orphan")

class CustomerGroupMember(Base):
    __tablename__ = "customer_group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("customer_groups.id"), index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    group = relationship("CustomerGroup", back_populates="members")
    customer = relationship("Customer")

class TriggerRule(Base):
    __tablename__ = "trigger_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    group_id = Column(Integer, ForeignKey("customer_groups.id"), nullable=True) # Renamed segment_id to group_id for consistency
    trigger_type = Column(String, nullable=False) # 'inactivity', 'churn_risk', 'new_customer', 'vip_milestone', etc.
    conditions = Column(JSON, nullable=False) # {"days_inactive": {">": 45}}
    action_type = Column(String, nullable=False) # 'email', 'sms', 'generate_campaign', 'create_task'
    action_payload = Column(JSON, nullable=True) # {"template": "winback_1"}
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    times_fired = Column(Integer, default=0)

    group = relationship("CustomerGroup", back_populates="triggers")

