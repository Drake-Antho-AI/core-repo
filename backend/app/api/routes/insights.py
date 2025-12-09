"""Action items and insights endpoints."""

import logging
from pydantic import BaseModel
import httpx

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.config import settings
from app.models import ActionItem, Job, Post
from app.schemas.action_item import ActionItemResponse, ActionItemListResponse

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    job_id: str
    message: str


class ChatResponse(BaseModel):
    response: str


@router.get("", response_model=ActionItemListResponse)
async def list_action_items(
    job_id: str,
    category: list[str] | None = Query(default=None),
    priority: list[str] | None = Query(default=None),
    sort_by: str = Query(default="impact_score"),
    sort_order: str = Query(default="desc"),
    db: AsyncSession = Depends(get_db),
):
    """List action items for a job."""
    
    # Verify job exists
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Build query
    query = select(ActionItem).where(ActionItem.job_id == job_id)
    
    # Apply filters
    if category:
        query = query.where(ActionItem.category.in_(category))
    
    if priority:
        query = query.where(ActionItem.priority.in_(priority))
    
    # Sorting
    if sort_by == "priority":
        pass  # Will sort after fetching
    else:
        sort_column = getattr(ActionItem, sort_by, ActionItem.impact_score)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc().nulls_last())
        else:
            query = query.order_by(sort_column.asc().nulls_last())
    
    # Execute query
    result = await db.execute(query)
    items = list(result.scalars().all())
    
    # Sort by priority if requested
    if sort_by == "priority":
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        reverse = sort_order == "desc"
        items.sort(
            key=lambda x: priority_order.get(x.priority, 4),
            reverse=not reverse
        )
    
    # Calculate summary
    summary = {
        "total_items": len(items),
        "by_category": {},
        "by_priority": {},
        "avg_impact_score": 0,
    }
    
    total_impact = 0
    impact_count = 0
    
    for item in items:
        cat = item.category or "other"
        summary["by_category"][cat] = summary["by_category"].get(cat, 0) + 1
        
        pri = item.priority or "medium"
        summary["by_priority"][pri] = summary["by_priority"].get(pri, 0) + 1
        
        if item.impact_score is not None:
            total_impact += item.impact_score
            impact_count += 1
    
    if impact_count > 0:
        summary["avg_impact_score"] = round(total_impact / impact_count, 1)
    
    # Convert to response
    action_item_responses = []
    for item in items:
        action_item_responses.append(ActionItemResponse(
            id=item.id,
            job_id=item.job_id,
            title=item.title,
            description=item.description,
            category=item.category,
            priority=item.priority,
            impact_score=item.impact_score,
            effort_level=item.effort_level,
            timeline=item.timeline,
            recommendations=item.recommendations,
            related_post_ids=item.related_post_ids,
            metrics=item.metrics,
            created_at=item.created_at,
        ))
    
    return ActionItemListResponse(
        total=len(items),
        action_items=action_item_responses,
        summary=summary,
    )


@router.get("/{item_id}")
async def get_action_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single action item."""
    
    result = await db.execute(
        select(ActionItem).where(ActionItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    
    return ActionItemResponse(
        id=item.id,
        job_id=item.job_id,
        title=item.title,
        description=item.description,
        category=item.category,
        priority=item.priority,
        impact_score=item.impact_score,
        effort_level=item.effort_level,
        timeline=item.timeline,
        recommendations=item.recommendations,
        related_post_ids=item.related_post_ids,
        metrics=item.metrics,
        created_at=item.created_at,
    )


@router.get("/{item_id}/related-posts")
async def get_related_posts(
    item_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get posts related to an action item."""
    
    result = await db.execute(
        select(ActionItem).where(ActionItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    
    related_ids = item.related_post_ids or []
    
    if not related_ids:
        return {"posts": []}
    
    # Get posts
    result = await db.execute(
        select(Post)
        .where(Post.id.in_(related_ids[:limit]))
    )
    posts = result.scalars().all()
    
    return {
        "posts": [
            {
                "id": str(p.id),
                "title": p.title,
                "subreddit": p.subreddit,
                "sentiment": p.sentiment,
                "url": p.url,
                "score": p.score,
            }
            for p in posts
        ]
    }


@router.get("/summary/{job_id}")
async def get_executive_summary(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get executive summary for a job's insights."""
    
    # Get job
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get post count and sentiment breakdown
    post_result = await db.execute(
        select(
            func.count(Post.id).label("total"),
            Post.sentiment,
        )
        .where(Post.job_id == job_id)
        .group_by(Post.sentiment)
    )
    sentiment_rows = post_result.all()
    
    total_posts = sum(row.total for row in sentiment_rows)
    sentiment_breakdown = {
        row.sentiment: row.total
        for row in sentiment_rows
        if row.sentiment
    }
    
    positive = sentiment_breakdown.get("positive", 0) + sentiment_breakdown.get("slightly_positive", 0)
    negative = sentiment_breakdown.get("negative", 0) + sentiment_breakdown.get("slightly_negative", 0)
    
    # Get action item counts
    action_result = await db.execute(
        select(func.count(ActionItem.id), ActionItem.priority)
        .where(ActionItem.job_id == job_id)
        .group_by(ActionItem.priority)
    )
    priority_counts = {
        row.priority: row[0]
        for row in action_result.all()
    }
    
    return {
        "job_id": str(job_id),
        "total_posts": total_posts,
        "sentiment_breakdown": sentiment_breakdown,
        "positive_percentage": round(positive / total_posts * 100, 1) if total_posts else 0,
        "negative_percentage": round(negative / total_posts * 100, 1) if total_posts else 0,
        "action_items_by_priority": priority_counts,
        "critical_items": priority_counts.get("critical", 0),
        "high_priority_items": priority_counts.get("high", 0),
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "subreddits_analyzed": job.subreddits,
        "keywords_used": job.keywords,
    }


@router.post("/chat", response_model=ChatResponse)
async def chat_with_insights(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Chat with the LLM about analyzed data."""
    
    # Get job and verify it exists
    job_result = await db.execute(select(Job).where(Job.id == request.job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get posts for context
    posts_result = await db.execute(
        select(Post).where(Post.job_id == request.job_id).limit(50)
    )
    posts = posts_result.scalars().all()
    
    # Get action items for context
    items_result = await db.execute(
        select(ActionItem).where(ActionItem.job_id == request.job_id)
    )
    action_items = items_result.scalars().all()
    
    # Build context summary
    sentiment_counts = {}
    pain_points = []
    feature_requests = []
    brands = []
    
    for post in posts:
        s = post.sentiment or "neutral"
        sentiment_counts[s] = sentiment_counts.get(s, 0) + 1
        pain_points.extend(post.pain_points or [])
        feature_requests.extend(post.feature_requests or [])
        brands.extend(post.brands_mentioned or [])
    
    # Count occurrences
    from collections import Counter
    top_pain_points = Counter(pain_points).most_common(10)
    top_features = Counter(feature_requests).most_common(10)
    top_brands = Counter(brands).most_common(5)
    
    # Build context for LLM
    context = f"""You are an AI assistant helping analyze Reddit feedback about products/services.

ANALYSIS CONTEXT:
- Subreddits analyzed: {', '.join(job.subreddits)}
- Keywords: {', '.join(job.keywords)}
- Total posts: {len(posts)}
- Sentiment breakdown: {sentiment_counts}

TOP PAIN POINTS (issues customers complain about):
{chr(10).join(f'- {pp}: {count} mentions' for pp, count in top_pain_points) or 'None identified'}

TOP FEATURE REQUESTS:
{chr(10).join(f'- {fr}: {count} mentions' for fr, count in top_features) or 'None identified'}

BRANDS MENTIONED:
{chr(10).join(f'- {b}: {count} mentions' for b, count in top_brands) or 'None identified'}

ACTION ITEMS GENERATED:
{chr(10).join(f'- [{item.priority.upper()}] {item.title}' for item in action_items[:8])}

SAMPLE POSTS:
{chr(10).join(f'- "{p.title[:80]}" (sentiment: {p.sentiment})' for p in posts[:5])}

Answer the user's question based on this data. Be concise but helpful."""
    
    prompt = f"""{context}

USER QUESTION: {request.message}

ANSWER:"""
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 300,
                    },
                },
            )
            response.raise_for_status()
            result = response.json()
            answer = result.get("response", "I couldn't generate a response.")
            
            return ChatResponse(response=answer.strip())
            
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get response from LLM")
