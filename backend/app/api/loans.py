from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Loan
from app.schemas import LoanCreate, LoanUpdate, LoanOut
from app.core.security import get_current_user
from app.models import User

router = APIRouter(prefix="/api/loans", tags=["Loans"])

@router.get("", response_model=List[LoanOut])
def list_loans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Loan).filter(Loan.user_id == current_user.id).all()

@router.post("", response_model=LoanOut, status_code=status.HTTP_201_CREATED)
def create_loan(loan_data: LoanCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mor_enabled = False
    mor_start = None
    mor_end = None
    
    if loan_data.moratorium:
        mor_enabled = loan_data.moratorium.enabled
        mor_start = loan_data.moratorium.startDate
        mor_end = loan_data.moratorium.endDate
        
    db_loan = Loan(
        user_id=current_user.id,
        nickname=loan_data.nickname,
        lender=loan_data.lender,
        type=loan_data.type,
        principal=loan_data.principal,
        disbursed_amount=loan_data.disbursed_amount,
        outstanding_balance=loan_data.outstanding_balance,
        interest_rate=loan_data.interest_rate,
        interest_type=loan_data.interest_type,
        tenure_months=loan_data.tenure_months,
        disbursement_date=loan_data.disbursement_date,
        emi_start_date=loan_data.emi_start_date,
        moratorium_enabled=mor_enabled,
        moratorium_start_date=mor_start,
        moratorium_end_date=mor_end,
        next_emi_date=loan_data.next_emi_date,
        next_emi_amount=loan_data.next_emi_amount,
        status=loan_data.status,
        notes=loan_data.notes
    )
    
    db.add(db_loan)
    db.commit()
    db.refresh(db_loan)
    return db_loan

@router.get("/{loan_id}", response_model=LoanOut)
def get_loan(loan_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.user_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found")
    return loan

@router.put("/{loan_id}", response_model=LoanOut)
def update_loan(loan_id: str, loan_data: LoanUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.user_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found")
        
    update_dict = loan_data.model_dump(exclude_unset=True)
    
    if "moratorium" in update_dict:
        mor = update_dict.pop("moratorium")
        if mor:
            loan.moratorium_enabled = mor.get("enabled", False)
            loan.moratorium_start_date = mor.get("startDate")
            loan.moratorium_end_date = mor.get("endDate")
        else:
            loan.moratorium_enabled = False
            loan.moratorium_start_date = None
            loan.moratorium_end_date = None
            
    for key, value in update_dict.items():
        setattr(loan, key, value)
        
    db.commit()
    db.refresh(loan)
    return loan

@router.delete("/{loan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_loan(loan_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.user_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found")
        
    db.delete(loan)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
