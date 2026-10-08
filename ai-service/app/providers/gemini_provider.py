import json
import logging
import httpx
from datetime import datetime
from app.providers.base import BaseLLMProvider
from app.schemas.task_parser import (
    TaskParseRequest,
    TaskParseResponse,
    ParsedTask,
)
from app.config import settings

logger = logging.getLogger(__name__)

GEMINI_SYSTEM_INSTRUCTION = """You are an expert AI task parser that extracts structured task information.
You must return only a valid JSON object matching:
{
  "intent": "CREATE_TASK",
  "confidence": 0.98,
  "task": {
    "title": "Clean task title",
    "date": "YYYY-MM-DD or null",
    "time": "HH:MM (24h) or null",
    "startTime": "HH:MM or null",
    "endTime": "HH:MM or null",
    "duration": integer minutes or null,
    "category": "STUDY" | "WORK" | "PERSONAL" | "HEALTH" | "FITNESS" | "FINANCE" | "OTHER",
    "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "isRecurring": boolean,
    "recurrenceInterval": "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM" | null,
    "recurrenceRule": "string or null",
    "deadline": "ISO datetime or null",
    "dueDate": "YYYY-MM-DD or null",
    "notes": "string or null",
    "tags": ["tag1"]
  },
  "explanation": "Reasoning"
}
"""


class GeminiProvider(BaseLLMProvider):
    name: str = "gemini"

    def __init__(self, api_key: str = "", model: str = ""):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL

    async def parse_task(self, request: TaskParseRequest) -> TaskParseResponse:
        if not self.api_key:
            raise ValueError("Gemini API key is missing")

        ref_date = request.referenceDate or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        tz = request.timezone or "UTC"

        prompt = f"""{GEMINI_SYSTEM_INSTRUCTION}

Reference timestamp: {ref_date} (Timezone: {tz})
Input: "{request.text}"
"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"response_mime_type": "application/json"},
                },
            )

            if resp.status_code != 200:
                logger.error(f"Gemini API error {resp.status_code}: {resp.text}")
                raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text}")

            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed_json = json.loads(raw_text)

            task_dict = parsed_json.get("task", {})
            parsed_task = ParsedTask(**task_dict)

            return TaskParseResponse(
                intent=parsed_json.get("intent", "CREATE_TASK"),
                confidence=float(parsed_json.get("confidence", 0.95)),
                task=parsed_task,
                rawInput=request.text,
                providerUsed=self.name,
                explanation=parsed_json.get("explanation"),
            )
