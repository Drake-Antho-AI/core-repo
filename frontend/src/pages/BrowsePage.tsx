import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, Filter, ExternalLink, MessageSquare,
  Lightbulb, Download, X
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Badge } from '@/components/ui/Badge'
import { getPosts, getPostStats, getSubreddits, Post } from '@/lib/api'
import { 
  getSentimentEmoji, getSentimentBgColor,
  formatRelativeTime, truncate 
} from '@/lib/utils'

const SENTIMENTS = [
  { value: 'positive', label: 'Positive', emoji: '😄' },
  { value: 'slightly_positive', label: 'Slightly Positive', emoji: '🙂' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'slightly_negative', label: 'Slightly Negative', emoji: '🙁' },
  { value: 'negative', label: 'Negative', emoji: '😠' },
]

const SORT_OPTIONS = [
  { value: 'reddit_created_at', label: 'Most Recent' },
  { value: 'score', label: 'Highest Score' },
  { value: 'num_comments', label: 'Most Comments' },
  { value: 'sentiment_score', label: 'Sentiment Score' },
]

export function BrowsePage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>(SENTIMENTS.map(s => s.value))
  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>([])
  const [hasPainPoints, setHasPainPoints] = useState<boolean | undefined>()
  const [hasFeatureRequests, setHasFeatureRequests] = useState<boolean | undefined>()
  const [sortBy, setSortBy] = useState('reddit_created_at')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(0)
  const limit = 20

  // Fetch posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['posts', jobId, selectedSentiments, selectedSubreddits, hasPainPoints, hasFeatureRequests, search, sortBy, sortOrder, page],
    queryFn: () => getPosts(jobId!, {
      sentiment: selectedSentiments.length < 5 ? selectedSentiments : undefined,
      subreddit: selectedSubreddits.length > 0 ? selectedSubreddits : undefined,
      has_pain_points: hasPainPoints,
      has_feature_requests: hasFeatureRequests,
      search: search || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      limit,
      offset: page * limit,
    }),
    enabled: !!jobId,
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['postStats', jobId],
    queryFn: () => getPostStats(jobId!),
    enabled: !!jobId,
  })

  // Fetch subreddits
  const { data: subredditsData } = useQuery({
    queryKey: ['subreddits', jobId],
    queryFn: () => getSubreddits(jobId!),
    enabled: !!jobId,
  })

  const toggleSentiment = (sentiment: string) => {
    setSelectedSentiments(prev => 
      prev.includes(sentiment)
        ? prev.filter(s => s !== sentiment)
        : [...prev, sentiment]
    )
    setPage(0)
  }

  const toggleSubreddit = (sub: string) => {
    setSelectedSubreddits(prev =>
      prev.includes(sub)
        ? prev.filter(s => s !== sub)
        : [...prev, sub]
    )
    setPage(0)
  }

  const clearFilters = () => {
    setSelectedSentiments(SENTIMENTS.map(s => s.value))
    setSelectedSubreddits([])
    setHasPainPoints(undefined)
    setHasFeatureRequests(undefined)
    setSearch('')
    setPage(0)
  }

  const hasActiveFilters = selectedSentiments.length < 5 || selectedSubreddits.length > 0 || 
    hasPainPoints !== undefined || hasFeatureRequests !== undefined || search

  const handleExportCSV = async () => {
    if (!postsData?.posts.length) return
    
    try {
      // Fetch all posts for export (not just current page)
      const allPostsData = await getPosts(jobId!, { limit: 5000 })
      const posts = allPostsData.posts
    
    // Create CSV content
    const headers = ['Title', 'Subreddit', 'Author', 'URL', 'Score', 'Comments', 'Date', 'Sentiment', 'Sentiment Score', 'Pain Points', 'Feature Requests', 'Brands Mentioned']
    const rows = posts.map(post => [
      `"${(post.title || '').replace(/"/g, '""')}"`,
      post.subreddit,
      post.author || '',
      post.url,
      post.score,
      post.num_comments,
      new Date(post.reddit_created_at).toISOString().split('T')[0],
      post.sentiment || '',
      post.sentiment_score?.toFixed(2) || '',
      `"${(post.pain_points || []).join('; ').replace(/"/g, '""')}"`,
      `"${(post.feature_requests || []).join('; ').replace(/"/g, '""')}"`,
      `"${(post.brands_mentioned || []).join('; ').replace(/"/g, '""')}"`,
    ])
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    
    // Download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reddit-sentiment-${jobId}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Browse Posts
          </h1>
          <p className="text-white/60">
            {postsData?.total ?? 0} posts analyzed
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={() => navigate(`/insights/${jobId}`)}>
            <Lightbulb className="w-4 h-4" />
            View Insights
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-8">
          {SENTIMENTS.map(sentiment => {
            const count = stats.sentiment_breakdown[sentiment.value] || 0
            const percent = stats.total_posts > 0 
              ? Math.round((count / stats.total_posts) * 100) 
              : 0
            return (
              <button
                key={sentiment.value}
                onClick={() => {
                  setSelectedSentiments([sentiment.value])
                  setPage(0)
                }}
                className={`glass rounded-xl p-4 text-center hover:bg-white/10 transition-colors ${
                  selectedSentiments.length === 1 && selectedSentiments[0] === sentiment.value
                    ? 'ring-2 ring-accent-teal'
                    : ''
                }`}
              >
                <div className="text-2xl mb-1">{sentiment.emoji}</div>
                <div className="text-2xl font-bold text-white">{count}</div>
                <div className="text-xs text-white/50">{percent}%</div>
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="space-y-6">
          {/* Search */}
          <Card>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search posts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent-teal/50"
              />
            </div>
          </Card>

          {/* Sentiment Filter */}
          <Card>
            <h3 className="text-sm font-medium text-white/80 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Sentiment
            </h3>
            <div className="space-y-2">
              {SENTIMENTS.map(sentiment => (
                <Checkbox
                  key={sentiment.value}
                  label={`${sentiment.emoji} ${sentiment.label}`}
                  checked={selectedSentiments.includes(sentiment.value)}
                  onChange={() => toggleSentiment(sentiment.value)}
                />
              ))}
            </div>
          </Card>

          {/* Subreddit Filter */}
          {subredditsData && subredditsData.subreddits.length > 0 && (
            <Card>
              <h3 className="text-sm font-medium text-white/80 mb-4">Subreddit</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {subredditsData.subreddits.map(({ name, count }) => (
                  <Checkbox
                    key={name}
                    label={`r/${name} (${count})`}
                    checked={selectedSubreddits.includes(name)}
                    onChange={() => toggleSubreddit(name)}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Content Type Filter */}
          <Card>
            <h3 className="text-sm font-medium text-white/80 mb-4">Content Type</h3>
            <div className="space-y-2">
              <Checkbox
                label="Has Pain Points"
                checked={hasPainPoints === true}
                onChange={() => setHasPainPoints(hasPainPoints === true ? undefined : true)}
              />
              <Checkbox
                label="Has Feature Requests"
                checked={hasFeatureRequests === true}
                onChange={() => setHasFeatureRequests(hasFeatureRequests === true ? undefined : true)}
              />
            </div>
          </Card>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" className="w-full" onClick={clearFilters}>
              <X className="w-4 h-4" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Posts List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Sort Controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">
              Showing {postsData?.posts.length ?? 0} of {postsData?.total ?? 0} posts
            </p>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value)
                  setPage(0)
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-navy-900">
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors"
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>

          {/* Posts */}
          {postsLoading ? (
            <div className="text-center py-12 text-white/50">Loading posts...</div>
          ) : postsData?.posts.length === 0 ? (
            <div className="text-center py-12 text-white/50">No posts match your filters</div>
          ) : (
            <>
              {postsData?.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}

              {/* Pagination */}
              {postsData && postsData.total > limit && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    variant="ghost"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-white/60">
                    Page {page + 1} of {Math.ceil(postsData.total / limit)}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={(page + 1) * limit >= postsData.total}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PostCard({ post }: { post: Post }) {
  return (
    <Card hover className="group">
      <div className="flex gap-4">
        {/* Sentiment Indicator */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">{getSentimentEmoji(post.sentiment)}</span>
          <div className={`w-1 flex-1 rounded-full ${getSentimentBgColor(post.sentiment)}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-white group-hover:text-accent-teal transition-colors line-clamp-2">
                {post.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-white/50">
                <span className="text-accent-teal">r/{post.subreddit}</span>
                <span>↑ {post.score}</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {post.num_comments}
                </span>
                <span>{formatRelativeTime(post.reddit_created_at)}</span>
              </div>
            </div>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-white/40" />
            </a>
          </div>

          {/* Preview */}
          {post.body && (
            <p className="mt-3 text-sm text-white/60 line-clamp-2">
              {truncate(post.body, 200)}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {post.pain_points?.slice(0, 2).map((pp, i) => (
              <Badge key={i} variant="error">
                Pain: {truncate(pp, 30)}
              </Badge>
            ))}
            {post.feature_requests?.slice(0, 2).map((fr, i) => (
              <Badge key={i} variant="info">
                Feature: {truncate(fr, 30)}
              </Badge>
            ))}
            {post.brands_mentioned?.map((brand, i) => (
              <Badge key={i} variant="default">
                {brand}
              </Badge>
            ))}
            {post.matched_keyword && (
              <Badge variant="success">
                🔍 {post.matched_keyword}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

