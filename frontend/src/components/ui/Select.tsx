import { forwardRef, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-white/80">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white appearance-none',
              'focus:outline-none focus:ring-2 focus:ring-accent-teal/50 focus:border-accent-teal/50',
              'transition-colors cursor-pointer',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-navy-900 text-white">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 pointer-events-none" />
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'


