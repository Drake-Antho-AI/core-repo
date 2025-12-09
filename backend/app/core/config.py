"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Application
    app_name: str = "Reddit Sentiment Analyzer"
    debug: bool = False
    secret_key: str = "change-me-in-production"
    
    # Database (SQLite for development, PostgreSQL for production)
    database_url: str = "sqlite+aiosqlite:///./reddit_sentiment.db"
    database_url_sync: str = "sqlite:///./reddit_sentiment.db"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Ollama LLM (llama3.2:3b is faster on CPU, llama3.1:8b is more accurate)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2:0.5b"
    
    # Reddit scraping
    reddit_user_agent: str = "RedditSentimentAnalyzer/2.0"
    reddit_rate_limit_delay: float = 2.0
    
    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

