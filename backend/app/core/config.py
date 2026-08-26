from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "LLMark"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"
    DEBUG: bool = False

    # CORS origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./llmark.db"

    # Built-in Authoritative Model Pricing per 1M tokens ($)
    # Format: [prompt_price_per_1m, completion_price_per_1m]
    MODEL_PRICING: dict[str, tuple[float, float]] = {
        # ==========================================
        # OpenAI 2026 & Flagship Models
        # ==========================================
        "gpt-5.6-sol": (4.00, 20.00),
        "gpt-5-sol": (4.00, 20.00),
        "gpt-5.6-terra": (2.00, 12.00),
        "gpt-5-terra": (2.00, 12.00),
        "gpt-5.6-luna": (0.20, 1.20),
        "gpt-5-luna": (0.20, 1.20),
        "gpt-4.5-preview": (75.00, 150.00),
        "gpt-4o": (2.50, 10.00),
        "gpt-4o-2024-08-06": (2.50, 10.00),
        "gpt-4o-2024-11-20": (2.50, 10.00),
        "gpt-4o-mini": (0.15, 0.60),
        "gpt-4o-mini-2024-07-18": (0.15, 0.60),
        "o3": (2.00, 8.00),
        "o4-mini": (0.55, 2.20),
        "o3-mini": (1.10, 4.40),
        "o3-mini-2025-01-31": (1.10, 4.40),
        "o1": (15.00, 60.00),
        "o1-2024-12-17": (15.00, 60.00),
        "o1-preview": (15.00, 60.00),
        "o1-mini": (1.10, 4.40),
        "gpt-4-turbo": (10.00, 30.00),
        "gpt-4": (30.00, 60.00),
        "gpt-3.5-turbo": (0.50, 1.50),

        # ==========================================
        # Anthropic Claude 2026 & Flagship Models
        # ==========================================
        "claude-sonnet-5": (2.00, 10.00),
        "claude-5-sonnet": (2.00, 10.00),
        "claude-haiku-4.5": (1.00, 5.00),
        "claude-4.5-haiku": (1.00, 5.00),
        "claude-3-7-sonnet-20250219": (3.00, 15.00),
        "claude-3-7-sonnet": (3.00, 15.00),
        "claude-3-5-sonnet-20241022": (3.00, 15.00),
        "claude-3-5-sonnet-20240620": (3.00, 15.00),
        "claude-3-5-sonnet": (3.00, 15.00),
        "claude-3-5-haiku-20241022": (0.80, 4.00),
        "claude-3-5-haiku": (0.80, 4.00),
        "claude-3-opus-20240229": (15.00, 75.00),
        "claude-3-opus": (15.00, 75.00),
        "claude-3-haiku-20240307": (0.25, 1.25),

        # ==========================================
        # Google Gemini 2026 & Flagship Models
        # ==========================================
        "gemini-3.7-flash": (0.75, 3.75),
        "gemini-3.1-pro": (2.00, 12.00),
        "gemini-2.0-flash": (0.10, 0.40),
        "gemini-2.0-flash-exp": (0.10, 0.40),
        "gemini-2.0-flash-thinking-exp": (0.10, 0.40),
        "gemini-2.0-pro-exp-02-05": (1.25, 5.00),
        "gemini-1.5-pro": (1.25, 5.00),
        "gemini-1.5-pro-latest": (1.25, 5.00),
        "gemini-1.5-flash": (0.075, 0.30),
        "gemini-1.5-flash-latest": (0.075, 0.30),
        "gemini-1.5-flash-8b": (0.0375, 0.15),

        # ==========================================
        # DeepSeek Models
        # ==========================================
        "deepseek-ai/deepseek-r1": (0.55, 2.19),
        "deepseek-r1": (0.55, 2.19),
        "deepseek-reasoner": (0.55, 2.19),
        "deepseek-ai/deepseek-v3": (0.14, 0.28),
        "deepseek-v3": (0.14, 0.28),
        "deepseek-chat": (0.14, 0.28),

        # ==========================================
        # xAI Grok Models
        # ==========================================
        "grok-2-1212": (2.00, 10.00),
        "grok-2": (2.00, 10.00),
        "grok-2-vision-1212": (2.00, 10.00),
        "grok-2-mini": (0.20, 1.00),
        "grok-beta": (5.00, 15.00),

        # ==========================================
        # Meta Llama Models (via Groq / Together / Fireworks)
        # ==========================================
        "meta-llama/llama-3.3-70b-instruct": (0.59, 0.79),
        "llama-3.3-70b-instruct": (0.59, 0.79),
        "llama-3.3-70b-versatile": (0.59, 0.79),
        "llama-3.3-70b": (0.59, 0.79),
        "meta-llama/llama-3.1-405b-instruct": (2.50, 7.50),
        "llama-3.1-405b": (2.50, 7.50),
        "meta-llama/llama-3.1-70b-instruct": (0.55, 0.75),
        "llama-3.1-70b": (0.55, 0.75),
        "meta-llama/llama-3.1-8b-instruct": (0.05, 0.08),
        "llama-3.1-8b-instant": (0.05, 0.08),
        "llama-3.1-8b": (0.05, 0.08),

        # ==========================================
        # Mistral AI Models
        # ==========================================
        "mistral-large-latest": (2.00, 6.00),
        "mistral-large-2407": (2.00, 6.00),
        "pixtral-large-latest": (2.00, 6.00),
        "mistral-small-latest": (0.20, 0.60),
        "codestral-latest": (0.30, 0.90),
        "codestral-2501": (0.30, 0.90),

        # ==========================================
        # Qwen Models
        # ==========================================
        "qwen/qwen-2.5-72b-instruct": (0.35, 0.70),
        "qwen-2.5-72b": (0.35, 0.70),
        "qwen/qwen-2.5-coder-32b-instruct": (0.18, 0.36),
        "qwen-2.5-coder-32b": (0.18, 0.36),

        # ==========================================
        # AWS Bedrock Models
        # ==========================================
        "amazon.nova-pro-v1:0": (0.80, 3.20),
        "amazon.nova-lite-v1:0": (0.06, 0.24),
        "amazon.nova-micro-v1:0": (0.035, 0.14),
        "anthropic.claude-3-5-sonnet-20241022-v2:0": (3.00, 15.00),
        "anthropic.claude-3-5-haiku-20241022-v1:0": (0.80, 4.00),

        # ==========================================
        # Testing & Local Fallbacks
        # ==========================================
        "mock": (0.0, 0.0),
        "default": (0.50, 1.50),
    }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
