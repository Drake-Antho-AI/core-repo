"""Common schemas shared across the API."""

from pydantic import BaseModel


class SentimentBreakdown(BaseModel):
    """Sentiment distribution counts."""
    
    positive: int = 0
    slightly_positive: int = 0
    neutral: int = 0
    slightly_negative: int = 0
    negative: int = 0
    
    @property
    def total(self) -> int:
        return (
            self.positive +
            self.slightly_positive +
            self.neutral +
            self.slightly_negative +
            self.negative
        )


class StatsResponse(BaseModel):
    """Statistics for a job's analyzed posts."""
    
    total_posts: int
    sentiment_breakdown: SentimentBreakdown
    subreddit_counts: dict[str, int]
    top_pain_points: list[dict[str, int]]
    top_feature_requests: list[dict[str, int]]
    top_brands: list[dict[str, int]]
    avg_sentiment_score: float | None = None


class HealthResponse(BaseModel):
    """Health check response."""
    
    status: str
    database: str
    redis: str
    ollama: str


