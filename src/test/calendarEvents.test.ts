import { describe, expect, it } from 'vitest'

import {
  DEFAULT_WEEK_START,
  buildCalendarEvents,
  buildDateRange,
  buildMonthGrid,
  buildWeekDates,
  expandClassSessions,
  getDaysInMonth,
  getMonthLabel,
  getMonthName,
  getMonthRange,
  countEventsBetween,
  getMonthStart,
  getWeekLabel,
  getWeekdayNames,
  groupEventsByDate,
  isSameMonth,
  shiftMonth,
  shiftWeek,
  sortEventsForDay,
  startOfCalendarWeek,
} from '../lib/calendarEvents'
import { addDays, daysUntilFrom, getTodayDateString } from '../lib/date'
import type { Assignment, Subject } from '../types'

const TODAY = '2026-10-11' // a Sunday

function subject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: 'sub-1',
    name: 'Calculus II',
    code: 'MATH 201',
    color: 'bg-sky-500',
    instructor: 'Dr. Amara Patel',
    semester: 'Fall 2026',
    credits: 4,
    grade: 88,
    location: 'Room 204',
    archived: false,
    schedule: [],
    ...overrides,
  }
}

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'asg-1',
    title: 'Problem Set 1',
    subjectId: 'sub-1',
    type: 'homework',
    priority: 'medium',
    status: 'pending',
    dueDate: TODAY,
    estimatedHours: 2,
    description: '',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Month length and boundaries
// ---------------------------------------------------------------------------

describe('getDaysInMonth', () => {
  it('counts days per month', () => {
    expect(getDaysInMonth('2026-01-10')).toBe(31)
    expect(getDaysInMonth('2026-02-10')).toBe(28)
    expect(getDaysInMonth('2026-04-10')).toBe(30)
    expect(getDaysInMonth('2026-12-10')).toBe(31)
  })

  it('handles leap years', () => {
    expect(getDaysInMonth('2024-02-10')).toBe(29)
    expect(getDaysInMonth('2000-02-10')).toBe(29)
    expect(getDaysInMonth('2026-02-10')).toBe(28)
    expect(getDaysInMonth('2100-02-10')).toBe(28)
  })

  it('falls back safely on malformed input', () => {
    expect(getDaysInMonth('not-a-date')).toBe(31)
  })
})

describe('shiftMonth', () => {
  it('moves within a year', () => {
    expect(shiftMonth('2026-01-15', 1)).toBe('2026-02-01')
    expect(shiftMonth('2026-03-15', -1)).toBe('2026-02-01')
    expect(shiftMonth('2026-01-15', 12)).toBe('2027-01-01')
  })

  it('rolls across the year boundary in both directions', () => {
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-01')
    expect(shiftMonth('2026-01-15', -1)).toBe('2025-12-01')
  })

  it('spans a leap-year February', () => {
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-01')
    expect(shiftMonth('2024-02-29', 1)).toBe('2024-03-01')
    expect(shiftMonth('2024-03-01', -1)).toBe('2024-02-01')
  })

  it('always returns the first of the month', () => {
    for (let month = 1; month <= 12; month += 1) {
      const iso = `2026-${String(month).padStart(2, '0')}-15`
      expect(getMonthStart(shiftMonth(iso, 3))).toBe(shiftMonth(iso, 3))
    }
  })
})

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

describe('buildMonthGrid', () => {
  it('produces whole weeks only', () => {
    for (const month of ['2026-01', '2026-02', '2026-04', '2026-12', '2024-02']) {
      const cells = buildMonthGrid(`${month}-01`, { todayIso: TODAY })
      expect(cells.length % 7).toBe(0)
    }
  })

  it('covers every day of the month exactly once', () => {
    const cells = buildMonthGrid('2026-10-01', { todayIso: TODAY })
    const current = cells.filter((cell) => cell.isCurrentMonth)
    expect(current).toHaveLength(31)
    expect(current.map((cell) => cell.dayOfMonth)).toEqual(
      Array.from({ length: 31 }, (_, index) => index + 1),
    )
  })

  it('covers a February in a leap year', () => {
    const cells = buildMonthGrid('2024-02-01', { todayIso: TODAY })
    expect(cells.filter((cell) => cell.isCurrentMonth)).toHaveLength(29)
  })

  it('starts on a Monday for the Monday-first default', () => {
    for (const month of ['2026-01-01', '2026-02-01', '2026-10-01']) {
      const cells = buildMonthGrid(month, { todayIso: TODAY })
      expect(cells[0]?.weekday).toBe(1)
    }
  })

  it('honours a Sunday week start when asked', () => {
    const cells = buildMonthGrid('2026-10-01', { todayIso: TODAY, weekStart: 0 })
    expect(cells[0]?.weekday).toBe(0)
    expect(DEFAULT_WEEK_START).toBe(1)
  })

  it('marks the supplied today', () => {
    const cells = buildMonthGrid('2026-10-01', { todayIso: TODAY })
    const todayCells = cells.filter((cell) => cell.isToday)
    expect(todayCells).toHaveLength(1)
    expect(todayCells[0]?.isoDate).toBe(TODAY)
    expect(todayCells[0]?.dayOfMonth).toBe(11)
  })

  it('includes adjacent-month days so the grid stays rectangular', () => {
    // October 2026 starts on a Thursday, so the first week needs Mon-Wed from
    // September.
    const cells = buildMonthGrid('2026-10-01', { todayIso: TODAY })
    expect(cells[0]?.isoDate).toBe('2026-09-28')
    expect(cells[0]?.isCurrentMonth).toBe(false)
  })

  it('marks the last day of the month correctly', () => {
    const cells = buildMonthGrid('2026-10-01', { todayIso: TODAY })
    const october = cells.filter((cell) => cell.isCurrentMonth)
    expect(october[october.length - 1]?.isoDate).toBe('2026-10-31')
  })
})

// ---------------------------------------------------------------------------
// Week grid and navigation
// ---------------------------------------------------------------------------

describe('buildWeekDates', () => {
  it('returns seven consecutive dates', () => {
    const dates = buildWeekDates('2026-10-08', DEFAULT_WEEK_START)
    expect(dates).toHaveLength(7)
    expect(dates[0]).toBe('2026-10-05')
    expect(dates[6]).toBe('2026-10-11')
    expect(daysUntilFrom(dates[6]!, dates[0]!)).toBe(6)
  })

  it('clamps a mid-week anchor back to the Monday', () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const anchor = addDays('2026-10-05', offset)
      expect(startOfCalendarWeek(anchor, DEFAULT_WEEK_START)).toBe('2026-10-05')
    }
  })

  it('supports a Sunday week start', () => {
    const dates = buildWeekDates('2026-10-08', 0)
    expect(dates[0]).toBe('2026-10-04')
  })

  it('shifts by whole weeks', () => {
    expect(shiftWeek('2026-10-05', 1)).toBe('2026-10-12')
    expect(shiftWeek('2026-10-05', -1)).toBe('2026-09-28')
    expect(shiftWeek('2026-01-01', -1)).toBe('2025-12-25')
  })

  it('crosses a year boundary', () => {
    const dates = buildWeekDates('2027-01-01', DEFAULT_WEEK_START)
    expect(dates[0]).toBe('2026-12-28')
    expect(dates[6]).toBe('2027-01-03')
  })
})

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

describe('labels', () => {
  it('formats a month label', () => {
    expect(getMonthLabel('2026-10-01')).toBe('October 2026')
    expect(getMonthLabel('2026-01-01')).toBe('January 2026')
    expect(getMonthLabel('2026-12-01')).toBe('December 2026')
  })

  it('labels a week inside one month', () => {
    expect(getWeekLabel(buildWeekDates('2026-10-08', 1))).toBe('5 – 11 October 2026')
  })

  it('labels a week spanning two months', () => {
    expect(getWeekLabel(buildWeekDates('2026-11-01', 1))).toBe('26 October – 1 November 2026')
  })

  it('labels a week spanning two years', () => {
    expect(getWeekLabel(buildWeekDates('2027-01-01', 1))).toBe('28 December 2026 – 3 January 2027')
  })

  it('orders weekday names by the week start', () => {
    expect(getWeekdayNames(1)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(getWeekdayNames(0)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  })

  it('compares months', () => {
    expect(isSameMonth('2026-10-01', '2026-10-31')).toBe(true)
    expect(isSameMonth('2026-09-30', '2026-10-01')).toBe(false)
  })
})

describe('buildDateRange', () => {
  it('is inclusive at both ends', () => {
    expect(buildDateRange('2026-10-05', '2026-10-08')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ])
  })

  it('returns a single date when start equals end', () => {
    expect(buildDateRange(TODAY, TODAY)).toEqual([TODAY])
  })

  it('returns nothing for a reversed range', () => {
    expect(buildDateRange('2026-10-10', '2026-10-01')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Event generation
// ---------------------------------------------------------------------------

describe('expandClassSessions', () => {
  it('materialises a recurring weekly class onto every matching date', () => {
    const subjects = [subject({ schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:15' }] })]
    const sessions = expandClassSessions(subjects, '2026-10-05', '2026-10-11')

    // Monday only, within that week.
    expect(sessions).toHaveLength(1)
    expect(sessions[0]?.isoDate).toBe('2026-10-05')
    expect(sessions[0]?.startTime).toBe('09:00')
    expect(sessions[0]?.endTime).toBe('10:15')
  })

  it('repeats every week across a longer range', () => {
    const subjects = [subject({ schedule: [{ dayOfWeek: 3, startTime: '12:00', endTime: '12:50' }] })]
    const sessions = expandClassSessions(subjects, '2026-10-01', '2026-10-31')

    // Wednesdays in October 2026: 7, 14, 21, 28.
    expect(sessions.map((session) => session.isoDate)).toEqual([
      '2026-10-07',
      '2026-10-14',
      '2026-10-21',
      '2026-10-28',
    ])
  })

  it('does not generate future classes for archived subjects', () => {
    const subjects = [
      subject({ id: 'gone', archived: true, schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }] }),
      subject({ id: 'kept', schedule: [{ dayOfWeek: 1, startTime: '11:00', endTime: '12:00' }] }),
    ]
    const sessions = expandClassSessions(subjects, '2026-10-05', '2026-10-11')

    expect(sessions.map((session) => session.subjectId)).toEqual(['kept'])
  })

  it('keeps several subjects on the same day', () => {
    const subjects = [
      subject({ id: 'a', schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }] }),
      subject({ id: 'b', schedule: [{ dayOfWeek: 1, startTime: '14:00', endTime: '15:00' }] }),
    ]
    expect(expandClassSessions(subjects, '2026-10-05', '2026-10-05')).toHaveLength(2)
  })
})

describe('buildCalendarEvents', () => {
  it('includes an assignment deadline inside the window', () => {
    const events = buildCalendarEvents(TODAY, TODAY, [subject()], [assignment()])
    const deadlines = events.filter((event) => event.kind === 'assignment')

    expect(deadlines).toHaveLength(1)
    expect(deadlines[0]).toMatchObject({
      title: 'Problem Set 1',
      date: TODAY,
      subjectName: 'Calculus II',
      subjectCode: 'MATH 201',
      priority: 'medium',
      status: 'pending',
    })
  })

  it('excludes deadlines outside the window', () => {
    const events = buildCalendarEvents(
      TODAY,
      TODAY,
      [subject()],
      [assignment({ dueDate: addDays(TODAY, 1) })],
    )
    expect(events.filter((event) => event.kind === 'assignment')).toHaveLength(0)
  })

  it('keeps completed assignments on the calendar', () => {
    const events = buildCalendarEvents(
      TODAY,
      TODAY,
      [subject()],
      [assignment({ status: 'completed', progress: 100 })],
    )
    const deadline = events.find((event) => event.kind === 'assignment')

    expect(deadline?.status).toBe('completed')
    expect(deadline?.progress).toBe(100)
  })

  it('keeps assignments that belong to an archived subject', () => {
    const subjects = [subject({ archived: true })]
    const events = buildCalendarEvents(TODAY, TODAY, subjects, [assignment()])

    expect(events.filter((event) => event.kind === 'assignment')).toHaveLength(1)
    expect(events.filter((event) => event.kind === 'class')).toHaveLength(0)
  })

  it('labels an assignment whose subject was deleted', () => {
    const events = buildCalendarEvents(TODAY, TODAY, [], [assignment()])
    const deadline = events.find((event) => event.kind === 'assignment')

    expect(deadline?.subjectName).toBe('Unknown subject')
    expect(deadline?.subjectCode).toBe('')
  })

  it('emits unique ids for repeated occurrences', () => {
    const subjects = [subject({ schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }] })]
    const events = buildCalendarEvents('2026-10-05', '2026-10-12', subjects, [])
    const ids = events.map((event) => event.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(2)
  })

  it('carries class detail for the details dialog', () => {
    const subjects = [subject({ schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:15' }] })]
    const events = buildCalendarEvents('2026-10-05', '2026-10-05', subjects, [])
    const cls = events[0]

    expect(cls).toMatchObject({
      kind: 'class',
      startTime: '09:00',
      endTime: '10:15',
      location: 'Room 204',
      instructor: 'Dr. Amara Patel',
    })
  })
})

describe('sortEventsForDay', () => {
  it('puts all-day deadlines before timed classes', () => {
    const events = buildCalendarEvents(
      TODAY,
      TODAY,
      [subject({ schedule: [{ dayOfWeek: 0, startTime: '09:00', endTime: '10:00' }] })],
      [assignment()],
    )
    const sorted = sortEventsForDay(events)

    expect(sorted[0]?.kind).toBe('assignment')
    expect(sorted[1]?.kind).toBe('class')
  })

  it('orders timed classes by start time', () => {
    const subjects = [
      subject({
        schedule: [
          { dayOfWeek: 0, startTime: '14:00', endTime: '15:00' },
          { dayOfWeek: 0, startTime: '09:00', endTime: '10:00' },
          { dayOfWeek: 0, startTime: '11:00', endTime: '12:00' },
        ],
      }),
    ]
    const sorted = sortEventsForDay(buildCalendarEvents(TODAY, TODAY, subjects, []))
    expect(sorted.map((event) => event.sortTime)).toEqual(['09:00', '11:00', '14:00'])
  })

  it('is deterministic when two events share a time', () => {
    const subjects = [
      subject({
        schedule: [
          { dayOfWeek: 0, startTime: '09:00', endTime: '10:00' },
          { dayOfWeek: 0, startTime: '09:00', endTime: '10:00' },
        ],
      }),
    ]
    const first = sortEventsForDay(buildCalendarEvents(TODAY, TODAY, subjects, []))
    const second = sortEventsForDay(buildCalendarEvents(TODAY, TODAY, subjects, []))

    expect(first.map((event) => event.id)).toEqual(second.map((event) => event.id))
  })
})

describe('groupEventsByDate', () => {
  it('buckets events by their local date', () => {
    const subjects = [subject({ schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }] })]
    const events = buildCalendarEvents(
      '2026-10-05',
      '2026-10-12',
      subjects,
      [assignment({ dueDate: '2026-10-05' })],
    )

    const grouped = groupEventsByDate(events)
    expect(grouped.get('2026-10-05')).toHaveLength(2)
    expect(grouped.get('2026-10-12')).toHaveLength(1)
    expect(grouped.get('2026-10-06')).toBeUndefined()
  })

  it('sorts each day', () => {
    const subjects = [
      subject({
        schedule: [
          { dayOfWeek: 0, startTime: '11:00', endTime: '12:00' },
          { dayOfWeek: 0, startTime: '09:00', endTime: '10:00' },
        ],
      }),
    ]
    const grouped = groupEventsByDate(
      buildCalendarEvents(TODAY, TODAY, subjects, [assignment()]),
    )

    expect(grouped.get(TODAY)!.map((event) => event.sortTime)).toEqual([
      '00:00',
      '09:00',
      '11:00',
    ])
  })
})

// ---------------------------------------------------------------------------
// Count ranges and adjacent-month padding
// ---------------------------------------------------------------------------

describe('count ranges', () => {
  it('bounds the month to its own first and last day', () => {
    expect(getMonthRange('2026-10-15')).toEqual({ start: '2026-10-01', end: '2026-10-31' })
    expect(getMonthRange('2024-02-10')).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(getMonthRange('2026-01-10')).toEqual({ start: '2026-01-01', end: '2026-01-31' })
    expect(getMonthRange('2026-12-10')).toEqual({ start: '2026-12-01', end: '2026-12-31' })
  })

  it('names a month for badges', () => {
    expect(getMonthName('2026-10-01')).toBe('October')
    expect(getMonthName('2026-01-01')).toBe('January')
    expect(getMonthName('nope')).toBe('')
  })

  it('counts only events inside the month', () => {
    const subjects = [subject()]
    const assignments = [
      assignment({ id: 'in-1', dueDate: '2026-10-05' }),
      assignment({ id: 'in-2', dueDate: '2026-10-31' }),
      // These land in the padding days the month grid still displays.
      assignment({ id: 'before', dueDate: '2026-09-28' }),
      assignment({ id: 'after', dueDate: '2026-11-02' }),
    ]

    const range = getMonthRange('2026-10-15')
    const events = buildCalendarEvents('2026-09-28', '2026-11-08', subjects, [])

    // Sanity: all four deadlines exist in the padded render window.
    expect(events.filter((event) => event.kind === 'assignment')).toHaveLength(0)

    const padded = buildCalendarEvents('2026-09-28', '2026-11-08', subjects, assignments)
    expect(padded.filter((event) => event.kind === 'assignment')).toHaveLength(4)
    expect(countEventsBetween(padded, range.start, range.end)).toBe(2)
  })

  it('counts a week window as exactly seven days', () => {
    const subjects = [subject()]
    const dates = buildWeekDates('2026-10-08', DEFAULT_WEEK_START)

    const events = buildCalendarEvents(dates[0]!, dates[6]!, subjects, [])
    const distinctDates = new Set(events.map((event) => event.date))

    // Every event falls inside the seven-day window, and the window is seven days.
    expect(dates).toHaveLength(7)
    for (const date of distinctDates) {
      expect(dates).toContain(date)
    }
    expect(countEventsBetween(events, dates[0]!, dates[6]!)).toBe(events.length)
  })

  it('never double counts an adjacent-month day', () => {
    const cells = buildMonthGrid('2026-10-01', { todayIso: TODAY })
    const dates = cells.map((cell) => cell.isoDate)

    // Each date appears exactly once in the grid.
    expect(new Set(dates).size).toBe(dates.length)

    const rangeStart = dates[0]!
    const rangeEnd = dates[dates.length - 1]!

    // October 2026 starts on a Thursday, so the grid is padded at both ends.
    expect(rangeStart < '2026-10-01').toBe(true)
    expect(rangeEnd > '2026-10-31').toBe(true)

    // Events generated for the padded window group to exactly the dates shown.
    const subjects = [
      subject({
        schedule: [
          { dayOfWeek: 0, startTime: '09:00', endTime: '10:00' },
          { dayOfWeek: 6, startTime: '09:00', endTime: '10:00' },
        ],
      }),
    ]
    const grouped = groupEventsByDate(
      buildCalendarEvents(rangeStart, rangeEnd, subjects, []),
    )

    let total = 0
    for (const date of dates) {
      total += grouped.get(date)?.length ?? 0
    }

    // Summing per-cell equals generating over the whole window: no date is
    // counted twice, and none is dropped.
    const all = buildCalendarEvents(rangeStart, rangeEnd, subjects, [])
    expect(total).toBe(all.length)
    expect(grouped.size).toBeLessThanOrEqual(dates.length)
  })

  it('keeps the month badge a subset of the padded grid', () => {
    const padded = buildCalendarEvents('2026-09-28', '2026-11-08', [subject()], [])
    const month = getMonthRange('2026-10-15')

    const monthCount = countEventsBetween(padded, month.start, month.end)
    expect(monthCount).toBeLessThanOrEqual(padded.length)
    // Only in-month events contribute to the month figure.
    expect(monthCount).toBe(
      padded.filter((event) => event.date.slice(0, 7) === '2026-10').length,
    )
  })
})

// ---------------------------------------------------------------------------
// Local-date correctness
// ---------------------------------------------------------------------------

describe('local date correctness', () => {
  it('does not shift a deadline across a day boundary', () => {
    // The environment for this project is UTC+8, where any toISOString()-based
    // conversion would roll dates back a day.
    const events = buildCalendarEvents(TODAY, TODAY, [subject()], [assignment({ dueDate: TODAY })])
    expect(events[0]?.date).toBe(TODAY)
  })

  it('treats month-end and month-start as distinct days', () => {
    const events = buildCalendarEvents(
      '2026-10-31',
      '2026-11-01',
      [subject()],
      [
        assignment({ id: 'x', dueDate: '2026-10-31' }),
        assignment({ id: 'y', dueDate: '2026-11-01' }),
      ],
    )

    expect(events.map((event) => event.date).sort()).toEqual(['2026-10-31', '2026-11-01'])
  })

  it('keeps the month grid aligned across a year rollover', () => {
    const december = buildMonthGrid('2026-12-01', { todayIso: TODAY })
    const january = buildMonthGrid('2027-01-01', { todayIso: TODAY })

    const decemberLast = december[december.length - 1]?.isoDate ?? ''
    const januaryFirst = january[0]?.isoDate ?? ''

    expect(decemberLast <= '2027-01-03').toBe(true)
    expect(januaryFirst >= '2026-12-27').toBe(true)
  })

  it('never emits a date outside the requested window', () => {
    const subjects = [
      subject({
        schedule: [
          { dayOfWeek: 0, startTime: '09:00', endTime: '10:00' },
          { dayOfWeek: 6, startTime: '09:00', endTime: '10:00' },
        ],
      }),
    ]
    const events = buildCalendarEvents('2026-10-05', '2026-10-11', subjects, [])

    for (const event of events) {
      expect(event.date >= '2026-10-05' && event.date <= '2026-10-11').toBe(true)
    }
  })

  it('agrees with the shared date helpers about today', () => {
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(daysUntilFrom(TODAY, TODAY)).toBe(0)
  })
})
