"""Job model for tracking analysis runs."""

import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, Text, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now():
    """Get current UTC time."""
    return datetime.now(timezone.utc)


class Job(Base):
    """Analysis job model."""
    
    __tablename__ = "jobs"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    
    # Status tracking
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )  # pending, running, completed, failed
    
    # Search configuration (stored as JSON for SQLite compatibility)
    subreddits_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    keywords_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    time_filter: Mapped[str] = mapped_column(String(20), nullable=False, default="year")
    sort_by: Mapped[str] = mapped_column(String(20), default="relevance")
    post_limit: Mapped[int] = mapped_column(Integer, default=50)
    include_comments: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Progress tracking (stored as JSON)
    progress_json: Mapped[str] = mapped_column(
        Text,
        default='{"current": 0, "total": 0, "step": "", "posts_found": 0}',
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utc_now,
        index=True,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    
    # Error handling
    error_message: Mapped[str | None] = mapped_column(Text)
    
    # Relationships
    posts: Mapped[list["Post"]] = relationship(
        "Post",
        back_populates="job",
        cascade="all, delete-orphan",
    )
    action_items: Mapped[list["ActionItem"]] = relationship(
        "ActionItem",
        back_populates="job",
        cascade="all, delete-orphan",
    )
    
    @property
    def subreddits(self) -> list[str]:
        return json.loads(self.subreddits_json) if self.subreddits_json else []
    
    @subreddits.setter
    def subreddits(self, value: list[str]):
        self.subreddits_json = json.dumps(value)
    
    @property
    def keywords(self) -> list[str]:
        return json.loads(self.keywords_json) if self.keywords_json else []
    
    @keywords.setter
    def keywords(self, value: list[str]):
        self.keywords_json = json.dumps(value)
    
    @property
    def progress(self) -> dict:
        return json.loads(self.progress_json) if self.progress_json else {}
    
    @progress.setter
    def progress(self, value: dict):
        self.progress_json = json.dumps(value)
    
    def __repr__(self) -> str:
        return f"<Job {self.id} status={self.status}>"
