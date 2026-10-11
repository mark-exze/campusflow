/**
 * Academic calendar: month/week grids and event derivation.
 *
 * Everything here is pure and takes explicit dates, so the tricky parts —
 * month boundaries, leap years, year rollover and local (not UTC) dates — are
 * directly unit-testable. Events are DERIVED from the student's assignments and
 * subject schedules; nothing is duplicated or stored separately.
 */

import { MONTH_NAMES } from './constants'
import { addDays, getTodayDateString } from './date'
import type {
  Assignment,
  AssignmentPriority,
  AssignmentStatus,
  ClassSession,
  Subject,
} from '../types'

/** Monday-first week, applied consistently across both views. */
export const DEFAULT_WEEK_START = 1

export type CalendarEventKind = 'assignment' | 'class'

export type CalendarEvent = {
  id: string
  kind: CalendarEventKind
  /** Local `yyyy-mm-dd` the event falls on. */
  date: string
  subjectId: string
  /** Sort key within a day. All-day deadlines sort before timed classes. */
  sortTime: string
  title: string
  subjectName: string
  subjectCode: string
  subjectColor: string

  // Assignment-only detail
  priority?: AssignmentPriority | undefined
  status?: AssignmentStatus | undefined
  progress?: number | undefined

  // Class-only detail
  startTime?: string | undefined
  endTime?: string | undefined
  location?: string | undefined
  instructor?: string | undefined
}

/** A recurring class session materialised onto one concrete date. */
export type DatedClassSession = ClassSession & { isoDate: string }

export type MonthCell = {
  isoDate: string
  dayOfMonth: number
  /** False for trailing/leading days belonging to the adjacent month. */
  isCurrentMonth: boolean
  isToday: boolean
  /** 0 = Sunday, matching `Date.prototype.getDay`. */
  weekday: number
}

// ---------------------------------------------------------------------------
// Date-range helpers
// ---------------------------------------------------------------------------

function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00`).getDay()
}

/** Number of days in the month a `yyyy-MM-dd` value belongs to. */
export function getDaysInMonth(monthIso: string): number {
  const [year, month] = monthIso.split('-').map(Number)
  if (!year || !month) return 31
  // Day 0 of the following month is the last day of this one, evaluated in
  // LOCAL time so the count is never skewed by a timezone offset.
  return new Date(year, month, 0).getDate()
}

export function getMonthStart(monthIso: string): string {
  return `${monthIso.slice(0, 7)}-01`
}

/** First date of a month, `delta` months away. Handles year rollover. */
export function shiftMonth(monthIso: string, delta: number): string {
  const [year, month] = getMonthStart(monthIso).split('-').map(Number)
  if (!year || !month) return getMonthStart(monthIso)

  const totalMonths = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(totalMonths / 12)
  const nextMonth = (totalMonths % 12) + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
}

export function shiftWeek(anchorIso: string, delta: number): string {
  return addDays(anchorIso, delta * 7)
}

/** First day of the seven-day window containing `anchorIso`. */
export function startOfCalendarWeek(
  anchorIso: string,
  weekStart: number = DEFAULT_WEEK_START,
): string {
  const offset = (weekdayOf(anchorIso) - weekStart + 7) % 7
  return addDays(anchorIso, -offset)
}

/** Seven dates from the start of `anchorIso`'s week, week-start aligned. */
export function buildWeekDates(
  anchorIso: string,
  weekStart: number = DEFAULT_WEEK_START,
): string[] {
  const start = startOfCalendarWeek(anchorIso, weekStart)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

/**
 * A full month grid, week-start aligned, always ending on a complete week.
 * Leading and trailing days from adjacent months are included so the grid is
 * rectangular; they are flagged with `isCurrentMonth: false`.
 */
export function buildMonthGrid(
  monthIso: string,
  options: { todayIso?: string; weekStart?: number } = {},
): MonthCell[] {
  const todayIso = options.todayIso ?? getTodayDateString()
  const weekStart = options.weekStart ?? DEFAULT_WEEK_START

  const monthStart = getMonthStart(monthIso)
  const offset = (weekdayOf(monthStart) - weekStart + 7) % 7
  const gridStart = addDays(monthStart, -offset)
  const totalDays = getDaysInMonth(monthIso)
  const cellCount = Math.ceil((offset + totalDays) / 7) * 7

  return Array.from({ length: cellCount }, (_, index) => {
    const isoDate = addDays(gridStart, index)
    return {
      isoDate,
      dayOfMonth: Number(isoDate.slice(8, 10)),
      isCurrentMonth: isoDate.slice(0, 7) === monthIso.slice(0, 7),
      isToday: isoDate === todayIso,
      weekday: weekdayOf(isoDate),
    }
  })
}

/** Human label for a month, e.g. "October 2026". */
export function getMonthLabel(monthIso: string): string {
  const monthIndex = Number(monthIso.slice(5, 7)) - 1
  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return monthIso
  return `${MONTH_NAMES[monthIndex]} ${monthIso.slice(0, 4)}`
}

/** Label for a week window, e.g. "5 – 11 Oct 2026". */
export function getWeekLabel(dates: readonly string[]): string {
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (!first || !last) return ''

  const firstMonth = MONTH_NAMES[Number(first.slice(5, 7)) - 1] ?? ''
  const lastMonth = MONTH_NAMES[Number(last.slice(5, 7)) - 1] ?? ''
  const firstDay = Number(first.slice(8, 10))
  const lastDay = Number(last.slice(8, 10))
  const firstYear = first.slice(0, 4)
  const lastYear = last.slice(0, 4)

  if (first.slice(0, 7) === last.slice(0, 7)) {
    return `${firstDay} – ${lastDay} ${firstMonth} ${firstYear}`
  }
  if (firstYear === lastYear) {
    return `${firstDay} ${firstMonth} – ${lastDay} ${lastMonth} ${firstYear}`
  }
  return `${firstDay} ${firstMonth} ${firstYear} – ${lastDay} ${lastMonth} ${lastYear}`
}

export function getWeekdayNames(weekStart: number = DEFAULT_WEEK_START): string[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return Array.from({ length: 7 }, (_, index) => names[(weekStart + index) % 7]!)
}

export function isSameMonth(isoDate: string, monthIso: string): boolean {
  return isoDate.slice(0, 7) === monthIso.slice(0, 7)
}

/** Inclusive bounds of the calendar month itself, ignoring grid padding. */
export function getMonthRange(monthIso: string): { start: string; end: string } {
  const start = getMonthStart(monthIso)
  return { start, end: addDays(shiftMonth(start, 1), -1) }
}

/** Short month name, for compact badges. */
export function getMonthName(monthIso: string): string {
  const monthIndex = Number(monthIso.slice(5, 7)) - 1
  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return ''
  return MONTH_NAMES[monthIndex] ?? ''
}

/**
 * Count events falling inside an inclusive range.
 *
 * Used so a heading such as "October 2026 · 48 events" counts only October,
 * even though the month grid also renders a few days from the adjacent months.
 */
export function countEventsBetween(
  events: readonly CalendarEvent[],
  startIso: string,
  endIso: string,
): number {
  return events.filter((event) => event.date >= startIso && event.date <= endIso).length
}

/** Every local date in an inclusive range. */
export function buildDateRange(startIso: string, endIso: string): string[] {
  const dates: string[] = []
  let cursor = startIso

  while (cursor <= endIso && dates.length < 400) {
    dates.push(cursor)
    if (cursor === endIso) break
    cursor = addDays(cursor, 1)
  }

  return dates
}

// ---------------------------------------------------------------------------
// Event derivation
// ---------------------------------------------------------------------------

/**
 * Expand subject schedules into concrete class sessions for a date window.
 * Archived subjects produce no future recurring classes, so a finished course
 * stops appearing on the calendar.
 */
export function expandClassSessions(
  subjects: readonly Subject[],
  startIso: string,
  endIso: string,
): DatedClassSession[] {
  const sessions: DatedClassSession[] = []
  const rangeDates = buildDateRange(startIso, endIso)

  for (const subject of subjects) {
    if (subject.archived) continue

    for (const slot of subject.schedule) {
      for (const isoDate of rangeDates) {
        if (weekdayOf(isoDate) !== slot.dayOfWeek) continue

        sessions.push({
          id: `ses-${subject.id}-${slot.dayOfWeek}-${slot.startTime.replace(':', '')}-${isoDate}`,
          subjectId: subject.id,
          name: subject.name,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          location: subject.location,
          isoDate,
        })
      }
    }
  }

  return sessions
}

/**
 * Build the events for a date window from existing records.
 *
 * - Every assignment whose due date falls in the window becomes one event,
 *   including completed ones and those belonging to archived subjects, so
 *   history stays visible.
 * - Recurring classes come from non-archived subject schedules.
 */
export function buildCalendarEvents(
  startIso: string,
  endIso: string,
  subjects: readonly Subject[],
  assignments: readonly Assignment[],
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]))

  for (const assignment of assignments) {
    if (assignment.dueDate < startIso || assignment.dueDate > endIso) continue

    const subject = subjectById.get(assignment.subjectId)

    events.push({
      id: `asg-${assignment.id}`,
      kind: 'assignment',
      date: assignment.dueDate,
      subjectId: assignment.subjectId,
      sortTime: '00:00',
      title: assignment.title,
      subjectName: subject?.name ?? 'Unknown subject',
      subjectCode: subject?.code ?? '',
      subjectColor: subject?.color ?? 'bg-slate-300',
      priority: assignment.priority,
      status: assignment.status,
      progress: assignment.progress ?? 0,
    })
  }

  for (const session of expandClassSessions(subjects, startIso, endIso)) {
    const subject = subjectById.get(session.subjectId)

    events.push({
      id: `cls-${session.id}`,
      kind: 'class',
      date: session.isoDate,
      subjectId: session.subjectId,
      sortTime: session.startTime,
      title: session.name,
      subjectName: subject?.name ?? session.name,
      subjectCode: subject?.code ?? '',
      subjectColor: subject?.color ?? 'bg-slate-400',
      startTime: session.startTime,
      endTime: session.endTime,
      location: session.location,
      instructor: subject?.instructor,
    })
  }

  return events
}

/** Deterministic per-day ordering: all-day deadlines first, then timed. */
export function sortEventsForDay(events: readonly CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.sortTime !== b.sortTime) return a.sortTime < b.sortTime ? -1 : 1
    if (a.title !== b.title) return a.title < b.title ? -1 : 1
    return a.id === b.id ? 0 : a.id < b.id ? -1 : 1
  })
}

/** Group events by local date, each day already sorted. */
export function groupEventsByDate(
  events: readonly CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()

  for (const event of events) {
    const existing = grouped.get(event.date)
    if (existing) {
      existing.push(event)
    } else {
      grouped.set(event.date, [event])
    }
  }

  for (const [date, dayEvents] of grouped) {
    grouped.set(date, sortEventsForDay(dayEvents))
  }

  return grouped
}
