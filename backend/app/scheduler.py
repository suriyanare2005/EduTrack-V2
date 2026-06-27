import time
import threading
import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Reminder, Loan, Notification

scheduler_thread = None
running = False

def check_reminders():
    db: Session = SessionLocal()
    try:
        today = datetime.date.today()
        # Find active reminders
        active_reminders = db.query(Reminder).filter(Reminder.is_active == True).all()
        for reminder in active_reminders:
            loan = db.query(Loan).filter(Loan.id == reminder.loan_id).first()
            if not loan:
                continue
            
            # Check if reminder has passed due date (time to advance or deactivate)
            if today > reminder.due_date:
                if reminder.recurrence == "monthly":
                    # Advance by 1 month
                    curr_date = reminder.due_date
                    if curr_date.month == 12:
                        new_month = 1
                        new_year = curr_date.year + 1
                    else:
                        new_month = curr_date.month + 1
                        new_year = curr_date.year
                    
                    day = curr_date.day
                    while True:
                        try:
                            new_date = datetime.date(new_year, new_month, day)
                            break
                        except ValueError:
                            day -= 1
                    reminder.due_date = new_date
                    db.commit()
                else:
                    reminder.is_active = False
                    db.commit()
                continue
            
            # Calculate trigger date
            trigger_date = reminder.due_date - datetime.timedelta(days=reminder.days_before)
            
            # If today has reached the trigger window
            if today >= trigger_date:
                # Format date string for uniqueness check
                date_str = reminder.due_date.strftime("%b %d, %Y")
                title = f"Payment Reminder: {reminder.label}"
                
                # Check if notification already exists
                existing = db.query(Notification).filter(
                    Notification.user_id == loan.user_id,
                    Notification.title == title,
                    Notification.body.contains(date_str)
                ).first()
                
                if not existing:
                    # Determine EMI amount format
                    emi_val = 0
                    if loan.next_emi_amount is not None:
                        emi_val = float(loan.next_emi_amount)
                    elif loan.principal is not None:
                        # Fallback simple EMI approximation
                        emi_val = float(loan.principal) * 0.012
                    
                    # Create notification
                    notif = Notification(
                        user_id=loan.user_id,
                        type="reminder",
                        title=title,
                        body=f"Your payment of ₹{emi_val:,.2f} for '{loan.nickname}' is due on {date_str}.",
                        is_read=False
                    )
                    db.add(notif)
                    db.commit()
    except Exception as e:
        print(f"[Scheduler Error] {str(e)}")
        db.rollback()
    finally:
        db.close()

def scheduler_loop():
    global running
    while running:
        check_reminders()
        # Sleep for 1 hour (check periodically)
        # Check every 10 seconds if we need to exit to keep thread responsive
        for _ in range(360):
            if not running:
                break
            time.sleep(10)

def start_scheduler():
    global scheduler_thread, running
    if scheduler_thread is not None:
        return
    running = True
    scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
    scheduler_thread.start()
    print("[Scheduler] Started background reminder worker thread.")

def stop_scheduler():
    global scheduler_thread, running
    if scheduler_thread is None:
        return
    running = False
    scheduler_thread.join(timeout=5)
    scheduler_thread = None
    print("[Scheduler] Stopped background reminder worker thread.")
