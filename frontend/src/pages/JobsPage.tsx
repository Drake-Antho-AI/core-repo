import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Clock, CheckCircle, XCircle, Loader2, Trash2, 
  BarChart3, ArrowRight, Plus, RefreshCw, Pause, Play
} from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { getJobs, deleteJob, pauseJob, resumeJob, Job } from '@/lib/api'
import { formatRelativeTime, formatDuration, parseDate } from '@/lib/utils'

export function JobsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => getJobs(50, 0),
    refetchInterval: 5000,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: pauseJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const resumeMutation = useMutation({
    mutationFn: resumeJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const handleRefresh = () => {
    refetch()
  }

  const handleDelete = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    if (confirm('Are you sure you want to delete this job and all its data?')) {
      deleteMutation.mutate(jobId)
    }
  }

  const handlePause = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    pauseMutation.mutate(jobId)
  }

  const handleResume = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    resumeMutation.mutate(jobId)
  }

  const handleJobClick = (job: Job) => {
    if (job.status === 'completed') {
      navigate(`/browse/${job.id}`)
    } else if (job.status === 'running' || job.status === 'pending') {
      navigate(`/processing/${job.id}`)
    }
  }

  const jobs = data?.jobs ?? []
  
  // Group jobs by status
  const runningJobs = jobs.filter(j => j.status === 'running' || j.status === 'pending')
  const pausedJobs = jobs.filter(j => j.status === 'paused')
  const completedJobs = jobs.filter(j => j.status === 'completed')
  const failedJobs = jobs.filter(j => j.status === 'failed')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Analysis Queue
          </h1>
          <p className="text-white/60">
            {jobs.length} total jobs • {runningJobs.length} in progress
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => navigate('/')}>
            <Plus className="w-4 h-4" />
            New Analysis
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent-teal" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="text-center py-16">
          <BarChart3 className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Analysis Jobs Yet</h2>
          <p className="text-white/60 mb-6">Start your first Reddit sentiment analysis</p>
          <Button onClick={() => navigate('/')}>
            <Plus className="w-4 h-4" />
            Create Analysis
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Running/Pending Jobs */}
          {runningJobs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-accent-teal animate-spin" />
                In Progress ({runningJobs.length})
              </h2>
              <div className="space-y-4">
                {runningJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onClick={() => handleJobClick(job)}
                    onDelete={(e) => handleDelete(job.id, e)}
                    onPause={(e) => handlePause(job.id, e)}
                    isDeleting={deleteMutation.isPending}
                    isPausing={pauseMutation.isPending}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Paused Jobs */}
          {pausedJobs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Pause className="w-5 h-5 text-yellow-400" />
                Paused ({pausedJobs.length})
              </h2>
              <div className="space-y-4">
                {pausedJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onClick={() => handleJobClick(job)}
                    onDelete={(e) => handleDelete(job.id, e)}
                    onResume={(e) => handleResume(job.id, e)}
                    isDeleting={deleteMutation.isPending}
                    isResuming={resumeMutation.isPending}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Completed ({completedJobs.length})
              </h2>
              <div className="space-y-4">
                {completedJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onClick={() => handleJobClick(job)}
                    onDelete={(e) => handleDelete(job.id, e)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Failed Jobs */}
          {failedJobs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                Failed ({failedJobs.length})
              </h2>
              <div className="space-y-4">
                {failedJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job}
                    onDelete={(e) => handleDelete(job.id, e)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

interface JobCardProps {
  job: Job
  onClick?: () => void
  onDelete?: (e: React.MouseEvent) => void
  onPause?: (e: React.MouseEvent) => void
  onResume?: (e: React.MouseEvent) => void
  isDeleting?: boolean
  isPausing?: boolean
  isResuming?: boolean
}

function JobCard({ job, onClick, onDelete, onPause, onResume, isDeleting, isPausing, isResuming }: JobCardProps) {
  const progress = job.progress
  const isRunning = job.status === 'running'
  const isPending = job.status === 'pending'
  const isPaused = job.status === 'paused'
  const isCompleted = job.status === 'completed'
  const isFailed = job.status === 'failed'

  const progressPercent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0

  // Estimate remaining time based on progress
  const getETA = () => {
    if (!isRunning || !job.started_at) return null
    if (progress.total === 0) return null
    if (progress.current === 0) return 'starting...'
    
    const startedAt = parseDate(job.started_at)
    const elapsed = Date.now() - startedAt.getTime()
    
    // Handle invalid or negative elapsed time
    if (isNaN(elapsed) || elapsed < 0) return 'calculating...'
    
    // Need at least 5 seconds of data for a reasonable estimate
    if (elapsed < 5000) return 'calculating...'
    
    const msPerItem = elapsed / progress.current
    const remainingItems = progress.total - progress.current
    
    if (remainingItems <= 0) return 'finishing...'
    
    const remainingMs = remainingItems * msPerItem
    const remainingSecs = Math.round(remainingMs / 1000)
    
    // Don't show negative or very small values
    if (remainingSecs <= 0) return 'almost done...'
    
    return formatDuration(remainingSecs)
  }

  const eta = getETA()

  return (
    <Card 
      hover={!!onClick}
      className={`group ${isRunning ? 'ring-2 ring-accent-teal/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-1">
          {isPending && (
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
          )}
          {isRunning && (
            <div className="w-10 h-10 rounded-full bg-accent-teal/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-accent-teal animate-spin" />
            </div>
          )}
          {isPaused && (
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Pause className="w-5 h-5 text-yellow-400" />
            </div>
          )}
          {isCompleted && (
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
          )}
          {isFailed && (
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-white group-hover:text-accent-teal transition-colors">
                {job.subreddits.map(s => `r/${s}`).join(', ')}
              </h3>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {job.keywords.map((kw) => (
                  <span key={kw} className="px-2 py-0.5 rounded bg-accent-teal/20 text-xs text-accent-teal">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="text-right">
                <Badge variant={
                  isCompleted ? 'success' : 
                  isRunning ? 'info' : 
                  isPaused ? 'warning' :
                  isFailed ? 'error' : 'warning'
                }>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Badge>
                <p className="text-xs text-white/40 mt-1">
                  {formatRelativeTime(job.created_at)}
                </p>
              </div>
              
              {/* Pause Button (for running jobs) */}
              {onPause && (isRunning || isPending) && (
                <button
                  onClick={onPause}
                  disabled={isPausing}
                  className="p-2 rounded-lg text-white/40 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                  title="Pause job"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
              
              {/* Resume Button (for paused jobs) */}
              {onResume && isPaused && (
                <button
                  onClick={onResume}
                  disabled={isResuming}
                  className="p-2 rounded-lg text-white/40 hover:text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                  title="Resume job"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              
              {/* Delete Button */}
              {onDelete && (
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Delete job"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar for Running/Paused Jobs */}
          {(isRunning || isPending || isPaused) && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className={isPaused ? 'text-yellow-400' : 'text-accent-teal'}>
                  {isPaused ? 'Paused' : (eta ? `ETA: ${eta}` : 'Starting...')}
                </span>
                <span className="text-white/60">{progressPercent}%</span>
              </div>
              <Progress value={progress.current} max={progress.total || 1} size="md" />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>{progress.posts_found} posts found</span>
                <span>{progress.current} / {progress.total} processed</span>
              </div>
            </div>
          )}

          {/* Stats for Completed Jobs */}
          {isCompleted && (
            <div className="mt-3 flex items-center gap-4 text-sm text-white/60">
              <span>{progress.posts_found} posts analyzed</span>
              <span>•</span>
              <span>{job.time_filter} • {job.sort_by}</span>
              {onClick && (
                <span className="ml-auto text-accent-teal flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View Results <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </div>
          )}

          {/* Error for Failed Jobs */}
          {isFailed && job.error_message && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{job.error_message}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
