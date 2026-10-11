import { useCallback, useMemo } from 'react'

import { useLocalStorage } from '../../hooks/useLocalStorage'
import {
  DEFAULT_FILTERS,
  filterAssignments,
  isAssignmentOverdue,
  sortAssignmentsBy,
  type AssignmentFilters,
  type SortKey,
} from '../../lib/assignmentFilters'
import { reconcileProgress } from '../../lib/assignmentProgress'
import { STORAGE_KEYS } from '../../lib/constants'
import { daysUntil, getTodayDateString, timeToMinutes } from '../../lib/date'
import { MOCK_ASSIGNMENTS, MOCK_SUBJECTS } from '../../lib/mockData'
import { isAssignmentArray, isSubjectArray } from '../../lib/storage'
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
  progress?: number | undefined
}

/**
 * Outcome of a create attempt.
 *
 * `created` means localStorage has accepted it. `unsaved` means the change
 * exists only in this tab — the write failed, so the student must be told
 * rather than congratulated.
 */
export type AddAssignmentResult =
  | { status: 'created'; assignment: Assignment }
  | {
      status: 'unsaved'
      assignment: Assignment
      reason: string
    }
  | { status: 'blocked'; reason: string }

/** Result of an update attempt, validated at the store layer as well as the UI. */
export type UpdateAssignmentResult =
  | { status: 'updated'; assignment: Assignment }
  | {
      status: 'unsaved'
      assignment: Assignment
      reason: string
    }
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
 * Coerce a stored record into a consistent assignment. Progress is re-derived
 * from the status so legacy records without one still resolve correctly, and
 * a completed record can never report less than 100%.
 */
export function normalizeAssignment(raw: Assignment): Assignment {
  return {
    ...raw,
    progress: reconcileProgress(raw.status, raw.progress),
  }
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
    value: rawAssignments,
    setValue: setAssignments,
    reset: resetAssignments,
    persist: persistAssignments,
    readLive: readLiveAssignmentsAll,
  } = useLocalStorage<Assignment[]>(
    STORAGE_KEYS.assignments,
    [...MOCK_ASSIGNMENTS],
    isAssignmentArray,
  )

  const { value: storedSubjects } = useLocalStorage<Subject[]>(
    STORAGE_KEYS.subjects,
    [...MOCK_SUBJECTS],
    isSubjectArray,
  )

  const persist = useCallback(
    (next: Assignment[]) => persistAssignments(next),
    [persistAssignments],
  )

  /** Assignments as currently stored, normalized. */
  const readLiveAssignments = useCallback(
    (): Assignment[] => readLiveAssignmentsAll().map((a) => normalizeAssignment(a)),
    [readLiveAssignmentsAll],
  )

  const assignments: Assignment[] = useMemo(
    () => rawAssignments.map((assignment) => normalizeAssignment(assignment)),
    [rawAssignments],
  )

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

  const todayIso = getTodayDateString()

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

  /**
   * Read the newest subject list straight from storage.
   *
   * More than one hook holds this key, so a component that has been mounted
   * since a subject was archived can still be carrying a stale snapshot.
   * Validation must therefore consult the authoritative value rather than the
   * one captured during render, otherwise the archived-subject guard could be
   * bypassed through a different code path.
   */
  const readLiveSubjects = useCallback((): readonly Subject[] => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.subjects)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed
            .map((subject) => normalizeSubject(subject as Subject))
            .filter((subject): subject is Subject => subject !== null)
        }
      }
    } catch {
      /* fall back to the rendered snapshot */
    }
    return subjects
  }, [subjects])

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
    () => activeAssignments.filter((assignment) => isAssignmentOverdue(assignment, todayIso)),
    [activeAssignments, todayIso],
  )

  const completedAssignments = useMemo(
    () => sortedAssignments.filter((assignment) => assignment.status === 'completed'),
    [sortedAssignments],
  )

  const todayClasses = useMemo(() => {
    const today = new Date().getDay()
    return sortClassesByTime(classSessions.filter((session) => session.dayOfWeek === today))
  }, [classSessions])

  const stats = useMemo(() => {
    const openProgress = activeAssignments.map((assignment) => assignment.progress ?? 0)
    const totalOpenProgress = openProgress.reduce((total, value) => total + value, 0)

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
      // Average completion across open work; 0 when nothing is open.
      averageProgress:
        openProgress.length > 0 ? Math.round(totalOpenProgress / openProgress.length) : 0,
    }
  }, [activeAssignments, completedAssignments.length, overdueAssignments.length, todayClasses])

  const addAssignment = useCallback(
    (input: NewAssignmentInput): AddAssignmentResult => {
      const subject = readLiveSubjects().find((candidate) => candidate.id === input.subjectId)

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
      const status: AssignmentStatus = 'pending'
      const assignment: Assignment = {
        id: createId(),
        title: input.title.trim(),
        subjectId: input.subjectId,
        type: input.type,
        priority: input.priority,
        status,
        dueDate: input.dueDate,
        estimatedHours: input.estimatedHours,
        description: input.description.trim(),
        progress: reconcileProgress(status, input.progress),
        createdAt: now,
        updatedAt: now,
      }

      // Compute the next list from the authoritative stored value so a
      // mutation can never overwrite a newer write with a stale snapshot, then
      // write it synchronously so the result is honest.
      const next = [assignment, ...readLiveAssignments()]
      setAssignments(next)
      return persist(next)
        ? { status: 'created', assignment }
        : {
            status: 'unsaved',
            assignment,
            reason:
              'Your browser would not store this change, so it is only kept in this tab and will be lost on refresh.',
          }
    },
    [persist, readLiveAssignments, readLiveSubjects, setAssignments],
  )
  const updateAssignment = useCallback(
    (id: string, updates: Partial<Omit<Assignment, 'id' | 'createdAt'>>): UpdateAssignmentResult => {
      const existing = rawAssignments.find((assignment) => assignment.id === id)
      if (!existing) {
        return { status: 'blocked', reason: 'That assignment no longer exists.' }
      }

      const nextSubjectId = updates.subjectId ?? existing.subjectId

      // Subject changes are validated here too, not just in the form, so an
      // archived subject can never be picked up through another code path.
      if (updates.subjectId !== undefined && updates.subjectId !== existing.subjectId) {
        const subject = readLiveSubjects().find((candidate) => candidate.id === nextSubjectId)

        if (!subject) {
          return { status: 'blocked', reason: 'Choose a subject.' }
        }
        if (subject.archived) {
          return {
            status: 'blocked',
            reason: `${subject.name} is archived. Restore it before adding assignments to it.`,
          }
        }
      }

      const nextStatus = updates.status ?? existing.status
      const nextProgress = reconcileProgress(
        nextStatus,
        updates.progress !== undefined ? updates.progress : existing.progress,
      )

      const updated: Assignment = normalizeAssignment({
        ...existing,
        ...updates,
        status: nextStatus,
        progress: nextProgress,
        updatedAt: new Date().toISOString(),
      })

      // Persist synchronously so the caller can report a true outcome rather
      // assuming the deferred effect will succeed.
      const next = readLiveAssignments().map((assignment) =>
        assignment.id === id ? updated : assignment,
      )
      setAssignments(next)

      return persist(next)
        ? { status: 'updated', assignment: updated }
        : {
            status: 'unsaved',
            assignment: updated,
            reason:
              'Your browser would not store this change, so it is only kept in this tab and will be lost on refresh.',
          }
    },
    [persist, rawAssignments, readLiveAssignments, readLiveSubjects, setAssignments],
  )

  const setStatus = useCallback(
    (id: string, status: AssignmentStatus) => updateAssignment(id, { status }),
    [updateAssignment],
  )

  const setProgress = useCallback(
    (id: string, progress: number) => updateAssignment(id, { progress }),
    [updateAssignment],
  )

  const toggleComplete = useCallback(
    (id: string) => {
      const existing = rawAssignments.find((assignment) => assignment.id === id)
      if (!existing) return

      const status: AssignmentStatus =
        existing.status === 'completed' ? 'pending' : 'completed'

      // Reconcile in one write so status and progress never disagree.
      updateAssignment(id, { status, progress: reconcileProgress(status, existing.progress) })
    },
    [rawAssignments, updateAssignment],
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

  /** Apply the given filters and sort, against the full assignment list. */
  const getVisibleAssignments = useCallback(
    (filters: AssignmentFilters = DEFAULT_FILTERS, sortKey: SortKey = 'deadline-asc') =>
      sortAssignmentsBy(filterAssignments(assignments, filters, todayIso), sortKey),
    [assignments, todayIso],
  )

  return {
    assignments: sortedAssignments,
    subjects,
    subjectMap,
    classSessions,
    todayIso,
    activeAssignments,
    upcomingAssignments,
    overdueAssignments,
    completedAssignments,
    todayClasses,
    stats,
    getSubject,
    getAssignmentStatus,
    addAssignment,
    updateAssignment,
    setStatus,
    setProgress,
    toggleComplete,
    deleteAssignment,
    deleteAssignmentsBySubject,
    resetToSampleData,
    getVisibleAssignments,
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
