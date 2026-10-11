import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Icon } from './Icon'

export type EmptyStateProps = {
  icon?: string | undefined
  title: string
  description?: string | undefined
  action?: ReactNode | undefined
  className?: string | undefined
}

export function EmptyState({
  icon = 'Circle',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40',
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon name={icon} className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}