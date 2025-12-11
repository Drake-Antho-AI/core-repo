"""Reddit validation endpoints."""

import logging
import httpx
from fastapi import APIRouter

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/validate/{subreddit}")
async def validate_subreddit(subreddit: str):
    """
    Check if a subreddit exists and is public.
    
    Args:
        subreddit: Subreddit name (without r/)
        
    Returns:
        {"exists": bool, "subreddit": str}
    """
    if not subreddit or not subreddit.strip():
        return {"exists": False, "subreddit": subreddit}
    
    # Remove r/ prefix if present
    subreddit = subreddit.strip().lstrip("r/")
    
    if not subreddit:
        return {"exists": False, "subreddit": subreddit}
    
    try:
        url = f"https://www.reddit.com/r/{subreddit}/about.json"
        logger.info(f"Validating subreddit: {subreddit}")
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "RedditSentimentAnalyzer/1.0 (by /u/reddit-sentiment)",
                    "Accept": "application/json",
                },
            )
            
            logger.info(f"Reddit API response for r/{subreddit}: {response.status_code}")
            
            # Check status code
            if response.status_code == 404:
                return {
                    "exists": False,
                    "subreddit": subreddit,
                    "status": response.status_code,
                }
            
            # For 200, check the response body
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Valid subreddit should have data.display_name
                    subreddit_data = data.get("data", {})
                    if subreddit_data.get("display_name"):
                        # Also check if it's not banned/quarantined (optional - you might want to allow these)
                        return {
                            "exists": True,
                            "subreddit": subreddit,
                            "status": response.status_code,
                        }
                    else:
                        # Response is 200 but doesn't have valid subreddit data
                        logger.warning(f"Invalid response structure for r/{subreddit}")
                        return {
                            "exists": False,
                            "subreddit": subreddit,
                            "status": response.status_code,
                        }
                except Exception as e:
                    logger.error(f"Error parsing response for r/{subreddit}: {str(e)}")
                    return {
                        "exists": False,
                        "subreddit": subreddit,
                        "status": response.status_code,
                        "error": "invalid_response",
                    }
            
            # 403 = private/restricted, 429 = rate limited, etc.
            logger.warning(f"Unexpected status code {response.status_code} for r/{subreddit}")
            return {
                "exists": False,
                "subreddit": subreddit,
                "status": response.status_code,
            }
    except httpx.TimeoutException:
        logger.error(f"Timeout validating r/{subreddit}")
        return {"exists": False, "subreddit": subreddit, "error": "timeout"}
    except Exception as e:
        logger.error(f"Error validating r/{subreddit}: {str(e)}")
        return {"exists": False, "subreddit": subreddit, "error": str(e)}

