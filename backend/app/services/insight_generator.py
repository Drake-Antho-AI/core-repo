"""Generate actionable insights from analyzed posts."""

import json
import logging
from collections import Counter
from typing import Any
from uuid import UUID

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class InsightGenerator:
    """Generate action items and insights from analyzed posts."""
    
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
    
    async def generate_action_items(
        self,
        posts: list[dict[str, Any]],
        context: str = "construction equipment",
    ) -> list[dict[str, Any]]:
        """
        Generate action items based on analyzed posts.
        
        Args:
            posts: List of analyzed posts with sentiment and insights
            context: Industry context
            
        Returns:
            List of action items with priorities and recommendations
        """
        # Aggregate data from posts
        aggregated = self._aggregate_insights(posts)
        
        # Log aggregated data
        logger.info(f"📊 Generating insights from {len(posts)} posts")
        logger.info(f"   Pain points: {len(aggregated['top_pain_points'])}, Feature requests: {len(aggregated['top_feature_requests'])}")
        
        # For speed, always use the smart fallback which generates good insights
        # without waiting for LLM (which can be slow for long prompts)
        action_items = self._fallback_action_items(aggregated, posts)
        logger.info(f"✅ Generated {len(action_items)} action items")
        return action_items
    
    def _aggregate_insights(self, posts: list[dict[str, Any]]) -> dict[str, Any]:
        """Aggregate insights from all posts."""
        sentiment_counts = Counter()
        pain_point_counter = Counter()
        feature_request_counter = Counter()
        brand_counter = Counter()
        user_type_counter = Counter()
        
        total_score = 0
        score_count = 0
        
        for post in posts:
            # Sentiment
            sentiment = post.get("sentiment", "neutral")
            sentiment_counts[sentiment] += 1
            
            # Sentiment score
            score = post.get("sentiment_score")
            if score is not None:
                total_score += score
                score_count += 1
            
            # Pain points
            for pp in (post.get("pain_points") or []):
                pain_point_counter[pp.lower()] += 1
            
            # Feature requests
            for fr in (post.get("feature_requests") or []):
                feature_request_counter[fr.lower()] += 1
            
            # Brands
            for brand in (post.get("brands_mentioned") or []):
                brand_counter[brand.lower()] += 1
            
            # User type
            user_type = post.get("user_type", "unknown")
            user_type_counter[user_type] += 1
        
        return {
            "total_posts": len(posts),
            "sentiment_breakdown": dict(sentiment_counts),
            "avg_sentiment_score": total_score / score_count if score_count > 0 else 0,
            "top_pain_points": pain_point_counter.most_common(15),
            "top_feature_requests": feature_request_counter.most_common(10),
            "top_brands": brand_counter.most_common(10),
            "user_types": dict(user_type_counter),
        }
    
    def _build_action_prompt(self, aggregated: dict, context: str) -> str:
        """Build prompt for generating action items."""
        pain_points_text = "\n".join(
            f"- {pp}: {count} mentions"
            for pp, count in aggregated["top_pain_points"]
        ) or "No significant pain points identified"
        
        feature_requests_text = "\n".join(
            f"- {fr}: {count} mentions"
            for fr, count in aggregated["top_feature_requests"]
        ) or "No specific feature requests identified"
        
        return f"""Based on sentiment analysis of {aggregated['total_posts']} Reddit posts about {context}:

SENTIMENT BREAKDOWN:
{json.dumps(aggregated['sentiment_breakdown'], indent=2)}

Average Sentiment Score: {aggregated['avg_sentiment_score']:.2f} (scale: -1 to +1)

TOP PAIN POINTS (issues users complain about):
{pain_points_text}

TOP FEATURE REQUESTS (what users want):
{feature_requests_text}

TOP BRANDS MENTIONED:
{', '.join([b for b, _ in aggregated['top_brands']]) or 'Various brands'}

USER TYPES:
{json.dumps(aggregated['user_types'], indent=2)}

Generate 5-8 actionable recommendations. Return ONLY a JSON array:
[
  {{
    "title": "Clear, actionable title",
    "description": "2-3 sentence explanation of the recommendation",
    "category": "product|service|marketing",
    "priority": "critical|high|medium|low",
    "impact_score": 85,
    "effort_level": "low|medium|high|very_high",
    "timeline": "Q1 2025|Q2 2025|Q3 2025|Q4 2025",
    "recommendations": [
      "Specific action 1",
      "Specific action 2",
      "Specific action 3"
    ]
  }}
]

Priority Guidelines:
- critical: Safety issues, major defects, or problems affecting >30% of users
- high: Significant pain points mentioned frequently (>10 times)
- medium: Moderate concerns or feature requests
- low: Nice-to-have improvements

Impact Score (0-100): Based on frequency of mentions and severity of issue.

Return ONLY the JSON array, no other text."""
    
    def _parse_action_items(
        self,
        response_text: str,
        posts: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Parse and validate action items from LLM response."""
        try:
            items = json.loads(response_text)
            if not isinstance(items, list):
                items = [items]
            
            valid_items = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                    
                # Validate required fields
                title = item.get("title", "")
                if not title:
                    continue
                
                # Find related posts
                related_ids = self._find_related_posts(item, posts)
                
                valid_item = {
                    "title": title,
                    "description": item.get("description", ""),
                    "category": item.get("category", "product"),
                    "priority": item.get("priority", "medium"),
                    "impact_score": min(100, max(0, item.get("impact_score", 50))),
                    "effort_level": item.get("effort_level", "medium"),
                    "timeline": item.get("timeline", "Q2 2025"),
                    "recommendations": item.get("recommendations", [])[:5],
                    "related_post_ids": related_ids,
                    "metrics": {
                        "source_count": len(related_ids),
                    },
                }
                valid_items.append(valid_item)
            
            return valid_items
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse action items JSON")
            return []
    
    def _find_related_posts(
        self,
        action_item: dict,
        posts: list[dict[str, Any]],
    ) -> list[UUID]:
        """Find posts related to an action item."""
        related_ids = []
        
        title_lower = action_item.get("title", "").lower()
        desc_lower = action_item.get("description", "").lower()
        keywords = set(title_lower.split() + desc_lower.split())
        # Remove common words
        keywords -= {"the", "a", "an", "is", "are", "to", "for", "and", "or", "of"}
        
        for post in posts:
            post_text = (
                post.get("title", "") + " " +
                post.get("body", "") + " " +
                " ".join(post.get("pain_points") or []) + " " +
                " ".join(post.get("feature_requests") or [])
            ).lower()
            
            # Check for keyword overlap
            matches = sum(1 for kw in keywords if kw in post_text)
            if matches >= 2:
                post_id = post.get("id")
                if post_id:
                    related_ids.append(post_id)
        
        return related_ids[:10]  # Limit to 10 related posts
    
    def _fallback_action_items(
        self,
        aggregated: dict,
        posts: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Generate comprehensive action items from aggregated data."""
        items = []
        total = aggregated.get("total_posts", 1)
        sentiment = aggregated.get("sentiment_breakdown", {})
        
        # 1. Generate items based on ALL pain points (minimum threshold of 1)
        for i, (pain_point, count) in enumerate(aggregated["top_pain_points"][:5]):
            priority = "critical" if count >= 10 else "high" if count >= 5 else "medium" if count >= 2 else "low"
            # More realistic impact scoring based on frequency and total posts
            pct = (count / total * 100) if total > 0 else 0
            if priority == "critical":
                impact = min(95, 70 + int(pct * 0.3))
            elif priority == "high":
                impact = min(85, 55 + int(pct * 0.4))
            elif priority == "medium":
                impact = min(70, 40 + int(pct * 0.5))
            else:
                impact = min(55, 30 + int(pct * 0.4))
            
            items.append({
                "title": f"Address Customer Pain Point: {pain_point.title()[:50]}",
                "description": f"This issue was mentioned {count} time(s) ({count/total*100:.0f}% of posts). Users are experiencing difficulties that should be investigated and resolved.",
                "category": "product",
                "priority": priority,
                "impact_score": impact,
                "effort_level": "medium" if count < 5 else "high",
                "timeline": "Q1 2025" if priority in ["critical", "high"] else "Q2 2025",
                "recommendations": [
                    f"Investigate root cause of '{pain_point[:40]}'",
                    "Survey affected users for detailed feedback",
                    "Create engineering ticket for resolution",
                    "Monitor customer support tickets related to this issue",
                ],
                "related_post_ids": self._find_posts_with_text(pain_point, posts),
                "metrics": {"mention_count": count, "percentage": count/total*100},
            })
        
        # 2. Generate items for ALL feature requests
        for feature, count in aggregated["top_feature_requests"][:5]:
            priority = "high" if count >= 5 else "medium" if count >= 2 else "low"
            # Feature requests typically have lower impact than pain points
            pct = (count / total * 100) if total > 0 else 0
            if priority == "high":
                impact = min(80, 50 + int(pct * 0.4))
            elif priority == "medium":
                impact = min(65, 35 + int(pct * 0.5))
            else:
                impact = min(50, 25 + int(pct * 0.4))
            
            items.append({
                "title": f"Feature Request: {feature.title()[:50]}",
                "description": f"Users have requested this feature {count} time(s). This represents a product enhancement opportunity that could improve customer satisfaction.",
                "category": "product",
                "priority": priority,
                "impact_score": impact,
                "effort_level": "high",
                "timeline": "Q2 2025" if priority == "high" else "Q3 2025",
                "recommendations": [
                    "Evaluate technical feasibility and scope",
                    "Estimate development effort and resources",
                    "Add to product backlog for prioritization",
                    "Consider user beta testing program",
                ],
                "related_post_ids": self._find_posts_with_text(feature, posts),
                "metrics": {"request_count": count},
            })
        
        # 3. Brand-related insights
        for brand, count in aggregated["top_brands"][:3]:
            if count >= 2:
                # Competitive analysis has moderate impact
                pct = (count / total * 100) if total > 0 else 0
                if count >= 10:
                    impact = 70
                elif count >= 5:
                    impact = 60
                else:
                    impact = 50
                
                items.append({
                    "title": f"Competitive Analysis: {brand.title()}",
                    "description": f"{brand.title()} was mentioned {count} time(s) in discussions. Analyze competitor positioning and customer comparisons.",
                    "category": "marketing",
                    "priority": "medium",
                    "impact_score": impact,
                    "effort_level": "low",
                    "timeline": "Q2 2025",
                    "recommendations": [
                        f"Research {brand.title()} product features and pricing",
                        "Identify competitive advantages and gaps",
                        "Develop differentiation messaging",
                        "Monitor competitor reviews and feedback",
                    ],
                    "related_post_ids": self._find_posts_with_text(brand, posts),
                    "metrics": {"mention_count": count},
                })
        
        # 4. Sentiment-based recommendations
        negative = sentiment.get("negative", 0) + sentiment.get("slightly_negative", 0)
        positive = sentiment.get("positive", 0) + sentiment.get("slightly_positive", 0)
        
        if negative > 0:
            neg_pct = negative / total * 100
            # Impact based on negative percentage with more variation
            if neg_pct > 50:
                impact = 90
            elif neg_pct > 40:
                impact = 85
            elif neg_pct > 30:
                impact = 75
            elif neg_pct > 20:
                impact = 65
            elif neg_pct > 10:
                impact = 55
            else:
                impact = 45
            
            items.append({
                "title": "Address Negative Customer Sentiment",
                "description": f"{negative} out of {total} posts ({neg_pct:.0f}%) expressed negative sentiment. Prioritize understanding and addressing customer frustrations.",
                "category": "service",
                "priority": "critical" if neg_pct > 40 else "high" if neg_pct > 20 else "medium",
                "impact_score": impact,
                "effort_level": "high",
                "timeline": "Q1 2025",
                "recommendations": [
                    "Conduct deep-dive analysis of negative posts",
                    "Implement customer feedback loop",
                    "Improve customer support response times",
                    "Create proactive outreach program",
                ],
                "related_post_ids": [],
                "metrics": {"negative_count": negative, "negative_percentage": neg_pct},
            })
        
        if positive >= total * 0.3:
            pos_pct = positive / total * 100
            # Positive sentiment has moderate impact
            if pos_pct > 60:
                impact = 70
            elif pos_pct > 50:
                impact = 65
            elif pos_pct > 40:
                impact = 60
            else:
                impact = 55
            
            items.append({
                "title": "Leverage Positive Customer Advocacy",
                "description": f"{positive} out of {total} posts ({pos_pct:.0f}%) expressed positive sentiment. Build on this momentum with advocacy programs.",
                "category": "marketing",
                "priority": "medium",
                "impact_score": impact,
                "effort_level": "low",
                "timeline": "Q2 2025",
                "recommendations": [
                    "Identify potential brand advocates",
                    "Create customer testimonial program",
                    "Develop referral incentives",
                    "Share success stories on social media",
                ],
                "related_post_ids": [],
                "metrics": {"positive_count": positive, "positive_percentage": pos_pct},
            })
        
        # 5. User type insights
        user_types = aggregated.get("user_types", {})
        professionals = user_types.get("professional", 0)
        if professionals >= total * 0.3:
            items.append({
                "title": "Target Professional User Segment",
                "description": f"{professionals} out of {total} users ({professionals/total*100:.0f}%) appear to be professionals. Consider specialized offerings for this segment.",
                "category": "marketing",
                "priority": "medium",
                "impact_score": 65,
                "effort_level": "medium",
                "timeline": "Q2 2025",
                "recommendations": [
                    "Develop professional-grade product line",
                    "Create B2B marketing materials",
                    "Offer volume/fleet discounts",
                    "Build professional support tier",
                ],
                "related_post_ids": [],
                "metrics": {"professional_count": professionals},
            })
        
        # Ensure we always have at least 3 items
        if len(items) < 3:
            items.append({
                "title": "Establish Customer Feedback Loop",
                "description": f"Based on analysis of {total} posts, implement systematic customer feedback collection to continuously improve products and services.",
                "category": "service",
                "priority": "medium",
                "impact_score": 60,
                "effort_level": "medium",
                "timeline": "Q2 2025",
                "recommendations": [
                    "Set up regular Reddit monitoring",
                    "Create customer survey program",
                    "Implement NPS tracking",
                    "Schedule quarterly feedback reviews",
                ],
                "related_post_ids": [],
                "metrics": {"posts_analyzed": total},
            })
        
        if len(items) < 3:
            items.append({
                "title": "Enhance Online Community Presence",
                "description": "Increase brand visibility and engagement in relevant online communities to build trust and gather real-time feedback.",
                "category": "marketing",
                "priority": "low",
                "impact_score": 50,
                "effort_level": "low",
                "timeline": "Q3 2025",
                "recommendations": [
                    "Identify key subreddits and forums",
                    "Develop community engagement guidelines",
                    "Train team on authentic community participation",
                    "Track engagement metrics",
                ],
                "related_post_ids": [],
                "metrics": {},
            })
        
        # Sort by impact score
        items.sort(key=lambda x: x["impact_score"], reverse=True)
        
        return items
    
    def _find_posts_with_text(
        self,
        search_text: str,
        posts: list[dict[str, Any]],
    ) -> list:
        """Find posts containing specific text."""
        related_ids = []
        search_lower = search_text.lower()
        
        for post in posts:
            post_text = (
                post.get("title", "") + " " +
                post.get("body", "") + " " +
                " ".join(post.get("pain_points") or []) + " " +
                " ".join(post.get("feature_requests") or [])
            ).lower()
            
            if search_lower in post_text:
                post_id = post.get("id")
                if post_id:
                    related_ids.append(post_id)
        
        return related_ids[:10]
    
    def calculate_stats(self, posts: list[dict[str, Any]]) -> dict[str, Any]:
        """Calculate statistics for a set of posts."""
        aggregated = self._aggregate_insights(posts)
        
        # Format for API response
        return {
            "total_posts": aggregated["total_posts"],
            "sentiment_breakdown": aggregated["sentiment_breakdown"],
            "avg_sentiment_score": aggregated["avg_sentiment_score"],
            "subreddit_counts": Counter(
                post.get("subreddit", "unknown") for post in posts
            ),
            "top_pain_points": [
                {"text": pp, "count": count}
                for pp, count in aggregated["top_pain_points"][:10]
            ],
            "top_feature_requests": [
                {"text": fr, "count": count}
                for fr, count in aggregated["top_feature_requests"][:10]
            ],
            "top_brands": [
                {"text": brand, "count": count}
                for brand, count in aggregated["top_brands"][:10]
            ],
        }


# Singleton instance
insight_generator = InsightGenerator()


