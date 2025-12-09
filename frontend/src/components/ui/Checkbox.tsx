import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, checked, ...props }, ref) => {
    return (
      <label className={cn('flex items-center gap-2.5 cursor-pointer group', className)}>
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div className={cn(
            'w-5 h-5 rounded-md border-2 transition-all',
            'border-white/30 bg-white/5',
            'group-hover:border-white/50',
            'peer-checked:border-accent-teal peer-checked:bg-accent-teal',
            'peer-focus:ring-2 peer-focus:ring-accent-teal/50'
          )}>
            <Check className={cn(
              'w-3 h-3 text-navy-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'transition-opacity',
              checked ? 'opacity-100' : 'opacity-0'
            )} />
          </div>
        </div>
        {label && (
          <span className="text-sm text-white/80 group-hover:text-white transition-colors">
            {label}
          </span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'


