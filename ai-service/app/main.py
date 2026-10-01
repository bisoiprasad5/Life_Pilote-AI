import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="LifePilot AI Engine Service"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "service": settings.APP_NAME,
        "status": "online",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "provider": settings.LLM_PROVIDER,
        "environment": settings.ENVIRONMENT
    }
