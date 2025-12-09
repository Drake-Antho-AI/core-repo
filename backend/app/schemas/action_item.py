"""Action item schemas for API validation."""

from datetime import datetime
from pydantic import BaseModel, Field


class ActionItemResponse(BaseModel):
    """Schema for action item API responses."""
    
    id: str
    job_id: str
    title: str
    description: str
    category: str  # product, service, marketing
    priority: str  # critical, high, medium, low
    impact_score: int | None = None  # 0-100
    effort_level: str | None = None  # low, medium, high, very_high
    timeline: str | None = None
    recommendations: list[str]
    related_post_ids: list[str] | None = None
    metrics: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ActionItemFilters(BaseModel):
    """Query filters for action items."""
    
    job_id: str
    category: list[str] | None = Field(
        default=None,
        description="Filter by category(s)",
    )
    priority: list[str] | None = Field(
        default=None,
        description="Filter by priority(s)",
    )
    sort_by: str = Field(
        default="impact_score",
        pattern="^(impact_score|priority|created_at)$",
    )
    sort_order: str = Field(
        default="desc",
        pattern="^(asc|desc)$",
    )


class ActionItemListResponse(BaseModel):
    """List of action items with summary."""
    
    total: int
    action_items: list[ActionItemResponse]
    summary: dict | None = None
