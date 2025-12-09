import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { getJob } from '@/lib/api'
import { formatDuration } from '@/lib/utils'

export function ProcessingPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false
      }
      return 2000 // Poll every 2 seconds
    },
  })

  // Auto-redirect on completion
  useEffect(() => {
    if (job?.status === 'completed') {
      const timer = setTimeout(() => {
        navigate(`/browse/${jobId}`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [job?.status, jobId, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent-teal" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Job Not Found</h1>
        <p className="text-white/60 mb-6">The analysis job could not be found.</p>
        <Button onClick={() => navigate('/')}>Start New Analysis</Button>
      </div>
    )
  }

  const progress = job.progress
  const isRunning = job.status === 'running'
  const isCompleted = job.status === 'completed'
  const isFailed = job.status === 'failed'

  const progressPercent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Card className="text-center">
        <CardContent className="py-8">
          {/* Status Icon */}
          <div className="mb-6">
            {isRunning && (
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-accent-teal/20 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-accent-teal animate-spin" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-navy-900 border-2 border-accent-teal flex items-center justify-center">
                  <span className="text-sm font-bold text-accent-teal">{progressPercent}%</span>
                </div>
              </div>
            )}
            {isCompleted && (
              <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto animate-fade-in">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
            )}
            {isFailed && (
              <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <XCircle className="w-12 h-12 text-red-400" />
              </div>
            )}
          </div>

          {/* Status Text */}
          <CardTitle className="text-2xl mb-2">
            {isRunning && 'Analyzing Reddit Posts...'}
            {isCompleted && 'Analysis Complete!'}
            {isFailed && 'Analysis Failed'}
          </CardTitle>
          
          <p className="text-white/60 mb-6">
            {isRunning && progress.step}
            {isCompleted && 'Redirecting to results...'}
            {isFailed && job.error_message}
          </p>

          {/* Progress Bar */}
          {isRunning && (
            <div className="max-w-sm mx-auto mb-6">
              <Progress value={progress.current} max={progress.total} size="lg" />
              <div className="flex justify-between mt-2 text-sm text-white/50">
                <span>{progress.current} / {progress.total}</span>
                <span>{progress.posts_found} posts found</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-6 border-t border-white/10">
            <StatItem
              label="Subreddits"
              value={job.subreddits.length}
            />
            <StatItem
              label="Keywords"
              value={job.keywords.length}
            />
            <StatItem
              label="Posts"
              value={progress.posts_found}
            />
          </div>

          {/* Actions */}
          {isCompleted && (
            <Button
              onClick={() => navigate(`/browse/${jobId}`)}
              size="lg"
              className="animate-fade-in"
            >
              View Results
              <ArrowRight className="w-5 h-5" />
            </Button>
          )}
          {isFailed && (
            <Button onClick={() => navigate('/')} variant="secondary">
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Search Details */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-white/50 mb-2">Searching in</p>
          <div className="flex flex-wrap gap-1.5">
            {job.subreddits.map((sub) => (
              <span key={sub} className="px-2 py-0.5 rounded bg-white/10 text-xs text-white/80">
                r/{sub}
              </span>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-sm text-white/50 mb-2">Looking for</p>
          <div className="flex flex-wrap gap-1.5">
            {job.keywords.map((kw) => (
              <span key={kw} className="px-2 py-0.5 rounded bg-accent-teal/20 text-xs text-accent-teal">
                {kw}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/50">{label}</p>
    </div>
  )
}


