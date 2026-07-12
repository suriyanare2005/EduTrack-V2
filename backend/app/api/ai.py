from typing import List, Dict, Any, Optional
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Document, Loan
from app.core.security import get_current_user
from app.models import User
from app.config import settings
from app.services.gemini import GeminiService

router = APIRouter(prefix="/api/ai", tags=["AI Integration"])

# Schema definitions
class SummarizeRequest(BaseModel):
    document_id: str

class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# Reusable service instance
gemini_service = GeminiService()

@router.post("/summarize-document")
def summarize_document(
    request_data: SummarizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key is not configured. Please define GEMINI_API_KEY in the backend environment variables to enable live document scans."
        )

    doc = db.query(Document).join(Loan).filter(
        Document.id == request_data.document_id, 
        Loan.user_id == current_user.id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or unauthorized")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found on disk")

    ext = os.path.splitext(doc.file_path)[1].lower()
    
    # Resolve MIME type for Gemini
    if ext == '.pdf':
        mime_type = "application/pdf"
    elif ext in ['.png', '.jpg', '.jpeg', '.webp']:
        mime_type = f"image/{ext[1:]}"
        if ext == '.jpg':
            mime_type = "image/jpeg"
    else:
        raise HTTPException(status_code=400, detail="Preview/Summary is only supported for PDFs and Images")

    prompt = (
        "You are a professional banking document parser and OCR scanner. "
        "Analyze the provided document data and extract details as a structured JSON object with keys:\n"
        "- lender (lender organization name, string)\n"
        "- loanAmount (principal amount, integer)\n"
        "- interestRate (interest rate percentage, float)\n"
        "- tenure (repayment tenure in months, integer)\n"
        "- moratoriumPeriod (moratorium schedule text, string)\n"
        "- extractions (list of key clauses, dates, or disbursement info, list of strings)\n\n"
        "Return ONLY a valid JSON payload matching these keys. Do not include markdown code block syntax."
    )

    try:
        result = gemini_service.summarize_document(
            file_path=doc.file_path,
            mime_type=mime_type,
            prompt=prompt
        )
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini analysis failed: {str(e)}"
        )

@router.post("/chat")
def chat_assistant(
    request_data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key is not configured. Please define GEMINI_API_KEY in the backend environment variables to enable the AI Coach counselor."
        )

    # Fetch active user loans context to guide the counselor
    loans = db.query(Loan).filter(Loan.user_id == current_user.id).all()
    loans_context = ""
    for idx, loan in enumerate(loans):
        loans_context += f"Loan {idx+1}: {loan.nickname} with lender {loan.lender}, principal: ₹{loan.principal}, rate: {loan.interest_rate}%, balance: ₹{loan.outstanding_balance}, tenure: {loan.tenure_months} months.\n"

    system_instruction = (
        f"You are the EduTrack AI Financial Coach counseling {current_user.full_name}. "
        f"Focus on optimizing student loan repayment schemes. "
        f"Here is their active portfolio:\n{loans_context}\n"
        f"Answer their query professionally, providing calculations, comparisons, and suggestions for prepayment. "
        f"Always prioritize real math over vague advice. If they ask about moratoriums or repayment timelines, reference their specific loans."
    )

    # Convert request history schema to flat dictionaries
    messages = []
    for msg in request_data.messages:
        messages.append({
            "role": msg.role,
            "content": msg.content
        })

    try:
        result = gemini_service.chat(
            messages=messages,
            system_instruction=system_instruction
        )
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Counselor failed: {str(e)}"
        )
