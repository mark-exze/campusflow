import { Link } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { AssignmentList } from '../assignments/AssignmentList'
import { ROUTES } from '../../lib/constants'
import type { Assignment, Subject } from '../../types'

export type UpcomingAssignmentsProps = {
  assignments: Assignment[]
  overdueAssignments: Assignment[]
  getSubject: (subjectId: string) => Subject | undefined
  onToggleComplete: (id: string) => void
}

/** Show at most 5 deadlines on the dashboard; the rest live on the page. */
const DASHBOARD_LIMIT = 5

export function UpcomingAssignments({
  assignments,
  overdueAssignments,
  getSubject,
  onToggleComplete,
}: UpcomingAssignmentsProps) {
  const visible = assignments.slice(0, DASHBOARD_LIMIT)

  return (
    <Card>
      <CardHeader
        title="Upcoming deadlines"
        description={assignments.length > 0 ? `${assignments.length} still to do` : undefined}
        icon="ClipboardList"
        action={
          overdueAssignments.length > 0 ? (
            <Badge tone="danger" icon="AlertCircle">
              {overdueAssignments.length} overdue
            </Badge>
          ) : null
        }
      />
      <CardBody className="mt-4 space-y-3">
        <AssignmentList
          assignments={visible}
          getSubject={getSubject}
          onToggleComplete={onToggleComplete}
          compact
          emptyIcon="CheckCircle2"
          emptyTitle="All caught up"
          emptyDescription="No pending deadlines. Add one from the Assignments page."
        />

        {assignments.length > visible.length ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            +{assignments.length - visible.length} more in progress
          </p>
        ) : null}

        <Link
          to={ROUTES.assignments}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          View all assignments
          <Icon name="ChevronRight" className="size-4" />
        </Link>
      </CardBody>
    </Card>
  )
}