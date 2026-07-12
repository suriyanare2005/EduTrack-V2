from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, UserOut, Token
from app.core.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash and save
    new_user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate welcome notification
    from app.models import Notification
    welcome_notif = Notification(
        user_id=new_user.id,
        title="Welcome to EduTrack! 🚀",
        body="EduTrack is set up and ready to help you track your education loans. Start by adding your first loan profile!",
        type="system",
        is_read=False
    )
    db.add(welcome_notif)
    db.commit()
    
    return new_user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/reset-password")
def reset_password(email_data: dict, db: Session = Depends(get_db)):
    email = email_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
        
    from datetime import datetime, timedelta
    import jwt
    # Generate secure signed reset token (valid for 15 minutes)
    reset_token = jwt.encode(
        {
            "sub": email,
            "type": "reset_password",
            "exp": datetime.utcnow() + timedelta(minutes=15)
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    
    reset_link = f"http://localhost:5173/auth/reset-password?email={email}&token={reset_token}"
    
    # Send email via SMTP if settings are configured
    smtp_enabled = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    if smtp_enabled:
        import smtplib
        from email.mime.text import MIMEText
        
        msg = MIMEText(
            f"Dear {user.full_name or 'User'},\n\n"
            f"You requested to reset your EduTrack password. Please click on the link below or copy and paste it into your browser to complete your reset:\n\n"
            f"{reset_link}\n\n"
            f"This link will expire in 15 minutes.\n\n"
            f"If you did not request this, please ignore this email.\n"
        )
        msg["Subject"] = "EduTrack Password Reset Request"
        msg["From"] = settings.SMTP_FROM
        msg["To"] = email
        
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, [email], msg.as_string())
        except Exception as e:
            print(f"SMTP Delivery Failed: {str(e)}")
            print(f"Reset Link Fallback: {reset_link}")
            return {
                "message": "Password reset link generated, but SMTP delivery failed. Check server console for URL.",
                "reset_link": reset_link,
                "smtp_error": str(e)
            }
    else:
        print(f"SMTP not configured. Reset Link: {reset_link}")
        return {
            "message": "Password reset link generated successfully (SMTP not configured).",
            "reset_link": reset_link
        }
        
    return {"message": "Password reset email sent successfully"}

@router.post("/reset-password/confirm")
def reset_password_confirm(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    new_password = data.get("new_password")
    token = data.get("token")
    
    if not email or not new_password or not token:
        raise HTTPException(status_code=400, detail="Email, token, and new password are required")
        
    import jwt
    from jwt.exceptions import PyJWTError as JWTError
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "reset_password":
            raise HTTPException(status_code=400, detail="Invalid token type")
        email_from_token = payload.get("sub")
        if email_from_token != email:
            raise HTTPException(status_code=400, detail="Token email mismatch")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")
        
    user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Password has been successfully updated"}

@router.post("/google", response_model=Token)
def google_auth(token_data: dict, db: Session = Depends(get_db)):
    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Google ID token is required")
        
    import httpx
    # Verify the ID token against Google's tokeninfo endpoint
    try:
        response = httpx.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}", timeout=10.0)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google authentication token")
        token_info = response.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to communicate with Google authentication servers: {str(e)}"
        )
        
    aud = token_info.get("aud")
    if settings.GOOGLE_CLIENT_ID and aud != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google authentication client ID audience mismatch")

    email = token_info.get("email")
    full_name = token_info.get("name", "Google User")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email address not verified or provided by Google profile")
        
    # Check if user already exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create a new user account linked to Google
        user = User(
            email=email,
            hashed_password=hash_password("GoogleAuthUserPasswordPlaceholder123!"),
            full_name=full_name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create welcome notification
        from app.models import Notification
        welcome_notif = Notification(
            user_id=user.id,
            title="Welcome to EduTrack! 🚀",
            body="Your account was successfully registered via Google. Start tracking your education loans now!",
            type="system",
            is_read=False
        )
        db.add(welcome_notif)
        db.commit()
        
    # Generate access token
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.put("/me", response_model=UserOut)
def update_me(
    user_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if "fullName" in user_data:
        current_user.full_name = user_data["fullName"]
    elif "full_name" in user_data:
        current_user.full_name = user_data["full_name"]
        
    if "email" in user_data:
        email = user_data["email"]
        if email != current_user.email:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already taken")
            current_user.email = email
            
    db.commit()
    db.refresh(current_user)
    return current_user
