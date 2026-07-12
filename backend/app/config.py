import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

class Settings:
    ENV: str = os.getenv("ENV", "development")
    
    # Auto-adjust postgres schemes for SQLAlchemy compat
    db_url = os.getenv("DATABASE_URL", "sqlite:///./edutrack.db")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    DATABASE_URL: str = db_url
    JWT_SECRET: str = os.getenv("JWT_SECRET", "edutrack_super_secure_secret_key_99120")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = int(os.getenv("JWT_EXPIRY_MINUTES", "1440"))  # Default 24 Hours
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Google OAuth settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # SMTP / Mail config settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@edutrack.com")

settings = Settings()
