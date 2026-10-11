import type { ReactNode } from 'react'

import { cn } from '../../lib/utils'

export type PageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:mb-8', className)}>
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}