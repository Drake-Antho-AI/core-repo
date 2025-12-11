import { useState, KeyboardEvent, useEffect, useRef } from 'react'
import { X, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateSubreddit as checkSubreddit } from '@/lib/api'

interface TagInputProps {
  label?: string
  placeholder?: string
  tags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  suggestions?: string[]
  validateSubreddit?: boolean // Enable subreddit validation
}

export function TagInput({
  label,
  placeholder = 'Type and press Enter',
  tags,
  onChange,
  maxTags = 10,
  suggestions = [],
  validateSubreddit = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  )

  // Helper to normalize subreddit name (remove r/ prefix)
  const normalizeSubreddit = (name: string): string => {
    return name.trim().replace(/^r\//i, '')
  }

  // Validate subreddit with debouncing
  useEffect(() => {
    if (!validateSubreddit || !inputValue.trim()) {
      setValidationState('idle')
      return
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    setValidationState('validating')

    // Debounce validation (wait 500ms after user stops typing)
    debounceTimer.current = setTimeout(async () => {
      const trimmed = normalizeSubreddit(inputValue)
      if (!trimmed) {
        setValidationState('idle')
        return
      }

      try {
        const result = await checkSubreddit(trimmed)
        setValidationState(result.exists ? 'valid' : 'invalid')
      } catch (error) {
        // On error, assume invalid
        setValidationState('invalid')
      }
    }, 500)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [inputValue, validateSubreddit])

  const addTag = (tag: string) => {
    // Normalize: remove r/ prefix if present
    const normalized = normalizeSubreddit(tag)
    if (!normalized) return
    
    // If validation is enabled, only allow valid subreddits
    if (validateSubreddit && validationState !== 'valid' && validationState !== 'idle') {
      return
    }
    
    if (!tags.includes(normalized) && tags.length < maxTags) {
      onChange([...tags, normalized])
      setInputValue('')
      setValidationState('idle')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Only add if valid or validation disabled
      if (!validateSubreddit || validationState === 'valid' || validationState === 'idle') {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-white/80">{label}</label>
      )}
      <div
        className={cn(
          'min-h-[46px] px-3 py-2 rounded-xl bg-white/5 border transition-colors',
          // Validation states
          validateSubreddit && validationState === 'valid' && inputValue.trim() && 
            'border-green-500/50 focus-within:ring-2 focus-within:ring-green-500/30 focus-within:border-green-500/70',
          validateSubreddit && validationState === 'invalid' && inputValue.trim() && 
            'border-red-500/50 focus-within:ring-2 focus-within:ring-red-500/30 focus-within:border-red-500/70',
          (!validateSubreddit || validationState === 'idle' || (validationState === 'validating' && !inputValue.trim())) &&
            'border-white/10 focus-within:ring-2 focus-within:ring-accent-teal/50 focus-within:border-accent-teal/50'
        )}
      >
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-teal/20 text-accent-teal text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setShowSuggestions(true)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={tags.length === 0 ? placeholder : ''}
              className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm py-1"
              disabled={tags.length >= maxTags}
            />
            {/* Validation indicator */}
            {validateSubreddit && inputValue.trim() && (
              <div className="flex-shrink-0">
                {validationState === 'validating' && (
                  <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                )}
                {validationState === 'valid' && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                {validationState === 'invalid' && (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
        <div className="glass rounded-xl p-2 space-y-1 max-h-40 overflow-y-auto">
          {filteredSuggestions.slice(0, 5).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      
      {/* Error message */}
      {validateSubreddit && validationState === 'invalid' && inputValue.trim() && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          r/{normalizeSubreddit(inputValue)} does not exist or is private
        </p>
      )}
      
      {tags.length >= maxTags && (
        <p className="text-xs text-white/50">Maximum {maxTags} items reached</p>
      )}
    </div>
  )
}


