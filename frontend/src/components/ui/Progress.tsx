import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Progress({ value, max = 100, className, showLabel = false, size = 'md' }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-white/10 rounded-full overflow-hidden', sizes[size])}>
        <div
          className="h-full bg-gradient-to-r from-accent-teal to-accent-cyan rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-right">
          <span className="text-sm text-white/60">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  )
}


