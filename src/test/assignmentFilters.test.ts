import { describe, expect, it } from 'vitest'

import {
  DEADLINE_FILTER_OPTIONS,
  DEFAULT_FILTERS,
  PRIORITY_FILTER_OPTIONS,
  SORT_OPTIONS,
  countActiveFilters,
  filterAssignments,
  hasActiveFilters,
  isAssignmentOverdue,
  sortAssignmentsBy,
  type AssignmentFilters,
} from '../lib/assignmentFilters'
import { addDays, daysUntil, daysUntilFrom, isInCurrentMonth } from '../lib/date'
import { getAssignmentProgress, reconcileProgress, validateProgress } from '../lib/assignmentProgress'
import type { Assignment, AssignmentPriority, AssignmentStatus } from '../types'

const TODAY = '2026-10-11' // a Sunday

function make(
  id: string,
  overrides: Partial<Assignment> = {},
): Assignment {
  return {
    id,
    title: `Assignment ${id}`,
    subjectId: 'sub-1',
    type: 'homework',
    priority: 'medium',
    status: 'pending',
    dueDate: TODAY,
    estimatedHours: 2,
    description: 'A description',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  }
}

function filters(overrides: Partial<AssignmentFilters> = {}): AssignmentFilters {
  return { ...DEFAULT_FILTERS, ...overrides }
}

/** A small, stable data set covering every filter dimension. */
function sample(): Assignment[] {
  return [
    make('a-pending-today', {
      title: 'Read chapter 4',
      description: 'Notes on colonial trade',
      subjectId: 'sub-1',
      status: 'pending',
      priority: 'low',
      dueDate: TODAY,
      createdAt: '2026-10-05T10:00:00.000Z',
    }),
    make('b-inprogress', {
      title: 'Problem set 5',
      subjectId: 'sub-2',
      status: 'in-progress',
      priority: 'high',
      dueDate: addDays(TODAY, 2),
      createdAt: '2026-10-02T10:00:00.000Z',
    }),
    make('c-overdue', {
      title: 'Lab report',
      subjectId: 'sub-1',
      status: 'in-progress',
      priority: 'medium',
      dueDate: addDays(TODAY, -3),
      createdAt: '2026-10-01T10:00:00.000Z',
    }),
    make('d-completed', {
      title: 'Essay on modernism',
      subjectId: 'sub-2',
      status: 'completed',
      priority: 'high',
      dueDate: addDays(TODAY, -10),
      createdAt: '2026-09-20T10:00:00.000Z',
    }),
    make('e-next-week', {
      title: 'Group presentation',
      subjectId: 'sub-3',
      status: 'pending',
      priority: 'medium',
      dueDate: addDays(TODAY, 6),
      createdAt: '2026-10-08T10:00:00.000Z',
    }),
  ]
}

function ids(list: Assignment[]): string[] {
  return list.map((assignment) => assignment.id)
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe('search', () => {
  it('matches on title, case-insensitively', () => {
    const result = filterAssignments(sample(), filters({ query: 'PROBLEM SET' }), TODAY)
    expect(ids(result)).toEqual(['b-inprogress'])
  })

  it('matches on description', () => {
    const result = filterAssignments(sample(), filters({ query: 'colonial' }), TODAY)
    expect(ids(result)).toEqual(['a-pending-today'])
  })

  it('ignores surrounding whitespace', () => {
    const result = filterAssignments(sample(), filters({ query: '  essay  ' }), TODAY)
    expect(ids(result)).toEqual(['d-completed'])
  })

  it('returns nothing for a query that matches neither field', () => {
    expect(filterAssignments(sample(), filters({ query: 'zzzz' }), TODAY)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Individual filters
// ---------------------------------------------------------------------------

describe('filters', () => {
  it('filters by subject', () => {
    expect(ids(filterAssignments(sample(), filters({ subjectId: 'sub-1' }), TODAY))).toEqual([
      'a-pending-today',
      'c-overdue',
    ])
  })

  it('filters by status', () => {
    expect(ids(filterAssignments(sample(), filters({ status: 'in-progress' }), TODAY)).sort()).toEqual(
      ['b-inprogress', 'c-overdue'].sort(),
    )
    expect(ids(filterAssignments(sample(), filters({ status: 'completed' }), TODAY))).toEqual([
      'd-completed',
    ])
  })

  it('treats overdue as incomplete and past its deadline', () => {
    const result = filterAssignments(sample(), filters({ status: 'overdue' }), TODAY)
    expect(ids(result)).toEqual(['c-overdue'])
  })

  it('never reports a completed assignment as overdue, however old', () => {
    const old = [make('old', { status: 'completed', dueDate: addDays(TODAY, -400) })]
    expect(isAssignmentOverdue(old[0]!, TODAY)).toBe(false)
    expect(filterAssignments(old, filters({ status: 'overdue' }), TODAY)).toHaveLength(0)
  })

  it('filters by priority', () => {
    expect(ids(filterAssignments(sample(), filters({ priority: 'high' }), TODAY)).sort()).toEqual(
      ['b-inprogress', 'd-completed'].sort(),
    )
  })

  it('filters by deadline range', () => {
    expect(ids(filterAssignments(sample(), filters({ deadline: 'today' }), TODAY))).toEqual([
      'a-pending-today',
    ])
    expect(ids(filterAssignments(sample(), filters({ deadline: 'next-7-days' }), TODAY)).sort()).toEqual(
      ['a-pending-today', 'b-inprogress', 'e-next-week'].sort(),
    )
  })
})

describe('month filter', () => {
  it('keeps dates inside the current local month', () => {
    const thisMonth = make('in-month', { dueDate: `${TODAY.slice(0, 7)}-28` })
    const nextMonth = make('next-month', { dueDate: '2026-11-02' })
    const result = filterAssignments([thisMonth, nextMonth], filters({ deadline: 'this-month' }), TODAY)

    expect(ids(result)).toEqual(['in-month'])
  })

  it('aligns with isInCurrentMonth', () => {
    expect(isInCurrentMonth('2026-10-31', TODAY)).toBe(true)
    expect(isInCurrentMonth('2026-11-01', TODAY)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Combined filters
// ---------------------------------------------------------------------------

describe('combined filters', () => {
  it('applies every dimension with AND', () => {
    const result = filterAssignments(
      sample(),
      filters({ subjectId: 'sub-2', status: 'completed', priority: 'high' }),
      TODAY,
    )
    expect(ids(result)).toEqual(['d-completed'])
  })

  it('combines search with subject and status', () => {
    const result = filterAssignments(
      sample(),
      filters({ query: 'problem', subjectId: 'sub-2', status: 'in-progress' }),
      TODAY,
    )
    expect(ids(result)).toEqual(['b-inprogress'])
  })

  it('returns nothing when one filter excludes the others', () => {
    const result = filterAssignments(
      sample(),
      filters({ subjectId: 'sub-1', status: 'completed' }),
      TODAY,
    )
    expect(result).toHaveLength(0)
  })

  it('combines search, status and deadline range', () => {
    const result = filterAssignments(
      sample(),
      filters({ query: 'presentation', status: 'pending', deadline: 'next-7-days' }),
      TODAY,
    )
    expect(ids(result)).toEqual(['e-next-week'])
  })

  it('returns everything when no filter is set', () => {
    expect(filterAssignments(sample(), DEFAULT_FILTERS, TODAY)).toHaveLength(sample().length)
  })
})

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe('sorting', () => {
  it('sorts by earliest deadline first', () => {
    // d-completed is the oldest (-10 days), then c-overdue (-3).
    const result = sortAssignmentsBy(sample(), 'deadline-asc')
    expect(ids(result)).toEqual([
      'd-completed',
      'c-overdue',
      'a-pending-today',
      'b-inprogress',
      'e-next-week',
    ])
  })

  it('sorts by latest deadline first', () => {
    const result = sortAssignmentsBy(sample(), 'deadline-desc')
    expect(ids(result)).toEqual([
      'e-next-week',
      'b-inprogress',
      'a-pending-today',
      'c-overdue',
      'd-completed',
    ])
  })

  it('sorts by highest priority first', () => {
    const result = sortAssignmentsBy(sample(), 'priority-desc')
    const priorities = result.map((assignment) => assignment.priority)
    expect(priorities).toEqual(['high', 'high', 'medium', 'medium', 'low'])
  })

  it('sorts by newest created first', () => {
    const result = sortAssignmentsBy(sample(), 'created-desc')
    expect(ids(result)).toEqual(['e-next-week', 'a-pending-today', 'b-inprogress', 'c-overdue', 'd-completed'])
  })

  it('breaks deadline ties with priority', () => {
    const tied = [
      make('low', { priority: 'low', dueDate: TODAY }),
      make('high', { priority: 'high', dueDate: TODAY }),
      make('medium', { priority: 'medium', dueDate: TODAY }),
    ]
    expect(ids(sortAssignmentsBy(tied, 'deadline-asc'))).toEqual(['high', 'medium', 'low'])
  })

  it('breaks priority ties with due date', () => {
    const tied = [
      make('later', { priority: 'high', dueDate: addDays(TODAY, 5) }),
      make('sooner', { priority: 'high', dueDate: addDays(TODAY, 1) }),
    ]
    expect(ids(sortAssignmentsBy(tied, 'priority-desc'))).toEqual(['sooner', 'later'])
  })

  it('breaks creation ties with the id, keeping the order deterministic', () => {
    const tied = [
      make('zeta', { createdAt: '2026-10-01T10:00:00.000Z', dueDate: TODAY }),
      make('alpha', { createdAt: '2026-10-01T10:00:00.000Z', dueDate: TODAY }),
    ]

    const first = ids(sortAssignmentsBy(tied, 'created-desc'))
    const second = ids(sortAssignmentsBy(tied, 'created-desc'))
    expect(first).toEqual(second)
    expect(first).toEqual(['alpha', 'zeta'])
  })

  it('does not mutate the input array', () => {
    const input = sample()
    const copy = [...input]
    sortAssignmentsBy(input, 'priority-desc')
    expect(input).toEqual(copy)
  })

  it('produces a stable order across repeated runs of every sort key', () => {
    const input = sample()
    for (const option of SORT_OPTIONS) {
      const first = ids(sortAssignmentsBy(input, option.value))
      const second = ids(sortAssignmentsBy(input, option.value))
      expect(first).toEqual(second)
    }
  })
})

// ---------------------------------------------------------------------------
// Filter bookkeeping
// ---------------------------------------------------------------------------

describe('filter bookkeeping', () => {
  it('counts each diverging dimension once', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0)
    expect(countActiveFilters(filters({ query: 'x' }))).toBe(1)
    expect(
      countActiveFilters(filters({ query: 'x', subjectId: 'sub-1', status: 'completed' })),
    ).toBe(3)
  })

  it('treats a whitespace-only query as no filter', () => {
    expect(countActiveFilters(filters({ query: '   ' }))).toBe(0)
    expect(hasActiveFilters(filters({ query: '   ' }))).toBe(false)
  })

  it('reports whether any filter is set', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters(filters({ priority: 'low' }))).toBe(true)
  })

  it('offers the full set of deadline and priority options', () => {
    expect(DEADLINE_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      'all',
      'today',
      'next-7-days',
      'this-month',
    ])
    expect(PRIORITY_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      'all',
      'low',
      'medium',
      'high',
    ])
  })
})

// ---------------------------------------------------------------------------
// Deadline arithmetic
// ---------------------------------------------------------------------------

describe('deadline arithmetic', () => {
  it('uses local calendar dates, so UTC offsets cannot shift a day', () => {
    // Simulates the UTC+8 environment this project is developed in.
    expect(daysUntil('2026-10-11')).toBe(0)
    expect(daysUntil('2026-10-12')).toBe(1)
    expect(daysUntil('2026-10-10')).toBe(-1)
  })

  it('computes day differences between two explicit dates', () => {
    expect(daysUntilFrom('2026-10-12', '2026-10-11')).toBe(1)
    expect(daysUntilFrom('2026-10-11', '2026-10-11')).toBe(0)
    expect(daysUntilFrom('2026-10-05', '2026-10-11')).toBe(-6)
    // Across a DST boundary in most northern locales.
    expect(daysUntilFrom('2026-11-01', '2026-10-11')).toBe(21)
  })

  it('treats an assignment due today as not overdue', () => {
    expect(isAssignmentOverdue(make('today'), TODAY)).toBe(false)
    expect(isAssignmentOverdue(make('tomorrow', { dueDate: addDays(TODAY, 1) }), TODAY)).toBe(false)
    expect(isAssignmentOverdue(make('yesterday', { dueDate: addDays(TODAY, -1) }), TODAY)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Progress rules
// ---------------------------------------------------------------------------

describe('progress rules', () => {
  it('always reports completed work as 100', () => {
    expect(reconcileProgress('completed', 0)).toBe(100)
    expect(reconcileProgress('completed', 45)).toBe(100)
    expect(reconcileProgress('completed', undefined)).toBe(100)
    expect(reconcileProgress('completed', 120)).toBe(100)
  })

  it('starts pending work at 0 and treats a missing value as 0', () => {
    expect(reconcileProgress('pending', undefined)).toBe(0)
    expect(reconcileProgress('pending', 0)).toBe(0)
    expect(reconcileProgress('in-progress', undefined)).toBe(0)
  })

  it('caps in-progress work below 100', () => {
    expect(reconcileProgress('in-progress', 50)).toBe(50)
    expect(reconcileProgress('in-progress', 99)).toBe(99)
    expect(reconcileProgress('in-progress', 100)).toBe(99)
    expect(reconcileProgress('in-progress', 250)).toBe(99)
  })

  it('rounds fractional input', () => {
    expect(reconcileProgress('in-progress', 49.6)).toBe(50)
  })

  it('derives progress from the assignment status', () => {
    expect(getAssignmentProgress(make('x', { status: 'completed', progress: 12 }))).toBe(100)
    expect(getAssignmentProgress(make('y', { status: 'in-progress', progress: 62 }))).toBe(62)
    expect(getAssignmentProgress(make('z', { status: 'pending' }))).toBe(0)
  })

  it('accepts 0-99 for open work and anything for completed work', () => {
    expect(validateProgress('in-progress', 0)).toBeNull()
    expect(validateProgress('in-progress', 99)).toBeNull()
    expect(validateProgress('in-progress', 100)).not.toBeNull()
    expect(validateProgress('pending', -1)).not.toBeNull()
    expect(validateProgress('completed', 100)).toBeNull()
    expect(validateProgress('completed', 0)).toBeNull()
  })

  it('rejects non-numeric input', () => {
    expect(validateProgress('in-progress', Number.NaN)).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Legacy data compatibility
// ---------------------------------------------------------------------------

describe('legacy records without progress', () => {
  it('resolves a sensible value for every status', () => {
    const statuses: AssignmentStatus[] = ['pending', 'in-progress', 'completed']
    for (const status of statuses) {
      const assignment = make('legacy', { status })
      // Simulate a record written before progress existed.
      const legacy = { ...assignment } as Partial<Assignment>
      delete legacy.progress

      const progress = getAssignmentProgress(legacy as Assignment)
      if (status === 'completed') {
        expect(progress).toBe(100)
      } else {
        expect(progress).toBe(0)
      }
    }
  })

  it('never lets an open legacy record read as complete', () => {
    const legacy = make('legacy', { status: 'in-progress' }) as Partial<Assignment>
    delete legacy.progress
    expect(getAssignmentProgress(legacy as Assignment)).toBeLessThan(100)
  })

  it('keeps priority ordering stable for all three levels', () => {
    const priorities: AssignmentPriority[] = ['low', 'medium', 'high']
    expect(new Set(priorities).size).toBe(3)
  })
})
