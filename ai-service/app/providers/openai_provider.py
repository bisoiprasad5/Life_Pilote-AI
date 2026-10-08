import json
import logging
import httpx
from datetime import datetime
from app.providers.base import BaseLLMProvider
from app.schemas.task_parser import (
    TaskParseRequest,
    TaskParseResponse,
    ParsedTask,
    TaskCategory,
    TaskPriority,
    RecurrenceInterval,
)
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert AI productivity assistant that extracts structured task information from natural language user input.

You must output a strictly valid JSON object matching the following structure:
{
  "intent": "CREATE_TASK",
  "confidence": 0.98,
  "task": {
    "title": "Clean concise task title without command phrases like 'remind me to'",
    "date": "YYYY-MM-DD or null if not specified",
    "time": "HH:MM in 24-hour format or null",
    "startTime": "HH:MM in 24-hour format or null",
    "endTime": "HH:MM in 24-hour format or null",
    "duration": integer minutes or null,
    "category": "STUDY" | "WORK" | "PERSONAL" | "HEALTH" | "FITNESS" | "FINANCE" | "OTHER",
    "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "isRecurring": boolean,
    "recurrenceInterval": "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM" | null,
    "recurrenceRule": "RRULE string or null",
    "deadline": "ISO datetime string or null",
    "dueDate": "YYYY-MM-DD or null",
    "notes": "string or null",
    "tags": ["tag1", "tag2"]
  },
  "explanation": "Brief reasoning"
}

Guidelines:
1. Strip command words such as "Remind me to", "Please schedule", "I have to" from the title.
2. If duration and startTime are provided, calculate endTime.
3. If deadline phrase like "before Friday 5 PM" or "by tomorrow" is given, populate deadline with exact date & time.
4. If recurring like "every Sunday", set isRecurring=true, recurrenceInterval="WEEKLY".
5. Use the user's reference date and timezone to resolve relative dates accurately.
"""


class OpenAIProvider(BaseLLMProvider):
    name: str = "openai"

    def __init__(self, api_key: str = "", model: str = ""):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL

    async def parse_task(self, request: TaskParseRequest) -> TaskParseResponse:
        if not self.api_key:
            raise ValueError("OpenAI API key is missing")

        ref_date = request.referenceDate or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        tz = request.timezone or "UTC"

        user_content = f"""Current reference timestamp: {ref_date} (Timezone: {tz})
User input: "{request.text}"
"""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                },
            )

            if resp.status_code != 200:
                logger.error(f"OpenAI error {resp.status_code}: {resp.text}")
                raise RuntimeError(f"OpenAI API error {resp.status_code}: {resp.text}")

            data = resp.json()
            raw_content = data["choices"][0]["message"]["content"]
            parsed_json = json.loads(raw_content)

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
