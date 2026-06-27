from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Reminder, Loan
from app.schemas import ReminderCreate, ReminderUpdate, ReminderOut
from app.core.security import get_current_user
from app.models import User

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])

@router.get("", response_model=List[ReminderOut])
def list_reminders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Reminder).join(Loan).filter(Loan.user_id == current_user.id).all()

@router.post("", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder(
    reminder_data: ReminderCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.id == reminder_data.loan_id, Loan.user_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found or unauthorized")
        
    db_reminder = Reminder(
        loan_id=reminder_data.loan_id,
        label=reminder_data.label,
        due_date=reminder_data.due_date,
        days_before=reminder_data.days_before,
        recurrence=reminder_data.recurrence,
        channel_in_app=reminder_data.channel_in_app,
        channel_push=reminder_data.channel_push,
        is_active=True
    )
    
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.put("/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: str, 
    reminder_data: ReminderUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).join(Loan).filter(Reminder.id == reminder_id, Loan.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    update_dict = reminder_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(reminder, key, value)
        
    db.commit()
    db.refresh(reminder)
    return reminder

@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).join(Loan).filter(Reminder.id == reminder_id, Loan.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    db.delete(reminder)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
