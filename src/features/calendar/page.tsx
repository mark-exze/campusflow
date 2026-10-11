import { Badge } from '../../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { DAY_NAMES } from '../../lib/constants'
import { formatDateWithPreference, getTodayDateString, getWeekDates, startOfWeek } from '../../lib/date'
import { formatTimeRange } from '../../lib/utils'
import { useProfile } from '../../hooks/useProfile'
import { useAssignments } from '../assignments/store'
import type { ClassSession, Subject } from '../../types'

type SubjectLookup = (subjectId: string) => Subject | undefined

export function CalendarPage() {
  const { weekSchedule, getSubject } = useAssignments()
  const { profile } = useProfile()
  const weekDates = getWeekDates(startOfWeek(getTodayDateString()))
  const today = new Date().getDay()
  const weekTotal = weekSchedule.reduce((total, day) => total + day.classes.length, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${profile.academicTerm} · ${profile.academicYear}`}
        title="Calendar"
        description="Your weekly class schedule. Assignment deadlines are listed on the assignments page."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-4">
        {weekSchedule.map((day) => {
          const dayName = DAY_NAMES[day.dayOfWeek] ?? 'Day'
          const weekDate = weekDates[day.dayOfWeek]

          return (
            <Card
              key={day.dayOfWeek}
              className={
                day.dayOfWeek === today
                  ? 'border-brand-200 bg-brand-50/40 dark:border-brand-500/40 dark:bg-brand-500/5'
                  : undefined
              }
            >
              <CardHeader
                title={dayName}
                description={
                  weekDate ? formatDateWithPreference(weekDate, profile.dateFormat) : undefined
                }
                action={day.dayOfWeek === today ? <Badge tone="brand">Today</Badge> : null}
              />

              <CardBody className="mt-3">
                {day.classes.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-2 py-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                    No classes
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {day.classes.map((session) => (
                      <li key={session.id}>
                        <CalendarEvent session={session} getSubject={getSubject} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader
          title="Week summary"
          description={`${weekTotal} classes across the week`}
          icon="CalendarDays"
        />
        <CardBody className="mt-4">
          <EmptyState
            icon="CalendarClock"
            title="Assignment calendar coming later"
            description="This phase shows class sessions only. Deadlines will appear here once the academic calendar is built."
          />
        </CardBody>
      </Card>
    </div>
  )
}

function CalendarEvent({
  session,
  getSubject,
}: {
  session: ClassSession
  getSubject: SubjectLookup
}) {
  const subject = getSubject(session.subjectId)

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
      <span
        aria-hidden="true"
        className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full ${subject?.color ?? 'bg-slate-300'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {session.name}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {formatTimeRange(session.startTime, session.endTime)} · {session.location}
        </p>
      </div>
    </div>
  )
}