import logging
from typing import Dict, Optional, Type
from app.providers.base import BaseLLMProvider
from app.providers.local_parser import LocalNLPProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.gemini_provider import GeminiProvider
from app.providers.anthropic_provider import AnthropicProvider
from app.config import settings

logger = logging.getLogger(__name__)


class ProviderManager:
    """
    Manages LLM provider lifecycle, provider switching, and fallback mechanisms.
    Allows easy substitution of LLM providers across OpenAI, Gemini, Anthropic, or local offline parser.
    """

    def __init__(self):
        self._providers: Dict[str, BaseLLMProvider] = {}
        self._registry: Dict[str, Type[BaseLLMProvider]] = {
            "local": LocalNLPProvider,
            "openai": OpenAIProvider,
            "gemini": GeminiProvider,
            "anthropic": AnthropicProvider,
        }
        self._initialize_providers()

    def register_provider(self, name: str, provider_cls: Type[BaseLLMProvider]):
        """Register a new LLM provider dynamically."""
        self._registry[name.lower()] = provider_cls

    def _initialize_providers(self):
        # Always instantiate LocalNLPProvider as fallback
        self._providers["local"] = LocalNLPProvider()

        if settings.OPENAI_API_KEY:
            self._providers["openai"] = OpenAIProvider()
        if settings.GEMINI_API_KEY:
            self._providers["gemini"] = GeminiProvider()
        if settings.ANTHROPIC_API_KEY:
            self._providers["anthropic"] = AnthropicProvider()

    def get_provider(self, name: Optional[str] = None) -> BaseLLMProvider:
        """
        Get provider instance by name.
        If 'auto' or unspecified, selects the best configured provider,
        falling back to LocalNLPProvider if no external keys exist.
        """
        provider_name = (name or settings.LLM_PROVIDER or "auto").lower()

        if provider_name == "auto":
            # Auto selection preference: OpenAI -> Gemini -> Anthropic -> Local
            if settings.OPENAI_API_KEY:
                return self._providers.get("openai", self._providers["local"])
            elif settings.GEMINI_API_KEY:
                return self._providers.get("gemini", self._providers["local"])
            elif settings.ANTHROPIC_API_KEY:
                return self._providers.get("anthropic", self._providers["local"])
            else:
                return self._providers["local"]

        if provider_name in self._providers:
            return self._providers[provider_name]

        # Check if provider class is registered but needs initialization
        if provider_name in self._registry:
            instance = self._registry[provider_name]()
            self._providers[provider_name] = instance
            return instance

        logger.warning(f"Provider '{provider_name}' not found or unconfigured. Defaulting to local NLP parser.")
        return self._providers["local"]

    def get_fallback_provider(self) -> BaseLLMProvider:
        """Returns reliable offline local parser for guaranteed responses."""
        return self._providers["local"]


provider_manager = ProviderManager()
