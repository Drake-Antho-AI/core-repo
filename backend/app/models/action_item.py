"""Action item model for LLM-generated recommendations."""

import uuid
import json
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ActionItem(Base):
    """LLM-generated action item recommendation."""
    
    __tablename__ = "action_items"
    
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
    
    # Core fields
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    
    # Metrics
    impact_score: Mapped[int | None] = mapped_column(Integer, index=True)
    effort_level: Mapped[str | None] = mapped_column(String(20))
    timeline: Mapped[str | None] = mapped_column(String(50))
    
    # Supporting data (stored as JSON for SQLite compatibility)
    recommendations_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    related_post_ids_json: Mapped[str | None] = mapped_column(Text)
    metrics_json: Mapped[str | None] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="action_items")
    
    @property
    def recommendations(self) -> list[str]:
        return json.loads(self.recommendations_json) if self.recommendations_json else []
    
    @recommendations.setter
    def recommendations(self, value: list[str]):
        self.recommendations_json = json.dumps(value)
    
    @property
    def related_post_ids(self) -> list[str] | None:
        return json.loads(self.related_post_ids_json) if self.related_post_ids_json else None
    
    @related_post_ids.setter
    def related_post_ids(self, value: list | None):
        self.related_post_ids_json = json.dumps([str(v) for v in value]) if value else None
    
    @property
    def metrics(self) -> dict | None:
        return json.loads(self.metrics_json) if self.metrics_json else None
    
    @metrics.setter
    def metrics(self, value: dict | None):
        self.metrics_json = json.dumps(value) if value else None
    
    def __repr__(self) -> str:
        return f"<ActionItem {self.title[:30]} priority={self.priority}>"
