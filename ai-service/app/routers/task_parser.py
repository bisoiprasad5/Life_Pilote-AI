import logging
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Query
from app.schemas.task_parser import TaskParseRequest, TaskParseResponse
from app.providers.factory import provider_manager
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Task Parser"])


@router.post("/parse-task", response_model=TaskParseResponse)
@router.post("/api/v1/parse-task", response_model=TaskParseResponse)
async def parse_task(
    request: TaskParseRequest,
    provider: str = Query(None, description="Optional override for LLM provider (openai, gemini, anthropic, local, auto)")
) -> TaskParseResponse:
    """
    Parse natural language user input into structured task information.
    Extracts dates, times, duration, categories, priority, recurrence, and deadlines.
    Falls back gracefully to LocalNLPProvider if external LLM provider encounters issues.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty")

    selected_provider = provider_manager.get_provider(provider)
    logger.info(f"Processing task parse request with provider '{selected_provider.name}': {request.text}")

    try:
        response = await selected_provider.parse_task(request)
        return response
    except Exception as exc:
        logger.warning(
            f"Provider '{selected_provider.name}' failed with error: {exc}. Falling back to local NLP parser."
        )
        fallback = provider_manager.get_fallback_provider()
        fallback_resp = await fallback.parse_task(request)
        fallback_resp.explanation = f"Processed via local fallback parser (Primary '{selected_provider.name}' was unavailable: {str(exc)})"
        return fallback_resp


@router.get("/providers", response_model=Dict[str, Any])
@router.get("/api/v1/providers", response_model=Dict[str, Any])
async def list_providers() -> Dict[str, Any]:
    """List available LLM providers and current active configuration."""
    available = ["local"]
    if settings.OPENAI_API_KEY:
        available.append("openai")
    if settings.GEMINI_API_KEY:
        available.append("gemini")
    if settings.ANTHROPIC_API_KEY:
        available.append("anthropic")

    active_provider = provider_manager.get_provider().name

    return {
        "configured_provider": settings.LLM_PROVIDER,
        "active_provider": active_provider,
        "available_providers": available,
        "models": {
            "openai": settings.OPENAI_MODEL,
            "gemini": settings.GEMINI_MODEL,
            "anthropic": settings.ANTHROPIC_MODEL,
        }
    }
