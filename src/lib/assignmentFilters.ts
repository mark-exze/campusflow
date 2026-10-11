/**
 * Assignment search, filtering and sorting.
 *
 * Pure functions: every filter takes an explicit `todayIso` so deadline maths
 * is deterministic in tests and never depends on the ambient clock. All date
 * comparisons use local calendar dates.
 */

import { daysUntilFrom, isInCurrentMonth } from './date'
import { PRIORITY_OPTIONS } from './constants'
import type { Assignment, AssignmentPriority, AssignmentStatus } from '../types'

export type StatusFilter = 'all' | AssignmentStatus | 'overdue'
export type PriorityFilter = 'all' | AssignmentPriority
export type DeadlineFilter = 'all' | 'today' | 'next-7-days' | 'this-month'
export type SortKey = 'deadline-asc' | 'deadline-desc' | 'priority-desc' | 'created-desc'

export type AssignmentFilters = {
  query: string
  subjectId: string
  status: StatusFilter
  priority: PriorityFilter
  deadline: DeadlineFilter
}

export const DEFAULT_FILTERS: AssignmentFilters = {
  query: '',
  subjectId: 'all',
  status: 'all',
  priority: 'all',
  deadline: 'all',
}

export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'deadline-asc', label: 'Deadline — earliest first' },
  { value: 'deadline-desc', label: 'Deadline — latest first' },
  { value: 'priority-desc', label: 'Priority — highest first' },
  { value: 'created-desc', label: 'Date created — newest first' },
]

export const DEADLINE_FILTER_OPTIONS: readonly { value: DeadlineFilter; label: string }[] = [
  { value: 'all', label: 'Any deadline' },
  { value: 'today', label: 'Today' },
  { value: 'next-7-days', label: 'Next 7 days' },
  { value: 'this-month', label: 'This month' },
]

/**
 * Overdue means unfinished and past its deadline. Completed assignments are
 * never overdue, however far past the date they are.
 */
export function isAssignmentOverdue(
  assignment: Assignment,
  todayIso: string,
): boolean {
  return assignment.status !== 'completed' && daysUntilFrom(assignment.dueDate, todayIso) < 0
}

function matchesStatus(assignment: Assignment, filter: StatusFilter, todayIso: string): boolean {
  if (filter === 'all') return true
  if (filter === 'overdue') return isAssignmentOverdue(assignment, todayIso)
  return assignment.status === filter
}

function matchesDeadline(assignment: Assignment, filter: DeadlineFilter, todayIso: string): boolean {
  const days = daysUntilFrom(assignment.dueDate, todayIso)

  switch (filter) {
    case 'all':
      return true
    case 'today':
      return days === 0
    case 'next-7-days':
      return days >= 0 && days <= 7
    case 'this-month':
      return isInCurrentMonth(assignment.dueDate, todayIso)
    default:
      return true
  }
}

function matchesQuery(assignment: Assignment, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true

  return (
    assignment.title.toLowerCase().includes(needle) ||
    assignment.description.toLowerCase().includes(needle)
  )
}

/** Apply every active filter. Filters combine with AND. */
export function filterAssignments(
  assignments: readonly Assignment[],
  filters: AssignmentFilters,
  todayIso: string,
): Assignment[] {
  return assignments.filter((assignment) => {
    if (!matchesQuery(assignment, filters.query)) return false
    if (filters.subjectId !== 'all' && assignment.subjectId !== filters.subjectId) return false
    if (!matchesStatus(assignment, filters.status, todayIso)) return false
    if (filters.priority !== 'all' && assignment.priority !== filters.priority) return false
    if (!matchesDeadline(assignment, filters.deadline, todayIso)) return false
    return true
  })
}

const PRIORITY_RANK: Record<AssignmentPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

/**
 * Sort with deterministic tie-breaking. Every comparator falls back to due
 * date, priority, created date and finally id, so stable inputs always produce
 * an identical order.
 */
export function sortAssignmentsBy(
  assignments: readonly Assignment[],
  sortKey: SortKey,
): Assignment[] {
  const byDueDate = (a: Assignment, b: Assignment) =>
    a.dueDate === b.dueDate ? 0 : a.dueDate < b.dueDate ? -1 : 1

  const byPriority = (a: Assignment, b: Assignment) =>
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]

  const byCreated = (a: Assignment, b: Assignment) =>
    a.createdAt === b.createdAt
      ? 0
      : a.createdAt < b.createdAt
        ? -1
        : 1

  const byId = (a: Assignment, b: Assignment) => (a.id === b.id ? 0 : a.id < b.id ? -1 : 1)

  const descendingDueDate = (a: Assignment, b: Assignment) => -byDueDate(a, b)
  const descendingCreated = (a: Assignment, b: Assignment) => -byCreated(a, b)

  const comparators: Record<SortKey, (a: Assignment, b: Assignment) => number> = {
    'deadline-asc': (a, b) => byDueDate(a, b) || byPriority(a, b) || byCreated(a, b) || byId(a, b),
    'deadline-desc': (a, b) =>
      descendingDueDate(a, b) || byPriority(a, b) || descendingCreated(a, b) || byId(a, b),
    'priority-desc': (a, b) => byPriority(a, b) || byDueDate(a, b) || byCreated(a, b) || byId(a, b),
    'created-desc': (a, b) =>
      descendingCreated(a, b) || byDueDate(a, b) || byPriority(a, b) || byId(a, b),
  }

  const comparator = comparators[sortKey]
  return [...assignments].sort(comparator)
}

/** Number of filter dimensions diverging from their default. */
export function countActiveFilters(filters: AssignmentFilters): number {
  let count = 0
  if (filters.query.trim() !== '') count += 1
  if (filters.subjectId !== 'all') count += 1
  if (filters.status !== 'all') count += 1
  if (filters.priority !== 'all') count += 1
  if (filters.deadline !== 'all') count += 1
  return count
}

export function hasActiveFilters(filters: AssignmentFilters): boolean {
  return countActiveFilters(filters) > 0
}

/** Priority choices for the filter dropdown, built from the shared options. */
export const PRIORITY_FILTER_OPTIONS: readonly { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'Any priority' },
  ...PRIORITY_OPTIONS.map((option) => ({ value: option.value, label: `${option.label}` })),
]
