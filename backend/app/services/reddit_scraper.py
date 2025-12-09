"""Async Reddit scraper with rate limiting."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedditScraper:
    """Async Reddit scraper using public JSON endpoints."""
    
    BASE_URL = "https://www.reddit.com"
    
    def __init__(self):
        self.headers = {
            "User-Agent": settings.reddit_user_agent,
            "Accept": "application/json",
        }
        self.rate_limit_delay = settings.reddit_rate_limit_delay
        self._last_request_time: float = 0
    
    async def _rate_limit(self):
        """Enforce rate limiting between requests."""
        now = asyncio.get_event_loop().time()
        elapsed = now - self._last_request_time
        if elapsed < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - elapsed)
        self._last_request_time = asyncio.get_event_loop().time()
    
    async def search(
        self,
        subreddit: str,
        keyword: str,
        time_filter: str = "year",
        sort: str = "relevance",
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """
        Search a subreddit for posts matching a keyword.
        
        Args:
            subreddit: Subreddit name (without r/)
            keyword: Search keyword
            time_filter: Time range (hour, day, week, month, year, all)
            sort: Sort method (relevance, hot, top, new, comments)
            limit: Maximum posts to return
            
        Returns:
            List of post data dictionaries
        """
        await self._rate_limit()
        
        url = f"{self.BASE_URL}/search.json"
        params = {
            "q": f"{keyword} subreddit:{subreddit}",
            "sort": sort,
            "t": time_filter,
            "limit": min(limit, 100),  # Reddit max is 100
            "type": "link",
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    params=params,
                )
                
                if response.status_code == 429:
                    logger.warning(f"Rate limited. Waiting 10 seconds...")
                    await asyncio.sleep(10)
                    # Retry once
                    response = await client.get(
                        url,
                        headers=self.headers,
                        params=params,
                    )
                
                response.raise_for_status()
                data = response.json()
                
                posts = []
                if "data" in data and "children" in data["data"]:
                    for child in data["data"]["children"]:
                        post_data = child.get("data", {})
                        posts.append(self._parse_post(post_data, keyword))
                
                logger.info(
                    f"Found {len(posts)} posts for '{keyword}' in r/{subreddit}"
                )
                return posts
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error for r/{subreddit}: {e.response.status_code}")
            return []
        except httpx.RequestError as e:
            logger.error(f"Request error for r/{subreddit}: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error for r/{subreddit}: {str(e)}")
            return []
    
    def _parse_post(self, post_data: dict, keyword: str) -> dict[str, Any]:
        """Parse Reddit post data into standardized format."""
        created_utc = post_data.get("created_utc", 0)
        created_at = datetime.fromtimestamp(created_utc, tz=timezone.utc)
        
        return {
            "reddit_id": post_data.get("id", ""),
            "title": post_data.get("title", ""),
            "body": post_data.get("selftext", ""),
            "subreddit": post_data.get("subreddit", ""),
            "author": post_data.get("author", "[deleted]"),
            "url": f"https://www.reddit.com{post_data.get('permalink', '')}",
            "score": post_data.get("score", 0),
            "num_comments": post_data.get("num_comments", 0),
            "reddit_created_at": created_at,
            "matched_keyword": keyword,
        }
    
    async def get_comments(
        self,
        reddit_id: str,
        subreddit: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """
        Fetch top comments for a post.
        
        Args:
            reddit_id: Reddit post ID
            subreddit: Subreddit name
            limit: Maximum comments to return
            
        Returns:
            List of comment data dictionaries
        """
        await self._rate_limit()
        
        url = f"{self.BASE_URL}/r/{subreddit}/comments/{reddit_id}.json"
        params = {
            "limit": min(limit, 100),
            "sort": "best",
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    params=params,
                )
                response.raise_for_status()
                data = response.json()
                
                comments = []
                if len(data) > 1 and "data" in data[1]:
                    children = data[1]["data"].get("children", [])
                    for child in children:
                        if child.get("kind") == "t1":
                            comment_data = child.get("data", {})
                            comments.append(self._parse_comment(comment_data))
                
                return comments[:limit]
                
        except Exception as e:
            logger.error(f"Error fetching comments for {reddit_id}: {str(e)}")
            return []
    
    def _parse_comment(self, comment_data: dict) -> dict[str, Any]:
        """Parse Reddit comment data into standardized format."""
        created_utc = comment_data.get("created_utc", 0)
        created_at = datetime.fromtimestamp(created_utc, tz=timezone.utc)
        
        return {
            "reddit_id": comment_data.get("id", ""),
            "body": comment_data.get("body", ""),
            "author": comment_data.get("author", "[deleted]"),
            "score": comment_data.get("score", 0),
            "reddit_created_at": created_at,
        }


# Singleton instance
reddit_scraper = RedditScraper()


