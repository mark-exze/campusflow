import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../../lib/utils'
import { Icon } from './Icon'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean
}

export function Card({ padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
        padded && 'p-4 sm:p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CardHeaderProps = {
  title: string
  description?: string | undefined
  icon?: string | undefined
  action?: ReactNode | undefined
  className?: string | undefined
}

export function CardHeader({ title, description, icon, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {icon ? <Icon name={icon} className="size-4 shrink-0 text-slate-400" /> : null}
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export type CardBodyProps = {
  className?: string
  children: ReactNode
}

export function CardBody({ className, children }: CardBodyProps) {
  return <div className={cn('space-y-3', className)}>{children}</div>
}

export type CardFooterProps = {
  className?: string
  children: ReactNode
}

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <div className={cn('flex items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800', className)}>
      {children}
    </div>
  )
}