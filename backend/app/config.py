from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Support SaaS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/ai_support"
    DATABASE_POOL_SIZE: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # AI / Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:latest"
    AI_TIMEOUT_SECONDS: int = 30
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # FAISS
    FAISS_INDEX_PATH: str = "./data/faiss_index"
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    TOP_K_RESULTS: int = 5

    # Whisper
    WHISPER_MODEL: str = "base"

    # Escalation
    ESCALATION_THRESHOLD: float = 0.7

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@aisupporthub.com"
    IMAP_HOST: str = "imap.gmail.com"
    IMAP_PORT: int = 993

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Subscription limits
    BASIC_TICKET_LIMIT: int = 500
    PRO_TICKET_LIMIT: int = 5000
    PREMIUM_TICKET_LIMIT: int = 999999
    BASIC_AGENT_LIMIT: int = 3
    PRO_AGENT_LIMIT: int = 15
    PREMIUM_AGENT_LIMIT: int = 999999

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # Webhook secrets (add per-CRM in env)
    ZOHO_WEBHOOK_SECRET: str = ""
    HUBSPOT_WEBHOOK_SECRET: str = ""
    SHOPIFY_WEBHOOK_SECRET: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
