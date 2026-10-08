import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.task_parser import router as task_parser_router
from app.routers.planner import router as planner_router
from app.providers.factory import provider_manager

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="LifePilot AI Engine Microservice - Natural Language Task Parser & Planning System"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(task_parser_router)
app.include_router(planner_router)


@app.get("/")
def read_root():
    return {
        "service": settings.APP_NAME,
        "status": "online",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "active_provider": provider_manager.get_provider().name,
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "provider": settings.LLM_PROVIDER,
        "active_provider": provider_manager.get_provider().name,
        "environment": settings.ENVIRONMENT,
    }
