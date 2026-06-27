import os
import shutil
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Document, Loan
from app.schemas import DocumentOut
from app.core.security import get_current_user
from app.models import User

router = APIRouter(prefix="/api/documents", tags=["Documents"])

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[DocumentOut])
def list_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Document).join(Loan).filter(Loan.user_id == current_user.id).all()

@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    loan_id: str = Form(...),
    name: str = Form(...),
    category: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.user_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found or unauthorized")
        
    # Generate unique filename on disk
    file_extension = os.path.splitext(file.filename)[1]
    safe_filename = f"{loan_id}_{name.replace(' ', '_')}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # Save file contents
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file to disk: {str(e)}")
        
    # File size calculation
    file_size = os.path.getsize(file_path)
    
    # Expiry date parsing
    exp_date = None
    if expiry_date and expiry_date != "undefined" and expiry_date.strip():
        try:
            exp_date = date.fromisoformat(expiry_date)
        except ValueError:
            pass
            
    db_doc = Document(
        loan_id=loan_id,
        name=name,
        category=category,
        file_path=file_path,
        file_size=file_size,
        expiry_date=exp_date
    )
    
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).join(Loan).filter(Document.id == doc_id, Loan.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Remove file from disk if it exists
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass
            
    db.delete(doc)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
