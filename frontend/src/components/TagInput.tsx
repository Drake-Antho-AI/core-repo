import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  label?: string
  placeholder?: string
  tags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  suggestions?: string[]
}

export function TagInput({
  label,
  placeholder = 'Type and press Enter',
  tags,
  onChange,
  maxTags = 10,
  suggestions = [],
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  )

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed) && tags.length < maxTags) {
      onChange([...tags, trimmed])
      setInputValue('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
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
          'min-h-[46px] px-3 py-2 rounded-xl bg-white/5 border border-white/10',
          'focus-within:ring-2 focus-within:ring-accent-teal/50 focus-within:border-accent-teal/50',
          'transition-colors'
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
            className="flex-1 min-w-[120px] bg-transparent text-white placeholder-white/30 outline-none text-sm py-1"
            disabled={tags.length >= maxTags}
          />
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
      
      {tags.length >= maxTags && (
        <p className="text-xs text-white/50">Maximum {maxTags} items reached</p>
      )}
    </div>
  )
}


