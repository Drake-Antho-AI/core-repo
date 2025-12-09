"""Post schemas for API validation."""

from datetime import datetime
from pydantic import BaseModel, Field


class PostResponse(BaseModel):
    """Schema for post API responses."""
    
    id: str
    job_id: str
    reddit_id: str
    title: str
    body: str | None = None
    subreddit: str
    author: str | None = None
    url: str
    score: int
    num_comments: int
    reddit_created_at: datetime
    matched_keyword: str | None = None
    
    # Analysis results
    sentiment: str | None = None
    sentiment_score: float | None = None
    pain_points: list[str] | None = None
    feature_requests: list[str] | None = None
    brands_mentioned: list[str] | None = None
    user_type: str | None = None
    
    created_at: datetime

    model_config = {"from_attributes": True}


class PostFilters(BaseModel):
    """Query filters for posts."""
    
    job_id: str
    sentiment: list[str] | None = Field(
        default=None,
        description="Filter by sentiment(s)",
    )
    subreddit: list[str] | None = Field(
        default=None,
        description="Filter by subreddit(s)",
    )
    has_pain_points: bool | None = Field(
        default=None,
        description="Filter posts with pain points",
    )
    has_feature_requests: bool | None = Field(
        default=None,
        description="Filter posts with feature requests",
    )
    search: str | None = Field(
        default=None,
        description="Search in title and body",
    )
    sort_by: str = Field(
        default="created_at",
        pattern="^(created_at|score|num_comments|sentiment_score)$",
    )
    sort_order: str = Field(
        default="desc",
        pattern="^(asc|desc)$",
    )
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class PostListResponse(BaseModel):
    """Paginated list of posts."""
    
    total: int
    posts: list[PostResponse]
