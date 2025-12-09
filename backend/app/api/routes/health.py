"""Health check endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.services.ollama_analyzer import ollama_analyzer

router = APIRouter()


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Check health of all services."""
    
    # Check database
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"
    
    # Check Ollama
    ollama_status = "healthy" if await ollama_analyzer.check_health() else "unhealthy"
    
    # Overall status
    all_healthy = db_status == "healthy" and ollama_status == "healthy"
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "database": db_status,
        "ollama": ollama_status,
    }


