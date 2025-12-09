"""Job schemas for API validation."""

from datetime import datetime
from pydantic import BaseModel, Field


class JobCreate(BaseModel):
    """Schema for creating a new analysis job."""
    
    subreddits: list[str] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="List of subreddits to search",
        examples=[["Landscaping", "Construction", "heavyequipment"]],
    )
    keywords: list[str] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="Keywords/brands to search for",
        examples=[["Toro", "Mini skid steer", "Bobcat"]],
    )
    time_filter: str = Field(
        default="year",
        pattern="^(hour|day|week|month|year|all)$",
        description="Reddit time filter",
    )
    sort_by: str = Field(
        default="relevance",
        pattern="^(relevance|hot|top|new|comments)$",
        description="Sort method for search results",
    )
    post_limit: int = Field(
        default=50,
        ge=10,
        le=100,
        description="Maximum posts per search query",
    )
    include_comments: bool = Field(
        default=True,
        description="Whether to analyze comments",
    )


class JobProgress(BaseModel):
    """Progress tracking for a job."""
    
    current: int = 0
    total: int = 0
    step: str = ""
    posts_found: int = 0


class JobResponse(BaseModel):
    """Schema for job API responses."""
    
    id: str
    status: str
    subreddits: list[str]
    keywords: list[str]
    time_filter: str
    sort_by: str
    post_limit: int
    include_comments: bool
    progress: JobProgress
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    estimated_time: int | None = None

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    """Paginated list of jobs."""
    
    total: int
    jobs: list[JobResponse]
