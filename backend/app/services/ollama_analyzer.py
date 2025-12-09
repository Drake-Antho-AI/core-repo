"""Ollama LLM integration for sentiment analysis."""

import asyncio
import json
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Number of concurrent LLM requests
CONCURRENT_REQUESTS = 3


class OllamaAnalyzer:
    """Sentiment analyzer using local Ollama LLM."""
    
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
    
    async def analyze_post(
        self,
        title: str,
        body: str,
        context: str = "construction equipment",
    ) -> dict[str, Any]:
        """
        Analyze a Reddit post using Ollama.
        
        Args:
            title: Post title
            body: Post body text
            context: Industry context for analysis
            
        Returns:
            Analysis results with sentiment, pain points, etc.
        """
        prompt = self._build_prompt(title, body, context)
        
        try:
            logger.info(f"🤖 LLM analyzing: {title[:50]}...")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                        "options": {
                            "temperature": 0.1,
                            "num_predict": 200,  # Reduced for speed
                            "num_ctx": 1024,     # Smaller context window
                        },
                    },
                )
                response.raise_for_status()
                result = response.json()
                
                # Parse the JSON response
                response_text = result.get("response", "{}")
                analysis = self._parse_response(response_text)
                
                logger.info(f"✅ LLM result: sentiment={analysis.get('sentiment')}, score={analysis.get('sentiment_score')}")
                return analysis
                
        except httpx.TimeoutException:
            logger.warning(f"⚠️ LLM timeout for: {title[:30]}... using fallback")
            return self._fallback_analysis(title, body)
        except httpx.RequestError as e:
            logger.error(f"❌ LLM request error: {str(e)}")
            return self._fallback_analysis(title, body)
        except Exception as e:
            logger.error(f"❌ LLM analysis error: {str(e)}")
            return self._fallback_analysis(title, body)
    
    def _build_prompt(self, title: str, body: str, context: str) -> str:
        """Build a concise analysis prompt for speed."""
        # Limit text length for faster processing
        text = f"{title}. {body[:500]}" if body else title
        
        return f"""Analyze this {context} post. Return JSON only:
"{text}"

{{"sentiment":"positive/slightly_positive/neutral/slightly_negative/negative","score":<-1 to 1>,"pain_points":[],"features":[],"brands":[],"summary":""}}"""
    
    def _parse_response(self, response_text: str) -> dict[str, Any]:
        """Parse and validate the LLM response."""
        try:
            # Try to parse as JSON
            analysis = json.loads(response_text)
            
            # Validate and normalize sentiment
            valid_sentiments = {
                "positive", "slightly_positive", "neutral",
                "slightly_negative", "negative"
            }
            sentiment = analysis.get("sentiment", "neutral").lower().replace(" ", "_")
            if sentiment not in valid_sentiments:
                sentiment = "neutral"
            
            # Normalize sentiment score (handle both "score" and "sentiment_score")
            score = analysis.get("score", analysis.get("sentiment_score", 0))
            if not isinstance(score, (int, float)):
                score = 0
            score = max(-1.0, min(1.0, float(score)))
            
            return {
                "sentiment": sentiment,
                "sentiment_score": score,
                "pain_points": analysis.get("pain_points", []) or [],
                "feature_requests": analysis.get("features", analysis.get("feature_requests", [])) or [],
                "brands_mentioned": analysis.get("brands", analysis.get("brands_mentioned", [])) or [],
                "user_type": analysis.get("user_type", "unknown"),
                "summary": analysis.get("summary", ""),
            }
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse Ollama response as JSON")
            return self._fallback_analysis("", "")
    
    def _fallback_analysis(self, title: str, body: str) -> dict[str, Any]:
        """Fallback keyword-based analysis when LLM fails."""
        text = (title + " " + body).lower()
        
        # Simple keyword-based sentiment
        positive_words = {
            "excellent", "amazing", "great", "fantastic", "love", "perfect",
            "best", "awesome", "outstanding", "superb", "wonderful", "impressed",
            "reliable", "efficient", "powerful", "smooth", "durable", "quality",
            "recommend", "happy", "satisfied", "worth", "solid", "sturdy"
        }
        negative_words = {
            "terrible", "awful", "horrible", "worst", "hate", "useless",
            "broken", "failure", "waste", "trash", "garbage", "nightmare",
            "disaster", "poor", "unreliable", "disappointed", "regret", "avoid"
        }
        
        pos_count = sum(1 for word in positive_words if word in text)
        neg_count = sum(1 for word in negative_words if word in text)
        
        if pos_count > neg_count + 2:
            sentiment = "positive"
            score = 0.7
        elif pos_count > neg_count:
            sentiment = "slightly_positive"
            score = 0.3
        elif neg_count > pos_count + 2:
            sentiment = "negative"
            score = -0.7
        elif neg_count > pos_count:
            sentiment = "slightly_negative"
            score = -0.3
        else:
            sentiment = "neutral"
            score = 0.0
        
        # Extract mentioned brands
        brands = []
        brand_keywords = ["toro", "bobcat", "caterpillar", "deere", "kubota", "ditch witch"]
        for brand in brand_keywords:
            if brand in text:
                brands.append(brand.title())
        
        return {
            "sentiment": sentiment,
            "sentiment_score": score,
            "pain_points": [],
            "feature_requests": [],
            "brands_mentioned": brands,
            "user_type": "unknown",
            "summary": "",
        }
    
    async def check_health(self) -> bool:
        """Check if Ollama is available."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False
    
    async def analyze_batch(
        self,
        posts: list[dict[str, Any]],
        context: str = "construction equipment",
    ) -> list[dict[str, Any]]:
        """
        Analyze multiple posts concurrently for speed.
        """
        semaphore = asyncio.Semaphore(CONCURRENT_REQUESTS)
        
        async def analyze_with_limit(post: dict[str, Any]) -> dict[str, Any]:
            async with semaphore:
                return await self.analyze_post(
                    title=post.get("title", ""),
                    body=post.get("body", ""),
                    context=context,
                )
        
        # Process all posts concurrently (limited by semaphore)
        tasks = [analyze_with_limit(post) for post in posts]
        results = await asyncio.gather(*tasks)
        return list(results)


# Singleton instance
ollama_analyzer = OllamaAnalyzer()

