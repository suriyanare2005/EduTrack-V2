import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./edutrack.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "edutrack_super_secure_secret_key_99120")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = int(os.getenv("JWT_EXPIRY_MINUTES", "1440"))  # Default 24 Hours
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

settings = Settings()
