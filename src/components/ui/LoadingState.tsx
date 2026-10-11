import { cn } from '../../lib/utils'

export type LoadingStateProps = {
  lines?: number
  label?: string
  className?: string
}

/**
 * Skeleton placeholder shown while real data is being resolved.
 * Phase 1 reads synchronously from local data, so this is only used where a
 * transition is genuinely expected (route changes).
 */
export function LoadingState({ lines = 3, label = 'Loading', className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('space-y-3', className)}
    >
      <span className="sr-only">{label}…</span>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
          style={{ width: index === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}