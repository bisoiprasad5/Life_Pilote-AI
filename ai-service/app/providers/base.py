from abc import ABC, abstractmethod
from app.schemas.task_parser import TaskParseRequest, TaskParseResponse


class BaseLLMProvider(ABC):
    """Abstract base class for all LLM task parsing providers."""

    name: str = "base"

    @abstractmethod
    async def parse_task(self, request: TaskParseRequest) -> TaskParseResponse:
        """Parse natural language task text into a structured TaskParseResponse."""
        pass
