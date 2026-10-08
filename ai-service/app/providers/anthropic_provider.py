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

ANTHROPIC_SYSTEM_PROMPT = """You are an expert AI task parser.
Extract structured task info and return ONLY a JSON object:
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


class AnthropicProvider(BaseLLMProvider):
    name: str = "anthropic"

    def __init__(self, api_key: str = "", model: str = ""):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model or settings.ANTHROPIC_MODEL

    async def parse_task(self, request: TaskParseRequest) -> TaskParseResponse:
        if not self.api_key:
            raise ValueError("Anthropic API key is missing")

        ref_date = request.referenceDate or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        tz = request.timezone or "UTC"

        user_content = f"""Reference timestamp: {ref_date} (Timezone: {tz})
Input: "{request.text}"
"""

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": 1000,
                    "system": ANTHROPIC_SYSTEM_PROMPT,
                    "messages": [{"role": "user", "content": user_content}],
                },
            )

            if resp.status_code != 200:
                logger.error(f"Anthropic API error {resp.status_code}: {resp.text}")
                raise RuntimeError(f"Anthropic API error {resp.status_code}: {resp.text}")

            data = resp.json()
            raw_text = data["content"][0]["text"]
            # Extract JSON substring if wrapped in markdown code blocks
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0].strip()

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
