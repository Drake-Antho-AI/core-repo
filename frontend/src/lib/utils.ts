import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string, assuming UTC if no timezone is specified.
 */
export function parseDate(dateString: string): Date {
  if (!dateString) return new Date(NaN)
  
  // Check if it already has timezone info
  const hasTZ = dateString.endsWith('Z') || 
    /[+-]\d{2}:\d{2}$/.test(dateString) ||
    /[+-]\d{4}$/.test(dateString)
  
  if (hasTZ) {
    return new Date(dateString)
  } else {
    // Assume UTC if no timezone
    const normalized = dateString.replace(' ', 'T')
    return new Date(normalized + 'Z')
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'unknown'
  
  const date = parseDate(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  
  // Handle invalid dates
  if (isNaN(diffMs)) {
    console.warn('Invalid date:', dateString)
    return 'unknown'
  }
  
  // Handle future dates (with small tolerance for clock skew)
  if (diffMs < -5000) return 'in the future'
  
  // Very recent (within 30 seconds)
  if (diffMs < 30000) return 'just now'
  
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return formatDate(dateString)
}

export function formatDuration(seconds: number): string {
  // Handle invalid/negative values
  if (!seconds || seconds <= 0) return 'calculating...'
  
  seconds = Math.round(seconds)
  
  if (seconds < 60) return `${seconds}s`
  
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  
  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

export function getSentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive': return 'text-green-400'
    case 'slightly_positive': return 'text-green-300'
    case 'neutral': return 'text-gray-400'
    case 'slightly_negative': return 'text-orange-300'
    case 'negative': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

export function getSentimentBgColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive': return 'bg-green-500'
    case 'slightly_positive': return 'bg-green-400'
    case 'neutral': return 'bg-gray-400'
    case 'slightly_negative': return 'bg-orange-400'
    case 'negative': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
}

export function getSentimentEmoji(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive': return '😄'
    case 'slightly_positive': return '🙂'
    case 'neutral': return '😐'
    case 'slightly_negative': return '🙁'
    case 'negative': return '😠'
    default: return '❓'
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/50'
    case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/50'
    case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50'
    case 'low': return 'text-green-400 bg-green-500/20 border-green-500/50'
    default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50'
  }
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case 'product': return 'text-blue-400 bg-blue-500/20'
    case 'service': return 'text-purple-400 bg-purple-500/20'
    case 'marketing': return 'text-pink-400 bg-pink-500/20'
    default: return 'text-gray-400 bg-gray-500/20'
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

