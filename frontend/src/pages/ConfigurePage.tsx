import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Search, Clock, ArrowRight, Sparkles, Target, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { TagInput } from '@/components/TagInput'
import { createJob, JobCreate } from '@/lib/api'
import { formatDuration } from '@/lib/utils'

const SUGGESTED_SUBREDDITS = [
  'Landscaping',
  'Construction',
  'heavyequipment',
  'Bobcat',
  'skidsteer',
  'CompactTractors',
  'lawncare',
]

const SUGGESTED_KEYWORDS = [
  'Toro',
  'Bobcat',
  'Mini skid steer',
  'Compact loader',
  'Dingo',
  'Caterpillar',
  'Kubota',
]

const TIME_FILTERS = [
  { value: 'day', label: 'Past 24 Hours' },
  { value: 'week', label: 'Past Week' },
  { value: 'month', label: 'Past Month' },
  { value: 'year', label: 'Past Year' },
  { value: 'all', label: 'All Time' },
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'hot', label: 'Hot' },
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'Newest' },
  { value: 'comments', label: 'Most Comments' },
]

const POST_LIMITS = [
  { value: '25', label: '25 posts per search' },
  { value: '50', label: '50 posts per search' },
  { value: '75', label: '75 posts per search' },
  { value: '100', label: '100 posts per search' },
]

export function ConfigurePage() {
  const navigate = useNavigate()
  
  const [subreddits, setSubreddits] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [timeFilter, setTimeFilter] = useState('year')
  const [sortBy, setSortBy] = useState('relevance')
  const [postLimit, setPostLimit] = useState('50')
  const [includeComments, setIncludeComments] = useState(true)

  const createJobMutation = useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      navigate(`/processing/${job.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data: JobCreate = {
      subreddits,
      keywords,
      time_filter: timeFilter,
      sort_by: sortBy,
      post_limit: parseInt(postLimit),
      include_comments: includeComments,
    }
    
    createJobMutation.mutate(data)
  }

  // Estimate calculations
  const totalSearches = subreddits.length * keywords.length
  const estimatedPosts = totalSearches * parseInt(postLimit) * 0.5 // Assume 50% unique
  const estimatedTime = (totalSearches * 3) + (estimatedPosts * 2) // 3s per search + 2s per post

  const isValid = subreddits.length > 0 && keywords.length > 0

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-lime/10 text-accent-lime text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          AI-Powered Social Listening
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
          Reddit Sentiment Analyzer
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Transform Reddit discussions into actionable insights. Analyze customer sentiment, 
          identify pain points, and discover opportunities.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Target Audience */}
            <Card className="animate-fade-in animate-delay-100">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent-teal" />
                Target Audience
              </CardTitle>
              <CardDescription>
                Define which communities and topics to analyze
              </CardDescription>
              <CardContent className="mt-6 space-y-6">
                <TagInput
                  label="Subreddits"
                  placeholder="e.g., Landscaping, Construction..."
                  tags={subreddits}
                  onChange={setSubreddits}
                  maxTags={10}
                  suggestions={SUGGESTED_SUBREDDITS}
                  validateSubreddit={true}
                />
                <TagInput
                  label="Keywords / Brands"
                  placeholder="e.g., Toro, Mini skid steer..."
                  tags={keywords}
                  onChange={setKeywords}
                  maxTags={10}
                  suggestions={SUGGESTED_KEYWORDS}
                />
              </CardContent>
            </Card>

            {/* Search Parameters */}
            <Card className="animate-fade-in animate-delay-200">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-accent-cyan" />
                Search Parameters
              </CardTitle>
              <CardDescription>
                Configure how Reddit posts are retrieved
              </CardDescription>
              <CardContent className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Date Range"
                  options={TIME_FILTERS}
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                />
                <Select
                  label="Sort By"
                  options={SORT_OPTIONS}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                />
                <Select
                  label="Posts per Search"
                  options={POST_LIMITS}
                  value={postLimit}
                  onChange={(e) => setPostLimit(e.target.value)}
                />
                <div className="flex items-end">
                  <Checkbox
                    label="Include comment analysis"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <Card className="animate-fade-in animate-delay-300">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent-lime" />
                Analysis Summary
              </CardTitle>
              <CardContent className="mt-6 space-y-4">
                <div className="space-y-3">
                  <SummaryItem
                    label="Subreddits"
                    value={subreddits.length || '—'}
                    subtext={subreddits.length > 0 ? subreddits.join(', ') : 'None selected'}
                  />
                  <SummaryItem
                    label="Keywords"
                    value={keywords.length || '—'}
                    subtext={keywords.length > 0 ? keywords.join(', ') : 'None selected'}
                  />
                  <SummaryItem
                    label="Total Searches"
                    value={totalSearches || '—'}
                    subtext={`${subreddits.length} × ${keywords.length} combinations`}
                  />
                  <SummaryItem
                    label="Est. Posts"
                    value={isValid ? `~${Math.round(estimatedPosts)}` : '—'}
                    subtext="Unique posts to analyze"
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/60 mb-4">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      Estimated time: {isValid ? formatDuration(Math.round(estimatedTime)) : '—'}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={!isValid}
                    isLoading={createJobMutation.isPending}
                  >
                    Start Analysis
                    <ArrowRight className="w-5 h-5" />
                  </Button>

                  {createJobMutation.isError && (
                    <p className="mt-3 text-sm text-red-400 text-center">
                      Failed to start analysis. Please try again.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-accent-teal/5 border-accent-teal/20 animate-fade-in animate-delay-400">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-accent-teal flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white/80 font-medium">Powered by AI</p>
                  <p className="text-xs text-white/50 mt-1">
                    Posts are analyzed using local LLM for sentiment, pain points, 
                    and feature requests. No data leaves your server.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

function SummaryItem({ 
  label, 
  value, 
  subtext 
}: { 
  label: string
  value: string | number
  subtext: string 
}) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-white/60">{label}</p>
        <p className="text-xs text-white/40 mt-0.5 max-w-[150px] truncate">{subtext}</p>
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
  )
}

