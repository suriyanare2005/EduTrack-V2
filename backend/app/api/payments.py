from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Payment, Loan
from app.schemas import PaymentCreate, PaymentOut
from app.core.security import get_current_user
from app.models import User

router = APIRouter(prefix="/api/payments", tags=["Payments"])

@router.get("", response_model=List[PaymentOut])
def list_payments(
    loan_id: Optional[str] = None, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Query only loans owned by the current user
    query = db.query(Payment).join(Loan).filter(Loan.user_id == current_user.id)
    if loan_id:
        query = query.filter(Payment.loan_id == loan_id)
    return query.order_by(Payment.payment_date.desc()).all()

@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def log_payment(
    payment_data: PaymentCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.id == payment_data.loan_id, Loan.user_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found or unauthorized")
        
    db_payment = Payment(
        loan_id=payment_data.loan_id,
        payment_date=payment_data.payment_date,
        amount=payment_data.amount,
        principal_component=payment_data.principal_component,
        interest_component=payment_data.interest_component,
        payment_mode=payment_data.payment_mode,
        notes=payment_data.notes
    )
    
    # Recalculate outstanding balance by subtracting principal component
    new_balance = float(loan.outstanding_balance) - float(payment_data.principal_component)
    loan.outstanding_balance = max(0, new_balance)
    
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment
