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

from fastapi.responses import FileResponse
from fastapi import Request, Query
import jwt
from jwt.exceptions import PyJWTError as JWTError

@router.get("/{doc_id}/file")
def get_document_file(
    doc_id: str,
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # 1. Read token from query parameter or header
    auth_token = token
    if not auth_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ")[1]
            
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication token is required")
        
    # 2. Decode and verify JWT
    try:
        from app.config import settings
        payload = jwt.decode(auth_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token has expired or is invalid")

    doc = db.query(Document).join(Loan).filter(Document.id == doc_id, Loan.user_id == user_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    media_type = "application/octet-stream"
    ext = os.path.splitext(doc.file_path)[1].lower()
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext in [".png", ".jpg", ".jpeg"]:
        media_type = f"image/{ext[1:]}"
        if ext == ".jpg":
            media_type = "image/jpeg"
        
    return FileResponse(doc.file_path, media_type=media_type, filename=doc.name)

@router.put("/{doc_id}", response_model=DocumentOut)
def update_document(
    doc_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).join(Loan).filter(Document.id == doc_id, Loan.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if "name" in data:
        doc.name = data["name"]
    if "expiry_date" in data:
        exp_date_str = data["expiry_date"]
        if exp_date_str:
            try:
                doc.expiry_date = date.fromisoformat(exp_date_str)
            except ValueError:
                pass
        else:
            doc.expiry_date = None
            
    db.commit()
    db.refresh(doc)
    return doc
