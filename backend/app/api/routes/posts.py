"""Post browsing endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from app.core.database import get_db
from app.models import Post, Job
from app.schemas.post import PostResponse, PostListResponse
from app.services.insight_generator import insight_generator

router = APIRouter()


@router.get("", response_model=PostListResponse)
async def list_posts(
    job_id: str,
    sentiment: list[str] | None = Query(default=None),
    subreddit: list[str] | None = Query(default=None),
    has_pain_points: bool | None = Query(default=None),
    has_feature_requests: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    sort_by: str = Query(default="reddit_created_at"),
    sort_order: str = Query(default="desc"),
    limit: int = Query(default=50, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List posts for a job with filtering and pagination."""
    
    # Verify job exists
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Build query
    query = select(Post).where(Post.job_id == job_id)
    count_query = select(func.count(Post.id)).where(Post.job_id == job_id)
    
    # Apply filters
    if sentiment:
        query = query.where(Post.sentiment.in_(sentiment))
        count_query = count_query.where(Post.sentiment.in_(sentiment))
    
    if subreddit:
        query = query.where(Post.subreddit.in_(subreddit))
        count_query = count_query.where(Post.subreddit.in_(subreddit))
    
    # For SQLite, we check if the JSON array is not empty
    if has_pain_points is True:
        query = query.where(
            and_(
                Post.pain_points_json.isnot(None),
                Post.pain_points_json != "[]",
                Post.pain_points_json != "null"
            )
        )
        count_query = count_query.where(
            and_(
                Post.pain_points_json.isnot(None),
                Post.pain_points_json != "[]",
                Post.pain_points_json != "null"
            )
        )
    elif has_pain_points is False:
        query = query.where(
            or_(
                Post.pain_points_json.is_(None),
                Post.pain_points_json == "[]",
                Post.pain_points_json == "null"
            )
        )
        count_query = count_query.where(
            or_(
                Post.pain_points_json.is_(None),
                Post.pain_points_json == "[]",
                Post.pain_points_json == "null"
            )
        )
    
    if has_feature_requests is True:
        query = query.where(
            and_(
                Post.feature_requests_json.isnot(None),
                Post.feature_requests_json != "[]",
                Post.feature_requests_json != "null"
            )
        )
        count_query = count_query.where(
            and_(
                Post.feature_requests_json.isnot(None),
                Post.feature_requests_json != "[]",
                Post.feature_requests_json != "null"
            )
        )
    elif has_feature_requests is False:
        query = query.where(
            or_(
                Post.feature_requests_json.is_(None),
                Post.feature_requests_json == "[]",
                Post.feature_requests_json == "null"
            )
        )
        count_query = count_query.where(
            or_(
                Post.feature_requests_json.is_(None),
                Post.feature_requests_json == "[]",
                Post.feature_requests_json == "null"
            )
        )
    
    if search:
        search_filter = or_(
            Post.title.ilike(f"%{search}%"),
            Post.body.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Sorting
    sort_column = getattr(Post, sort_by, Post.reddit_created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    query = query.limit(limit).offset(offset)
    
    # Execute query
    result = await db.execute(query)
    posts = result.scalars().all()
    
    # Convert to response models
    post_responses = []
    for post in posts:
        post_responses.append(PostResponse(
            id=post.id,
            job_id=post.job_id,
            reddit_id=post.reddit_id,
            title=post.title,
            body=post.body,
            subreddit=post.subreddit,
            author=post.author,
            url=post.url,
            score=post.score,
            num_comments=post.num_comments,
            reddit_created_at=post.reddit_created_at,
            matched_keyword=post.matched_keyword,
            sentiment=post.sentiment,
            sentiment_score=post.sentiment_score,
            pain_points=post.pain_points,
            feature_requests=post.feature_requests,
            brands_mentioned=post.brands_mentioned,
            user_type=post.user_type,
            created_at=post.created_at,
        ))
    
    return PostListResponse(total=total, posts=post_responses)


@router.get("/stats")
async def get_post_stats(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for posts in a job."""
    
    # Get all posts
    result = await db.execute(
        select(Post).where(Post.job_id == job_id)
    )
    posts = result.scalars().all()
    
    if not posts:
        raise HTTPException(status_code=404, detail="No posts found for job")
    
    # Convert to dicts using properties
    posts_data = [
        {
            "id": p.id,
            "title": p.title,
            "body": p.body,
            "subreddit": p.subreddit,
            "sentiment": p.sentiment,
            "sentiment_score": p.sentiment_score,
            "pain_points": p.pain_points or [],
            "feature_requests": p.feature_requests or [],
            "brands_mentioned": p.brands_mentioned or [],
            "user_type": p.user_type,
        }
        for p in posts
    ]
    
    stats = insight_generator.calculate_stats(posts_data)
    return stats


@router.get("/subreddits")
async def get_subreddits(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get unique subreddits in a job's posts."""
    
    result = await db.execute(
        select(Post.subreddit, func.count(Post.id).label("count"))
        .where(Post.job_id == job_id)
        .group_by(Post.subreddit)
        .order_by(func.count(Post.id).desc())
    )
    
    subreddits = [
        {"name": row.subreddit, "count": row.count}
        for row in result.all()
    ]
    
    return {"subreddits": subreddits}


@router.get("/{post_id}")
async def get_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single post by ID."""
    
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return PostResponse(
        id=post.id,
        job_id=post.job_id,
        reddit_id=post.reddit_id,
        title=post.title,
        body=post.body,
        subreddit=post.subreddit,
        author=post.author,
        url=post.url,
        score=post.score,
        num_comments=post.num_comments,
        reddit_created_at=post.reddit_created_at,
        matched_keyword=post.matched_keyword,
        sentiment=post.sentiment,
        sentiment_score=post.sentiment_score,
        pain_points=post.pain_points,
        feature_requests=post.feature_requests,
        brands_mentioned=post.brands_mentioned,
        user_type=post.user_type,
        created_at=post.created_at,
    )
