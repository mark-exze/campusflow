import { useCallback, useMemo } from 'react'

import { useLocalStorage } from '../../hooks/useLocalStorage'
import { STORAGE_KEYS } from '../../lib/constants'
import { daysUntil, timeToMinutes } from '../../lib/date'
import { MOCK_ASSIGNMENTS, MOCK_SUBJECTS } from '../../lib/mockData'
import { deriveClassSessions, normalizeSubject } from '../../lib/subjects'
import type {
  Assignment,
  AssignmentPriority,
  AssignmentStatus,
  AssignmentType,
  ClassSession,
  Subject,
} from '../../types'

export type NewAssignmentInput = {
  title: string
  subjectId: string
  type: AssignmentType
  priority: AssignmentPriority
  dueDate: string
  estimatedHours: number
  description: string
}

/**
 * Result of a create attempt. Creation is refused when the target subject is
 * archived or missing, so no assignment can reference a subject that is not
 * available for new work.
 */
export type AddAssignmentResult =
  | { status: 'created'; assignment: Assignment }
  | { status: 'blocked'; reason: string }

const PRIORITY_RANK: Record<AssignmentPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function createId(): string {
  const cryptoRef = globalThis.crypto
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return `asg-${cryptoRef.randomUUID()}`
  }
  return `asg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Incomplete items first, then by due date, then by priority. */
export function sortAssignments(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (b.status === 'completed' && a.status !== 'completed') return -1
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  })
}

/**
 * Assignment state backed by localStorage.
 *
 * Subjects live in the same localStorage key the subjects store writes, so the
 * dashboard and the assignment forms always see the student's own list. Class
 * sessions are derived from subject schedules rather than stored separately.
 */
export function useAssignments() {
  const {
    value: assignments,
    setValue: setAssignments,
    reset: resetAssignments,
  } = useLocalStorage<Assignment[]>(STORAGE_KEYS.assignments, [...MOCK_ASSIGNMENTS])

  const { value: storedSubjects } = useLocalStorage<Subject[]>(STORAGE_KEYS.subjects, [
    ...MOCK_SUBJECTS,
  ])

  const subjects: readonly Subject[] = useMemo(
    () =>
      storedSubjects
        .map((subject) => normalizeSubject(subject))
        .filter((subject): subject is Subject => subject !== null),
    [storedSubjects],
  )

  const classSessions: readonly ClassSession[] = useMemo(
    () => deriveClassSessions(subjects),
    [subjects],
  )

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>()
    for (const subject of subjects) {
      map.set(subject.id, subject)
    }
    return map
  }, [subjects])

  const getSubject = useCallback(
    (subjectId: string): Subject | undefined => subjectMap.get(subjectId),
    [subjectMap],
  )

  const getAssignmentStatus = useCallback(
    (id: string): AssignmentStatus | undefined =>
      assignments.find((assignment) => assignment.id === id)?.status,
    [assignments],
  )

  const sortedAssignments = useMemo(() => sortAssignments(assignments), [assignments])
  const activeAssignments = useMemo(
    () => sortedAssignments.filter((assignment) => assignment.status !== 'completed'),
    [sortedAssignments],
  )

  const upcomingAssignments = useMemo(
    () => activeAssignments.filter((assignment) => daysUntil(assignment.dueDate) >= 0),
    [activeAssignments],
  )

  const overdueAssignments = useMemo(
    () => activeAssignments.filter((assignment) => daysUntil(assignment.dueDate) < 0),
    [activeAssignments],
  )

  const completedAssignments = useMemo(
    () => sortedAssignments.filter((assignment) => assignment.status === 'completed'),
    [sortedAssignments],
  )

  const todayClasses = useMemo(() => {
    const today = new Date().getDay()
    return sortClassesByTime(classSessions.filter((session) => session.dayOfWeek === today))
  }, [classSessions])

  const weekSchedule = useMemo(
    () =>
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        classes: sortClassesByTime(
          classSessions.filter((session) => session.dayOfWeek === dayOfWeek),
        ),
      })),
    [classSessions],
  )

  const stats = useMemo(() => {
    return {
      active: activeAssignments.length,
      dueToday: activeAssignments.filter((assignment) => daysUntil(assignment.dueDate) === 0)
        .length,
      overdue: overdueAssignments.length,
      completed: completedAssignments.length,
      classCount: todayClasses.length,
      classHours: roundToOneDecimal(
        todayClasses.reduce(
          (total, session) => total + hoursBetween(session.startTime, session.endTime),
          0,
        ),
      ),
    }
  }, [activeAssignments, completedAssignments.length, overdueAssignments.length, todayClasses])

  const addAssignment = useCallback(
    (input: NewAssignmentInput): AddAssignmentResult => {
      const subject = subjects.find((candidate) => candidate.id === input.subjectId)

      if (!subject) {
        return { status: 'blocked', reason: 'Choose a subject.' }
      }

      // Archived subjects keep their existing assignments, but cannot take new
      // ones. This is the store-level backstop behind the form validation.
      if (subject.archived) {
        return {
          status: 'blocked',
          reason: `${subject.name} is archived. Restore it before adding assignments to it.`,
        }
      }

      const now = new Date().toISOString()
      const assignment: Assignment = {
        id: createId(),
        title: input.title.trim(),
        subjectId: input.subjectId,
        type: input.type,
        priority: input.priority,
        status: 'pending',
        dueDate: input.dueDate,
        estimatedHours: input.estimatedHours,
        description: input.description.trim(),
        createdAt: now,
        updatedAt: now,
      }

      setAssignments((previous) => [assignment, ...previous])
      return { status: 'created', assignment }
    },
    [setAssignments, subjects],
  )

  const updateAssignment = useCallback(
    (id: string, updates: Partial<Omit<Assignment, 'id' | 'createdAt'>>) => {
      setAssignments((previous) =>
        previous.map((assignment) =>
          assignment.id === id
            ? { ...assignment, ...updates, updatedAt: new Date().toISOString() }
            : assignment,
        ),
      )
    },
    [setAssignments],
  )

  const setStatus = useCallback(
    (id: string, status: AssignmentStatus) => updateAssignment(id, { status }),
    [updateAssignment],
  )

  const toggleComplete = useCallback(
    (id: string) => {
      setAssignments((previous) =>
        previous.map((assignment) =>
          assignment.id === id
            ? {
                ...assignment,
                status: assignment.status === 'completed' ? 'pending' : 'completed',
                updatedAt: new Date().toISOString(),
              }
            : assignment,
        ),
      )
    },
    [setAssignments],
  )

  const deleteAssignment = useCallback(
    (id: string) => {
      setAssignments((previous) => previous.filter((assignment) => assignment.id !== id))
    },
    [setAssignments],
  )

  /**
   * Remove every assignment that belongs to a subject. Called only after the
   * student explicitly confirms subject deletion, so assignments are never
   * left pointing at a subject that no longer exists.
   */
  const deleteAssignmentsBySubject = useCallback(
    (subjectId: string) => {
      setAssignments((previous) =>
        previous.filter((assignment) => assignment.subjectId !== subjectId),
      )
    },
    [setAssignments],
  )

  const resetToSampleData = useCallback(() => {
    resetAssignments()
  }, [resetAssignments])

  return {
    assignments: sortedAssignments,
    subjects,
    subjectMap,
    classSessions,
    activeAssignments,
    upcomingAssignments,
    overdueAssignments,
    completedAssignments,
    todayClasses,
    weekSchedule,
    stats,
    getSubject,
    getAssignmentStatus,
    addAssignment,
    updateAssignment,
    setStatus,
    toggleComplete,
    deleteAssignment,
    deleteAssignmentsBySubject,
    resetToSampleData,
  }
}

function sortClassesByTime(sessions: ClassSession[]): ClassSession[] {
  return [...sessions].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

function hoursBetween(startTime: string, endTime: string): number {
  return Math.max(0, (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60)
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}
