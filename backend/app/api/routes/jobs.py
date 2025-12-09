"""Job management endpoints."""

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models import Job, Post
from app.schemas.job import JobCreate, JobResponse, JobProgress, JobListResponse
from app.services.reddit_scraper import reddit_scraper
from app.services.ollama_analyzer import ollama_analyzer
from app.services.insight_generator import insight_generator

router = APIRouter()


async def check_job_paused(db, job_id: str) -> bool:
    """Check if job has been paused."""
    result = await db.execute(select(Job.status).where(Job.id == job_id))
    status = result.scalar_one_or_none()
    return status == "paused"


async def process_job(job_id: str, db_session_factory):
    """Background task to process a job."""
    from app.core.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        # Get job
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        
        if not job:
            return
        
        # Don't process if already paused or not pending/running
        if job.status not in ("pending", "running"):
            return
        
        try:
            # Update status only if not already running (for resume case)
            if job.status == "pending":
                job.started_at = datetime.now(timezone.utc)
            job.status = "running"
            await db.commit()
            
            # Get subreddits and keywords from properties
            subreddits = job.subreddits
            keywords = job.keywords
            
            # Calculate total searches
            total_searches = len(subreddits) * len(keywords)
            current_search = 0
            all_posts = []
            seen_reddit_ids = set()
            
            # Scrape Reddit
            for subreddit in subreddits:
                for keyword in keywords:
                    # Check if paused
                    if await check_job_paused(db, job_id):
                        return  # Exit gracefully, job can be resumed later
                    
                    current_search += 1
                    
                    # Update progress
                    job.progress = {
                        "current": current_search,
                        "total": total_searches,
                        "step": f"Searching r/{subreddit} for '{keyword}'",
                        "posts_found": len(all_posts),
                    }
                    await db.commit()
                    
                    # Search Reddit
                    posts = await reddit_scraper.search(
                        subreddit=subreddit,
                        keyword=keyword,
                        time_filter=job.time_filter,
                        sort=job.sort_by,
                        limit=job.post_limit,
                    )
                    
                    # Deduplicate
                    for post_data in posts:
                        reddit_id = post_data["reddit_id"]
                        if reddit_id not in seen_reddit_ids:
                            seen_reddit_ids.add(reddit_id)
                            all_posts.append(post_data)
            
            # Check if paused before analysis phase
            if await check_job_paused(db, job_id):
                return
            
            # Update progress for analysis phase
            job.progress = {
                "current": 0,
                "total": len(all_posts),
                "step": "Analyzing posts with AI...",
                "posts_found": len(all_posts),
            }
            await db.commit()
            
            # Process posts in batches for speed
            BATCH_SIZE = 5
            logger.info(f"🚀 Starting LLM analysis of {len(all_posts)} posts in batches of {BATCH_SIZE}")
            for batch_start in range(0, len(all_posts), BATCH_SIZE):
                # Check if paused between batches
                if await check_job_paused(db, job_id):
                    return
                
                batch_end = min(batch_start + BATCH_SIZE, len(all_posts))
                logger.info(f"📦 Processing batch {batch_start//BATCH_SIZE + 1}: posts {batch_start+1}-{batch_end}")
                batch = all_posts[batch_start:batch_end]
                
                # Analyze batch concurrently
                analyses = await ollama_analyzer.analyze_batch(batch)
                
                # Create post records for batch
                for post_data, analysis in zip(batch, analyses):
                    post = Post(
                        job_id=job_id,
                        reddit_id=post_data["reddit_id"],
                        title=post_data["title"],
                        body=post_data.get("body"),
                        subreddit=post_data["subreddit"],
                        author=post_data.get("author"),
                        url=post_data["url"],
                        score=post_data.get("score", 0),
                        num_comments=post_data.get("num_comments", 0),
                        reddit_created_at=post_data["reddit_created_at"],
                        matched_keyword=post_data.get("matched_keyword"),
                        sentiment=analysis.get("sentiment"),
                        sentiment_score=analysis.get("sentiment_score"),
                        user_type=analysis.get("user_type"),
                    )
                    post.pain_points = analysis.get("pain_points")
                    post.feature_requests = analysis.get("feature_requests")
                    post.brands_mentioned = analysis.get("brands_mentioned")
                    post.analysis_metadata = analysis
                    db.add(post)
                
                # Update progress after each batch
                job.progress = {
                    "current": batch_end,
                    "total": len(all_posts),
                    "step": "Analyzing posts with AI...",
                    "posts_found": len(all_posts),
                }
                await db.commit()
            
            # Generate action items
            job.progress = {
                "current": len(all_posts),
                "total": len(all_posts),
                "step": "Generating insights and recommendations...",
                "posts_found": len(all_posts),
            }
            await db.commit()
            
            # Get all posts for insight generation
            result = await db.execute(
                select(Post).where(Post.job_id == job_id)
            )
            posts = result.scalars().all()
            
            # Convert to dicts for insight generator
            posts_data = [
                {
                    "id": p.id,
                    "title": p.title,
                    "body": p.body,
                    "subreddit": p.subreddit,
                    "sentiment": p.sentiment,
                    "sentiment_score": p.sentiment_score,
                    "pain_points": p.pain_points,
                    "feature_requests": p.feature_requests,
                    "brands_mentioned": p.brands_mentioned,
                    "user_type": p.user_type,
                }
                for p in posts
            ]
            
            # Generate action items
            from app.models import ActionItem
            action_items_data = await insight_generator.generate_action_items(posts_data)
            
            for item_data in action_items_data:
                action_item = ActionItem(
                    job_id=job_id,
                    title=item_data["title"],
                    description=item_data["description"],
                    category=item_data["category"],
                    priority=item_data["priority"],
                    impact_score=item_data.get("impact_score"),
                    effort_level=item_data.get("effort_level"),
                    timeline=item_data.get("timeline"),
                )
                action_item.recommendations = item_data["recommendations"]
                action_item.related_post_ids = item_data.get("related_post_ids")
                action_item.metrics = item_data.get("metrics")
                db.add(action_item)
            
            # Mark job as complete
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            job.progress = {
                "current": len(all_posts),
                "total": len(all_posts),
                "step": "Complete",
                "posts_found": len(all_posts),
            }
            await db.commit()
            
        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            await db.commit()
            raise


@router.post("", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Create a new analysis job."""
    
    # Create job record
    job = Job(
        time_filter=job_data.time_filter,
        sort_by=job_data.sort_by,
        post_limit=job_data.post_limit,
        include_comments=job_data.include_comments,
        status="pending",
    )
    # Set array properties
    job.subreddits = job_data.subreddits
    job.keywords = job_data.keywords
    job.progress = {"current": 0, "total": 0, "step": "Queued", "posts_found": 0}
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Estimate processing time
    total_searches = len(job_data.subreddits) * len(job_data.keywords)
    estimated_posts = total_searches * job_data.post_limit // 2
    estimated_time = (total_searches * 3) + (estimated_posts * 2)
    
    # Start background processing
    background_tasks.add_task(process_job, job.id, None)
    
    return JobResponse(
        id=job.id,
        status=job.status,
        subreddits=job.subreddits,
        keywords=job.keywords,
        time_filter=job.time_filter,
        sort_by=job.sort_by,
        post_limit=job.post_limit,
        include_comments=job.include_comments,
        progress=JobProgress(**job.progress),
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        error_message=job.error_message,
        estimated_time=estimated_time,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get job status and progress."""
    
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get post count
    post_count_result = await db.execute(
        select(func.count(Post.id)).where(Post.job_id == job_id)
    )
    post_count = post_count_result.scalar() or 0
    
    progress = job.progress or {}
    progress["posts_found"] = post_count
    
    return JobResponse(
        id=job.id,
        status=job.status,
        subreddits=job.subreddits,
        keywords=job.keywords,
        time_filter=job.time_filter,
        sort_by=job.sort_by,
        post_limit=job.post_limit,
        include_comments=job.include_comments,
        progress=JobProgress(**progress),
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        error_message=job.error_message,
    )


@router.get("", response_model=JobListResponse)
async def list_jobs(
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List all jobs, most recent first."""
    
    # Get total count
    count_result = await db.execute(select(func.count(Job.id)))
    total = count_result.scalar() or 0
    
    # Get jobs
    result = await db.execute(
        select(Job)
        .order_by(Job.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    jobs = result.scalars().all()
    
    return JobListResponse(
        total=total,
        jobs=[
            JobResponse(
                id=job.id,
                status=job.status,
                subreddits=job.subreddits,
                keywords=job.keywords,
                time_filter=job.time_filter,
                sort_by=job.sort_by,
                post_limit=job.post_limit,
                include_comments=job.include_comments,
                progress=JobProgress(**(job.progress or {})),
                created_at=job.created_at,
                started_at=job.started_at,
                completed_at=job.completed_at,
                error_message=job.error_message,
            )
            for job in jobs
        ],
    )


@router.post("/{job_id}/pause")
async def pause_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Pause a running job."""
    
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in ("running", "pending"):
        raise HTTPException(status_code=400, detail="Job is not running or pending")
    
    job.status = "paused"
    await db.commit()
    
    return {"status": "paused", "job_id": str(job_id)}


@router.post("/{job_id}/resume")
async def resume_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Resume a paused job."""
    
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "paused":
        raise HTTPException(status_code=400, detail="Job is not paused")
    
    job.status = "running"
    await db.commit()
    
    # Resume background processing
    background_tasks.add_task(process_job, job.id, None)
    
    return {"status": "resumed", "job_id": str(job_id)}


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a running or pending job."""
    
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in ("running", "pending", "paused"):
        raise HTTPException(status_code=400, detail="Job is not active")
    
    job.status = "failed"
    job.error_message = "Cancelled by user"
    await db.commit()
    
    return {"status": "cancelled", "job_id": str(job_id)}


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a job and all associated data."""
    
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    await db.delete(job)
    await db.commit()
    
    return {"status": "deleted", "job_id": str(job_id)}
