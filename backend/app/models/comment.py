"""Comment model for Reddit comments and analysis."""

import uuid
import json
from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Comment(Base):
    """Reddit comment with sentiment analysis."""
    
    __tablename__ = "comments"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    
    # Post reference
    post_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Reddit metadata
    reddit_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str | None] = mapped_column(String(100))
    score: Mapped[int] = mapped_column(Integer, default=0)
    reddit_created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    # Analysis results
    sentiment: Mapped[str | None] = mapped_column(String(20), index=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float)
    pain_points_json: Mapped[str | None] = mapped_column(Text)
    feature_requests_json: Mapped[str | None] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    
    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="comments")
    
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
    
    def __repr__(self) -> str:
        return f"<Comment {self.reddit_id} sentiment={self.sentiment}>"
