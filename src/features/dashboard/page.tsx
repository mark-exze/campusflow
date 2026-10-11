import { Link } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAssignments } from '../assignments/store'
import { CURRENT_SEMESTER } from '../../lib/mockData'
import { ROUTES } from '../../lib/constants'
import { formatDayHeader, getTodayDateString } from '../../lib/date'
import { DashboardStats } from './DashboardStats'
import { QuickActions } from './QuickActions'
import { SubjectOverview } from './SubjectOverview'
import { TodaysClasses } from './TodaysClasses'
import { UpcomingAssignments } from './UpcomingAssignments'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const {
    subjects,
    todayClasses,
    upcomingAssignments,
    overdueAssignments,
    stats,
    getSubject,
    toggleComplete,
  } = useAssignments()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${CURRENT_SEMESTER} · Week 6`}
        title={`${getGreeting()}, Alex`}
        description={`Here is your day at a glance — ${formatDayHeader(getTodayDateString())}.`}
        actions={
          <>
            <Badge tone="brand" icon="Sparkles">
              Sample data
            </Badge>
            <ButtonLink to={ROUTES.assignments} variant="primary" size="sm">
              Manage assignments
            </ButtonLink>
          </>
        }
      />

      <DashboardStats stats={stats} />

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <TodaysClasses classes={todayClasses} getSubject={getSubject} />
        <UpcomingAssignments
          assignments={upcomingAssignments}
          overdueAssignments={overdueAssignments}
          getSubject={getSubject}
          onToggleComplete={toggleComplete}
        />
      </div>

      <SubjectOverview subjects={subjects} />

      <QuickActions />

      <footer className="pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>
          Phase 1 foundation. Grades, AI planning and cloud sync are{' '}
          <Link
            to={ROUTES.settings}
            className="font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            not yet available
          </Link>
          .
        </p>
      </footer>
    </div>
  )
}