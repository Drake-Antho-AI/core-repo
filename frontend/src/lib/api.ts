// API client for Reddit Sentiment Analyzer

// Use environment variable for API base, fallback to /api for local dev with proxy
const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface JobCreate {
  subreddits: string[]
  keywords: string[]
  time_filter: string
  sort_by: string
  post_limit: number
  include_comments: boolean
}

export interface JobProgress {
  current: number
  total: number
  step: string
  posts_found: number
}

export interface Job {
  id: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  subreddits: string[]
  keywords: string[]
  time_filter: string
  sort_by: string
  post_limit: number
  include_comments: boolean
  progress: JobProgress
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  estimated_time?: number
}

export interface Post {
  id: string
  job_id: string
  reddit_id: string
  title: string
  body: string | null
  subreddit: string
  author: string | null
  url: string
  score: number
  num_comments: number
  reddit_created_at: string
  matched_keyword: string | null
  sentiment: string | null
  sentiment_score: number | null
  pain_points: string[] | null
  feature_requests: string[] | null
  brands_mentioned: string[] | null
  user_type: string | null
  created_at: string
}

export interface ActionItem {
  id: string
  job_id: string
  title: string
  description: string
  category: 'product' | 'service' | 'marketing'
  priority: 'critical' | 'high' | 'medium' | 'low'
  impact_score: number | null
  effort_level: string | null
  timeline: string | null
  recommendations: string[]
  related_post_ids: string[] | null
  metrics: Record<string, number | string> | null
  created_at: string
}

export interface PostsResponse {
  total: number
  posts: Post[]
}

export interface ActionItemsResponse {
  total: number
  action_items: ActionItem[]
  summary: {
    total_items: number
    by_category: Record<string, number>
    by_priority: Record<string, number>
    avg_impact_score: number
  }
}

export interface PostStats {
  total_posts: number
  sentiment_breakdown: Record<string, number>
  avg_sentiment_score: number
  subreddit_counts: Record<string, number>
  top_pain_points: { text: string; count: number }[]
  top_feature_requests: { text: string; count: number }[]
  top_brands: { text: string; count: number }[]
}

// API functions
export async function createJob(data: JobCreate): Promise<Job> {
  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create job')
  return response.json()
}

export async function getJob(jobId: string): Promise<Job> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`)
  if (!response.ok) throw new Error('Failed to get job')
  return response.json()
}

export async function getJobs(limit = 10, offset = 0): Promise<{ total: number; jobs: Job[] }> {
  const response = await fetch(`${API_BASE}/jobs?limit=${limit}&offset=${offset}`)
  if (!response.ok) throw new Error('Failed to get jobs')
  return response.json()
}

export async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete job')
}

export async function cancelJob(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/cancel`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to cancel job')
}

export async function pauseJob(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/pause`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to pause job')
}

export async function resumeJob(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/resume`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to resume job')
}

export async function getPosts(
  jobId: string,
  params: {
    sentiment?: string[]
    subreddit?: string[]
    has_pain_points?: boolean
    has_feature_requests?: boolean
    search?: string
    sort_by?: string
    sort_order?: string
    limit?: number
    offset?: number
  } = {}
): Promise<PostsResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set('job_id', jobId)
  
  if (params.sentiment?.length) {
    params.sentiment.forEach(s => searchParams.append('sentiment', s))
  }
  if (params.subreddit?.length) {
    params.subreddit.forEach(s => searchParams.append('subreddit', s))
  }
  if (params.has_pain_points !== undefined) {
    searchParams.set('has_pain_points', String(params.has_pain_points))
  }
  if (params.has_feature_requests !== undefined) {
    searchParams.set('has_feature_requests', String(params.has_feature_requests))
  }
  if (params.search) searchParams.set('search', params.search)
  if (params.sort_by) searchParams.set('sort_by', params.sort_by)
  if (params.sort_order) searchParams.set('sort_order', params.sort_order)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const response = await fetch(`${API_BASE}/posts?${searchParams}`)
  if (!response.ok) throw new Error('Failed to get posts')
  return response.json()
}

export async function getPostStats(jobId: string): Promise<PostStats> {
  const response = await fetch(`${API_BASE}/posts/stats?job_id=${jobId}`)
  if (!response.ok) throw new Error('Failed to get stats')
  return response.json()
}

export async function getSubreddits(jobId: string): Promise<{ subreddits: { name: string; count: number }[] }> {
  const response = await fetch(`${API_BASE}/posts/subreddits?job_id=${jobId}`)
  if (!response.ok) throw new Error('Failed to get subreddits')
  return response.json()
}

export async function getActionItems(
  jobId: string,
  params: {
    category?: string[]
    priority?: string[]
    sort_by?: string
    sort_order?: string
  } = {}
): Promise<ActionItemsResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set('job_id', jobId)
  
  if (params.category?.length) {
    params.category.forEach(c => searchParams.append('category', c))
  }
  if (params.priority?.length) {
    params.priority.forEach(p => searchParams.append('priority', p))
  }
  if (params.sort_by) searchParams.set('sort_by', params.sort_by)
  if (params.sort_order) searchParams.set('sort_order', params.sort_order)

  const response = await fetch(`${API_BASE}/insights?${searchParams}`)
  if (!response.ok) throw new Error('Failed to get action items')
  return response.json()
}

export async function getExecutiveSummary(jobId: string): Promise<{
  job_id: string
  total_posts: number
  sentiment_breakdown: Record<string, number>
  positive_percentage: number
  negative_percentage: number
  action_items_by_priority: Record<string, number>
  critical_items: number
  high_priority_items: number
  completed_at: string | null
  subreddits_analyzed: string[]
  keywords_used: string[]
}> {
  const response = await fetch(`${API_BASE}/insights/summary/${jobId}`)
  if (!response.ok) throw new Error('Failed to get summary')
  return response.json()
}

export async function getRelatedPosts(itemId: string): Promise<{ posts: Post[] }> {
  const response = await fetch(`${API_BASE}/insights/${itemId}/related-posts`)
  if (!response.ok) throw new Error('Failed to get related posts')
  return response.json()
}

export async function chatWithInsights(jobId: string, message: string): Promise<{ response: string }> {
  const response = await fetch(`${API_BASE}/insights/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, message }),
  })
  if (!response.ok) throw new Error('Failed to get chat response')
  return response.json()
}

export async function validateSubreddit(subreddit: string): Promise<{ exists: boolean; subreddit: string }> {
  const response = await fetch(`${API_BASE}/reddit/validate/${encodeURIComponent(subreddit)}`)
  if (!response.ok) throw new Error('Failed to validate subreddit')
  return response.json()
}

