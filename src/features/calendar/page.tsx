import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { cn, formatTimeRange, truncate } from '../../lib/utils'
import {
  formatDateWithPreference,
  formatTime,
  getTodayDateString,
} from '../../lib/date'
import { progressLabel } from '../../lib/assignmentProgress'
import { ROUTES } from '../../lib/constants'
import {
  DEFAULT_WEEK_START,
  buildCalendarEvents,
  buildMonthGrid,
  buildWeekDates,
  countEventsBetween,
  getMonthLabel,
  getMonthName,
  getMonthRange,
  getWeekLabel,
  getWeekdayNames,
  groupEventsByDate,
  shiftMonth,
  shiftWeek,
  type CalendarEvent,
  type MonthCell,
} from '../../lib/calendarEvents'
import { useProfile } from '../../hooks/useProfile'
import { useAssignments } from '../assignments/store'
import { priorityLabel, statusLabel } from '../assignments/display'
import type { DateFormatPreference } from '../../types'

type CalendarView = 'month' | 'week'

/** Chips shown in a month cell before collapsing into a "+N more" affordance. */
const MONTH_EVENT_LIMIT = 2

export function CalendarPage() {
  const { assignments, subjects } = useAssignments()
  const { profile } = useProfile()

  const todayIso = getTodayDateString()
  const [anchor, setAnchor] = useState(todayIso)
  const [view, setView] = useState<CalendarView>('month')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const monthCells = useMemo(
    () => buildMonthGrid(anchor, { todayIso }),
    [anchor, todayIso],
  )
  const weekDates = useMemo(() => buildWeekDates(anchor, DEFAULT_WEEK_START), [anchor])

  // The month grid also renders a few days from the adjacent months, so the
  // RENDER window is padded to whole weeks while the COUNT window is the
  // calendar month itself. In week view both windows are the same seven days.
  const rangeStart =
    view === 'month' ? (monthCells[0]?.isoDate ?? anchor) : (weekDates[0] ?? anchor)
  const rangeEnd =
    view === 'month'
      ? (monthCells[monthCells.length - 1]?.isoDate ?? anchor)
      : (weekDates[weekDates.length - 1] ?? anchor)

  const monthRange = useMemo(() => getMonthRange(anchor), [anchor])

  const renderedEvents = useMemo(
    () => buildCalendarEvents(rangeStart, rangeEnd, subjects, assignments),
    [rangeStart, rangeEnd, subjects, assignments],
  )

  const eventsByDate = useMemo(() => groupEventsByDate(renderedEvents), [renderedEvents])

  const totalEvents = useMemo(() => {
    const countRange =
      view === 'month' ? monthRange : { start: rangeStart, end: rangeEnd }
    return countEventsBetween(renderedEvents, countRange.start, countRange.end)
  }, [renderedEvents, view, monthRange, rangeStart, rangeEnd])

  const navigate = (direction: -1 | 1) => {
    setAnchor((current) =>
      view === 'month' ? shiftMonth(current, direction) : shiftWeek(current, direction),
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${profile.academicTerm} · ${profile.academicYear}`}
        title="Calendar"
        description="Assignment deadlines and recurring class schedules, derived from your subjects and assignments."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            className="h-11 w-11 shrink-0 p-0"
            onClick={() => navigate(-1)}
            aria-label="Previous period"
          >
            <Icon name="ChevronLeft" className="size-5" />
          </Button>

          <Button variant="secondary" size="md" className="h-11 shrink-0" onClick={() => setAnchor(todayIso)}>
            Today
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="h-11 w-11 shrink-0 p-0"
            onClick={() => navigate(1)}
            aria-label="Next period"
          >
            <Icon name="ChevronRight" className="size-5" />
          </Button>
        </div>

        <div
          role="radiogroup"
          aria-label="Calendar view"
          className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          {(['month', 'week'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={view === option}
              onClick={() => setView(option)}
              className={cn(
                'h-9 flex-1 rounded-lg px-4 text-sm font-medium capitalize transition-colors',
                view === option
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {view === 'month' ? getMonthLabel(anchor) : getWeekLabel(weekDates)}
        </h2>
        <Badge tone="neutral" icon="CalendarClock">
          {totalEvents} event{totalEvents === 1 ? '' : 's'}
          {view === 'month' ? ` in ${getMonthName(anchor)}` : ' this week'}
        </Badge>
      </div>

      {view === 'month' ? (
        <MonthView
          cells={monthCells}
          eventsByDate={eventsByDate}
          onSelectDate={setSelectedDate}
          onSelectEvent={setSelectedEvent}
        />
      ) : (
        <WeekView
          dates={weekDates}
          eventsByDate={eventsByDate}
          dateFormat={profile.dateFormat}
          onSelectEvent={setSelectedEvent}
        />
      )}

      {/* Day list */}
      <Modal
        open={selectedDate !== null && selectedEvent === null}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? `Events for ${formatDateWithPreference(selectedDate, profile.dateFormat)}` : 'Events'}
        footer={
          <Button variant="ghost" onClick={() => setSelectedDate(null)}>
            Close
          </Button>
        }
      >
        <DayEventList
          date={selectedDate}
          eventsByDate={eventsByDate}
          onSelectEvent={(event) => {
            setSelectedEvent(event)
            setSelectedDate(null)
          }}
        />
      </Modal>

      {/* Event details */}
      <Modal
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        size="sm"
        title={selectedEvent?.title ?? 'Event'}
        footer={
          selectedEvent?.kind === 'assignment' ? (
            <ButtonLink to={ROUTES.assignments} variant="secondary" size="sm">
              <Icon name="ClipboardList" className="size-4" />
              Manage assignments
            </ButtonLink>
          ) : (
            <ButtonLink to={ROUTES.subjects} variant="secondary" size="sm">
              <Icon name="BookOpen" className="size-4" />
              Manage subjects
            </ButtonLink>
          )
        }
      >
        {selectedEvent ? (
          <EventDetails event={selectedEvent} dateFormat={profile.dateFormat} />
        ) : null}
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Month view
// ---------------------------------------------------------------------------

type ViewProps = {
  dateFormat: DateFormatPreference
  onSelectEvent: (event: CalendarEvent) => void
}

function MonthView({
  cells,
  eventsByDate,
  onSelectDate,
  onSelectEvent,
}: {
  cells: MonthCell[]
  eventsByDate: Map<string, CalendarEvent[]>
  onSelectDate: (isoDate: string) => void
} & Pick<ViewProps, 'onSelectEvent'>) {
  const weekdayNames = getWeekdayNames(DEFAULT_WEEK_START)

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
        {weekdayNames.map((name) => (
          <div
            key={name}
            className="px-1 py-2 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
          >
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const events = eventsByDate.get(cell.isoDate) ?? []
          const visible = events.slice(0, MONTH_EVENT_LIMIT)
          const hidden = events.length - visible.length

          return (
            <div
              key={cell.isoDate}
              className={cn(
                'min-h-[4.5rem] border-r border-b border-slate-200 p-1 last:border-r-0 dark:border-slate-800 sm:min-h-[5.5rem] sm:p-1.5',
                !cell.isCurrentMonth && 'bg-slate-50/60 dark:bg-slate-900/40',
                cell.isToday && 'bg-brand-50/50 dark:bg-brand-500/5',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate(cell.isoDate)}
                aria-label={`View events for ${cell.isoDate}`}
                className={cn(
                  'mb-1 flex h-6 w-full items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
                  cell.isCurrentMonth
                    ? 'text-slate-700 dark:text-slate-200'
                    : 'text-slate-400 dark:text-slate-500',
                  cell.isToday &&
                    'bg-brand-600 text-white hover:bg-brand-700 dark:hover:bg-brand-500',
                )}
              >
                {cell.dayOfMonth}
              </button>

              {events.length === 0 ? (
                <span className="sr-only">No events</span>
              ) : (
                <div className="space-y-1">
                  {/* Compact dots keep narrow screens readable. */}
                  <div className="flex flex-wrap items-center gap-0.5 sm:hidden">
                    {events.slice(0, 4).map((event) => (
                      <span
                        key={event.id}
                        aria-hidden="true"
                        className={cn(
                          'size-1.5 rounded-full',
                          event.status === 'completed'
                            ? 'bg-emerald-500'
                            : event.kind === 'assignment'
                              ? 'bg-brand-500'
                              : event.subjectColor,
                        )}
                      />
                    ))}
                    {events.length > 4 ? (
                      <span className="text-[10px] text-slate-400">
                        +{events.length - 4}
                      </span>
                    ) : null}
                  </div>

                  {/* Text chips from the small breakpoint up. */}
                  <div className="hidden space-y-1 sm:block">
                    {visible.map((event) => (
                      <EventChip
                        key={event.id}
                        event={event}
                        onClick={() => onSelectEvent(event)}
                      />
                    ))}

                    {hidden > 0 ? (
                      <button
                        type="button"
                        onClick={() => onSelectDate(cell.isoDate)}
                        className="w-full rounded px-1 text-left text-[11px] font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        +{hidden} more
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Week view
// ---------------------------------------------------------------------------

function WeekView({
  dates,
  eventsByDate,
  dateFormat,
  onSelectEvent,
}: {
  dates: string[]
  eventsByDate: Map<string, CalendarEvent[]>
} & ViewProps) {
  return (
    // Stacked day cards avoid horizontal scrolling and keep labels readable at
    // 375px, widening to a seven-column layout on larger screens.
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-4">
      {dates.map((isoDate) => {
        const events = eventsByDate.get(isoDate) ?? []
        const isToday = isoDate === getTodayDateString()

        return (
          <Card
            key={isoDate}
            padded={false}
            className={cn(
              'p-3',
              isToday &&
                'border-brand-200 bg-brand-50/40 dark:border-brand-500/40 dark:bg-brand-500/5',
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: 'short',
                })}
              </p>
              <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatDateWithPreference(isoDate, dateFormat)}
              </p>
            </div>

            {events.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                Nothing scheduled
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <EventChip event={event} onClick={() => onSelectEvent(event)} detailed />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Event presentation
// ---------------------------------------------------------------------------

function EventChip({
  event,
  onClick,
  detailed = false,
}: {
  event: CalendarEvent
  onClick: () => void
  detailed?: boolean
}) {
  const isCompleted = event.status === 'completed'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={describeEvent(event)}
      className={cn(
        'flex w-full items-start gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-left transition-colors hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/40',
        isCompleted && 'opacity-70',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-1 size-2 shrink-0 rounded-full',
          isCompleted
            ? 'bg-emerald-500'
            : event.kind === 'assignment'
              ? 'bg-brand-500'
              : event.subjectColor,
        )}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-xs font-medium text-slate-700 dark:text-slate-200',
            isCompleted && 'text-slate-400 line-through dark:text-slate-500',
          )}
          title={event.title}
        >
          {detailed ? event.title : truncate(event.title, 14)}
        </span>
        {detailed ? (
          <span className="mt-0.5 block truncate text-[11px] text-slate-400 dark:text-slate-500">
            {event.kind === 'assignment' ? 'Due' : formatTime(event.startTime ?? '')} ·{' '}
            {event.subjectCode}
          </span>
        ) : null}
      </span>
    </button>
  )
}

function DayEventList({
  date,
  eventsByDate,
  onSelectEvent,
}: {
  date: string | null
  eventsByDate: Map<string, CalendarEvent[]>
  onSelectEvent: (event: CalendarEvent) => void
}) {
  const events = date ? (eventsByDate.get(date) ?? []) : []

  if (events.length === 0) {
    return (
      <EmptyState
        icon="CalendarClock"
        title="Nothing scheduled"
        description="No classes or deadlines fall on this day."
      />
    )
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li key={event.id}>
          <button
            type="button"
            onClick={() => onSelectEvent(event)}
            className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-500/40"
          >
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 w-1.5 shrink-0 self-stretch rounded-full',
                event.status === 'completed'
                  ? 'bg-emerald-500'
                  : event.kind === 'assignment'
                    ? 'bg-brand-500'
                    : event.subjectColor,
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                {event.title}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                {event.kind === 'assignment'
                  ? 'Deadline'
                  : formatTimeRange(event.startTime ?? '', event.endTime ?? '')}
                {' · '}
                {event.subjectName}
              </span>
            </span>
            <Icon name="ChevronRight" className="mt-1 size-4 shrink-0 text-slate-400" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function EventDetails({
  event,
  dateFormat,
}: {
  event: CalendarEvent
  dateFormat: DateFormatPreference
}) {
  const isAssignment = event.kind === 'assignment'
  const progress = event.progress ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            'size-3 shrink-0 rounded-full',
            isAssignment ? 'bg-brand-500' : event.subjectColor,
            event.status === 'completed' && 'bg-emerald-500',
          )}
        />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {event.subjectName}
        </span>
        {event.subjectCode ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">{event.subjectCode}</span>
        ) : null}
      </div>

      <dl className="space-y-2.5">
        {isAssignment ? (
          <>
            <DetailRow icon="CalendarDays" label="Due date">
              {formatDateWithPreference(event.date, dateFormat)}
            </DetailRow>
            <DetailRow icon="AlertCircle" label="Priority">
              {priorityLabel(event.priority ?? 'medium')}
            </DetailRow>
            <DetailRow icon="ClipboardList" label="Status">
              {statusLabel(event.status ?? 'pending')}
            </DetailRow>
            <DetailRow icon="CheckCircle2" label="Progress">
              {progressLabel(progress)}
            </DetailRow>
          </>
        ) : (
          <>
            <DetailRow icon="Clock" label="Time">
              {formatTimeRange(event.startTime ?? '', event.endTime ?? '')}
            </DetailRow>
            <DetailRow icon="CalendarDays" label="Date">
              {formatDateWithPreference(event.date, dateFormat)}
            </DetailRow>
            {event.location ? (
              <DetailRow icon="MapPin" label="Classroom">
                {event.location}
              </DetailRow>
            ) : null}
            {event.instructor ? (
              <DetailRow icon="User" label="Instructor">
                {event.instructor}
              </DetailRow>
            ) : null}
          </>
        )}
      </dl>

      {event.status === 'completed' ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          This assignment is completed.
        </p>
      ) : null}
    </div>
  )
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Icon name={icon} className="size-3.5 shrink-0" />
        {label}
      </dt>
      <dd className="text-right text-sm font-medium text-slate-900 dark:text-slate-100">
        {children}
      </dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function describeEvent(event: CalendarEvent): string {
  if (event.kind === 'assignment') {
    return `${event.title}, assignment due ${event.date}, ${statusLabel(event.status ?? 'pending')}`
  }
  return `${event.title}, class ${formatTimeRange(event.startTime ?? '', event.endTime ?? '')} on ${event.date}`
}
