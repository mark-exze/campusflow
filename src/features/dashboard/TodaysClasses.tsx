import { Badge } from '../../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatTimeRange } from '../../lib/utils'
import type { ClassSession, Subject } from '../../types'

type SubjectLookup = (subjectId: string) => Subject | undefined

function isNow(startTime: string, endTime: string): boolean {
  const now = new Date()
  return buildTimeOnToday(now, startTime) <= now && now <= buildTimeOnToday(now, endTime)
}

function isPast(endTime: string): boolean {
  return buildTimeOnToday(new Date(), endTime) < new Date()
}

function buildTimeOnToday(reference: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(reference)
  result.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return result
}

export type TodaysClassesProps = {
  classes: ClassSession[]
  getSubject: SubjectLookup
}

function ClassRow({ session, getSubject }: { session: ClassSession; getSubject: SubjectLookup }) {
  const subject = getSubject(session.subjectId)
  const past = isPast(session.endTime)
  const live = isNow(session.startTime, session.endTime)

  return (
    <li
      className={
        past
          ? 'flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40'
          : 'flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900'
      }
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full ${subject?.color ?? 'bg-slate-300'}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={
              past
                ? 'text-sm font-medium text-slate-400 dark:text-slate-500'
                : 'text-sm font-semibold text-slate-900 dark:text-slate-100'
            }
          >
            {session.name}
          </span>
          {live ? (
            <Badge tone="success" icon="Circle">
              In progress
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          {subject?.code ?? 'No subject'} · {session.location}
        </p>
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
        {formatTimeRange(session.startTime, session.endTime)}
      </span>
    </li>
  )
}

export function TodaysClasses({ classes, getSubject }: TodaysClassesProps) {
  const remaining = classes.filter((session) => !isPast(session.endTime)).length

  return (
    <Card>
      <CardHeader
        title="Today's classes"
        description={classes.length > 0 ? `${classes.length} scheduled · ${remaining} remaining` : undefined}
        icon="CalendarDays"
      />
      <CardBody className="mt-4">
        {classes.length === 0 ? (
          <EmptyState
            icon="CalendarDays"
            title="No classes today"
            description="Enjoy the break, or get ahead on upcoming deadlines."
          />
        ) : (
          <ul className="space-y-2">
            {classes.map((session) => (
              <ClassRow key={session.id} session={session} getSubject={getSubject} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}