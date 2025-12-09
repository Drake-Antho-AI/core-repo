"""Post model for Reddit posts and analysis results."""

import uuid
import json
from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Post(Base):
    """Reddit post with sentiment analysis."""
    
    __tablename__ = "posts"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    
    # Job reference
    job_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Reddit metadata
    reddit_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    subreddit: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    author: Mapped[str | None] = mapped_column(String(100))
    url: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    num_comments: Mapped[int] = mapped_column(Integer, default=0)
    reddit_created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    
    # Search context
    matched_keyword: Mapped[str | None] = mapped_column(String(200))
    
    # LLM Analysis results
    sentiment: Mapped[str | None] = mapped_column(String(20), index=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float)
    
    # Extracted insights (stored as JSON for SQLite compatibility)
    pain_points_json: Mapped[str | None] = mapped_column(Text)
    feature_requests_json: Mapped[str | None] = mapped_column(Text)
    brands_mentioned_json: Mapped[str | None] = mapped_column(Text)
    user_type: Mapped[str | None] = mapped_column(String(50))
    
    # Full LLM response for debugging
    analysis_metadata_json: Mapped[str | None] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        index=True,
    )
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="posts")
    comments: Mapped[list["Comment"]] = relationship(
        "Comment",
        back_populates="post",
        cascade="all, delete-orphan",
    )
    
    @property
    def pain_points(self) -> list[str] | None:
        return json.loads(self.pain_points_json) if self.pain_points_json else None
    
    @pain_points.setter
    def pain_points(self, value: list[str] | None):
        self.pain_points_json = json.dumps(value) if value else None
    
    @property
    def feature_requests(self) -> list[str] | None:
        return json.loads(self.feature_requests_json) if self.feature_requests_json else None
    
    @feature_requests.setter
    def feature_requests(self, value: list[str] | None):
        self.feature_requests_json = json.dumps(value) if value else None
    
    @property
    def brands_mentioned(self) -> list[str] | None:
        return json.loads(self.brands_mentioned_json) if self.brands_mentioned_json else None
    
    @brands_mentioned.setter
    def brands_mentioned(self, value: list[str] | None):
        self.brands_mentioned_json = json.dumps(value) if value else None
    
    @property
    def analysis_metadata(self) -> dict | None:
        return json.loads(self.analysis_metadata_json) if self.analysis_metadata_json else None
    
    @analysis_metadata.setter
    def analysis_metadata(self, value: dict | None):
        self.analysis_metadata_json = json.dumps(value) if value else None
    
    def __repr__(self) -> str:
        return f"<Post {self.reddit_id} sentiment={self.sentiment}>"
