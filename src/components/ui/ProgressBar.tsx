import { cn } from '../../lib/utils'

export type ProgressBarProps = {
  /** Percentage, 0-100. */
  value: number
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

/** Accessible progress bar exposed as a real `progressbar` role. */
export function ProgressBar({ value, label, size = 'sm', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  const isComplete = clamped >= 100

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
      className={cn(
        'w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width]',
          isComplete ? 'bg-emerald-500' : 'bg-brand-500',
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
