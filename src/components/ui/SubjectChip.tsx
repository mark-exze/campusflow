import type { Subject } from '../../types'
import { cn } from '../../lib/utils'

export type SubjectChipProps = {
  subject: Subject | undefined
  className?: string
  variant?: 'code' | 'name'
}

/** Coloured subject marker using the subject's Tailwind colour token. */
export function SubjectChip({ subject, className, variant = 'code' }: SubjectChipProps) {
  if (!subject) {
    return (
      <span className={cn('text-xs text-slate-500 italic', className)}>No subject</span>
    )
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', subject.color)} />
      {variant === 'code' ? (
        <>
          <span className="sr-only">{subject.name}</span>
          <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
            {subject.code}
          </span>
        </>
      ) : (
        <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
          {subject.name}
        </span>
      )}
    </span>
  )
}