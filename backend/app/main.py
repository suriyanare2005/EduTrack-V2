from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import auth, loans, payments, reminders, notifications, documents, ai
from app.scheduler import start_scheduler, stop_scheduler

# Automatically create tables on startup for simplicity in sandbox testing
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EduTrack API Server",
    description="Backend API services for education loan tracking and analysis.",
    version="1.0.0"
)

@app.on_event("startup")
def startup_event():
    start_scheduler()

@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()

# CORS middleware configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in sandbox
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(loans.router)
app.include_router(payments.router)
app.include_router(reminders.router)
app.include_router(notifications.router)
app.include_router(documents.router)
app.include_router(ai.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "edutrack-api"}
