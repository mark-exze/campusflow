import { cn, formatEstimatedHours } from '../../lib/utils'
import { daysUntil, getRelativeDayLabel } from '../../lib/date'
import { Icon } from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { SubjectChip } from '../../components/ui/SubjectChip'
import type { Assignment, Subject } from '../../types'
import { priorityLabel, statusLabel, statusTone, typeLabel } from './display'

export type AssignmentCardProps = {
  assignment: Assignment
  subject: Subject | undefined
  onToggleComplete: (id: string) => void
  onDelete?: ((id: string) => void) | undefined
}

export function AssignmentCard({
  assignment,
  subject,
  onToggleComplete,
  onDelete,
}: AssignmentCardProps) {
  const isCompleted = assignment.status === 'completed'
  const isOverdue = !isCompleted && daysUntil(assignment.dueDate) < 0

  return (
    <article
      className={cn(
        'group flex items-start gap-3 rounded-card border border-slate-200 bg-white p-3 shadow-sm transition-colors sm:p-4 dark:border-slate-800 dark:bg-slate-900',
        isCompleted && 'bg-slate-50/70 dark:bg-slate-900/50',
        isOverdue && 'border-rose-200 dark:border-rose-500/30',
      )}
    >
      <button
        type="button"
        onClick={() => onToggleComplete(assignment.id)}
        aria-pressed={isCompleted}
        aria-label={
          isCompleted
            ? `Mark "${assignment.title}" as not complete`
            : `Mark "${assignment.title}" as complete`
        }
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          isCompleted
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 text-transparent hover:border-brand-400 hover:text-brand-400 dark:border-slate-600',
        )}
      >
        <Icon name="Check" className="size-3.5" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3
            className={cn(
              'text-sm font-semibold text-slate-900 dark:text-slate-100',
              isCompleted && 'text-slate-400 line-through dark:text-slate-500',
            )}
          >
            {assignment.title}
          </h3>
          {isOverdue ? <Badge tone="danger" icon="AlertCircle">Overdue</Badge> : null}
          {!isOverdue && assignment.priority === 'high' && !isCompleted ? (
            <Badge tone="danger">High</Badge>
          ) : null}
        </div>

        <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          {assignment.description}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SubjectChip subject={subject} />
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Icon name="Clock" className="size-3.5" />
            <span className={isOverdue ? 'font-medium text-rose-600 dark:text-rose-400' : undefined}>
              {getRelativeDayLabel(assignment.dueDate)}
            </span>
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatEstimatedHours(assignment.estimatedHours)}
          </span>
          <Badge tone={statusTone(assignment.status)}>{statusLabel(assignment.status)}</Badge>
          <span className="sr-only">{`${typeLabel(assignment.type)}, ${priorityLabel(assignment.priority)}`}</span>
        </div>
      </div>

      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          onClick={() => onDelete(assignment.id)}
          aria-label={`Delete "${assignment.title}"`}
          title="Delete"
        >
          <Icon name="Trash2" className="size-4" />
        </Button>
      ) : null}
    </article>
  )
}