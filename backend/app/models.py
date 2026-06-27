import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    loans = relationship("Loan", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")

class Loan(Base):
    __tablename__ = "loans"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    nickname = Column(String, nullable=False)
    lender = Column(String, nullable=False)
    type = Column(String, default="education")  # education, top-up
    principal = Column(Numeric(12, 2), nullable=False)
    disbursed_amount = Column(Numeric(12, 2), nullable=False)
    outstanding_balance = Column(Numeric(12, 2), nullable=False)
    interest_rate = Column(Numeric(5, 2), nullable=False)
    interest_type = Column(String, default="compound")  # simple, compound
    tenure_months = Column(Integer, nullable=False)
    disbursement_date = Column(Date, nullable=False)
    emi_start_date = Column(Date, nullable=False)
    
    # Moratorium Details
    moratorium_enabled = Column(Boolean, default=False)
    moratorium_start_date = Column(Date, nullable=True)
    moratorium_end_date = Column(Date, nullable=True)
    
    # Summary Fields
    next_emi_date = Column(Date, nullable=True)
    next_emi_amount = Column(Numeric(12, 2), nullable=True)
    
    status = Column(String, default="repaying")  # moratorium, repaying, completed, overdue
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def moratorium(self):
        return {
            "enabled": self.moratorium_enabled,
            "startDate": self.moratorium_start_date,
            "endDate": self.moratorium_end_date
        }

    # Relationships
    owner = relationship("User", back_populates="loans")
    payments = relationship("Payment", back_populates="loan", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="loan", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="loan", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=generate_uuid)
    loan_id = Column(String, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    payment_date = Column(Date, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    principal_component = Column(Numeric(12, 2), nullable=False)
    interest_component = Column(Numeric(12, 2), nullable=False)
    payment_mode = Column(String, default="bank_transfer")  # bank_transfer, upi, cheque, auto_debit
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    loan = relationship("Loan", back_populates="payments")

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, default=generate_uuid)
    loan_id = Column(String, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    label = Column(String, nullable=False)
    due_date = Column(Date, nullable=False)
    days_before = Column(Integer, default=3)
    recurrence = Column(String, default="monthly")  # one_time, monthly
    channel_in_app = Column(Boolean, default=True)
    channel_push = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    loan = relationship("Loan", back_populates="reminders")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, default="system")  # reminder, system, moratorium
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    recipient = relationship("User", back_populates="notifications")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    loan_id = Column(String, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, default="other")  # sanction_letter, disbursement, noc, itr, other
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    loan = relationship("Loan", back_populates="documents")
