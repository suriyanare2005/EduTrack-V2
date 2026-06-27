from pydantic import BaseModel, EmailStr, Field, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

# Base model to convert snake_case attributes to camelCase properties in JSON payloads
class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

# User schemas (Preserve snake_case for auth endpoints compatibility)
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    user_id: Optional[str] = None

# Moratorium schemas
class MoratoriumDetails(CamelModel):
    enabled: bool
    startDate: Optional[date] = None
    endDate: Optional[date] = None

# Loan schemas
class LoanCreate(CamelModel):
    nickname: str
    lender: str
    type: str = "education"  # education, top-up
    principal: Decimal
    disbursed_amount: Decimal
    outstanding_balance: Decimal
    interest_rate: Decimal
    interest_type: str = "compound"  # simple, compound
    tenure_months: int
    disbursement_date: date
    emi_start_date: date
    moratorium: Optional[MoratoriumDetails] = None
    next_emi_date: Optional[date] = None
    next_emi_amount: Optional[Decimal] = None
    status: str = "repaying"
    notes: Optional[str] = None

class LoanUpdate(CamelModel):
    nickname: Optional[str] = None
    lender: Optional[str] = None
    type: Optional[str] = None
    principal: Optional[Decimal] = None
    disbursed_amount: Optional[Decimal] = None
    outstanding_balance: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    interest_type: Optional[str] = None
    tenure_months: Optional[int] = None
    disbursement_date: Optional[date] = None
    emi_start_date: Optional[date] = None
    moratorium: Optional[MoratoriumDetails] = None
    next_emi_date: Optional[date] = None
    next_emi_amount: Optional[Decimal] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class LoanOut(CamelModel):
    id: str
    nickname: str
    lender: str
    type: str
    principal: Decimal
    disbursed_amount: Decimal
    outstanding_balance: Decimal
    interest_rate: Decimal
    interest_type: str
    tenure_months: int
    disbursement_date: date
    emi_start_date: date
    moratorium: Optional[MoratoriumDetails] = None
    next_emi_date: Optional[date] = None
    next_emi_amount: Optional[Decimal] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

# Payment schemas
class PaymentCreate(CamelModel):
    loan_id: str
    payment_date: date
    amount: Decimal
    principal_component: Decimal
    interest_component: Decimal
    payment_mode: str = "bank_transfer"
    notes: Optional[str] = None

class PaymentOut(CamelModel):
    id: str
    loan_id: str
    payment_date: date
    amount: Decimal
    principal_component: Decimal
    interest_component: Decimal
    payment_mode: str
    notes: Optional[str]
    created_at: datetime

# Reminder schemas
class ReminderCreate(CamelModel):
    loan_id: str
    label: str
    due_date: date
    days_before: int = 3
    recurrence: str = "monthly"
    channel_in_app: bool = True
    channel_push: bool = False

class ReminderUpdate(CamelModel):
    label: Optional[str] = None
    due_date: Optional[date] = None
    days_before: Optional[int] = None
    recurrence: Optional[str] = None
    channel_in_app: Optional[bool] = None
    channel_push: Optional[bool] = None
    is_active: Optional[bool] = None

class ReminderOut(CamelModel):
    id: str
    loan_id: str
    label: str
    due_date: date
    days_before: int
    recurrence: str
    channel_in_app: bool
    channel_push: bool
    is_active: bool
    created_at: datetime

# Notification schemas
class NotificationOut(CamelModel):
    id: str
    user_id: str
    type: str
    title: str
    body: str
    is_read: bool
    created_at: datetime

# Document schemas
class DocumentOut(CamelModel):
    id: str
    loan_id: str
    name: str
    category: str
    file_path: str
    file_size: int
    expiry_date: Optional[date]
    created_at: datetime
