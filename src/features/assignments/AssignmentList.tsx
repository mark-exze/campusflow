import { cn } from '../../lib/utils'
import { EmptyState } from '../../components/ui/EmptyState'
import { AssignmentCard } from './AssignmentCard'
import type { Assignment, Subject } from '../../types'

export type AssignmentListProps = {
  assignments: Assignment[]
  getSubject: (subjectId: string) => Subject | undefined
  onToggleComplete: (id: string) => void
  onDelete?: ((id: string) => void) | undefined
  onEdit?: ((assignment: Assignment) => void) | undefined
  emptyTitle?: string | undefined
  emptyDescription?: string | undefined
  emptyIcon?: string | undefined
  className?: string | undefined
  /** Render a compact list without the row actions. */
  compact?: boolean
}

export function AssignmentList({
  assignments,
  getSubject,
  onToggleComplete,
  onDelete,
  onEdit,
  emptyTitle = 'No assignments yet',
  emptyDescription = 'Add an assignment to start tracking deadlines.',
  emptyIcon = 'ClipboardList',
  className,
  compact = false,
}: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    )
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {assignments.map((assignment) => (
        <li key={assignment.id}>
          <AssignmentCard
            assignment={assignment}
            subject={getSubject(assignment.subjectId)}
            onToggleComplete={onToggleComplete}
            onDelete={compact ? undefined : onDelete}
            onEdit={compact ? undefined : onEdit}
          />
        </li>
      ))}
    </ul>
  )
}
