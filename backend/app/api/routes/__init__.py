"""API routes."""

from fastapi import APIRouter

from app.api.routes import jobs, posts, insights, health

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(insights.router, prefix="/insights", tags=["insights"])


