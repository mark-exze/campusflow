import { useCallback, useMemo } from 'react'

import { useLocalStorage } from '../../hooks/useLocalStorage'
import { STORAGE_KEYS } from '../../lib/constants'
import { MOCK_SEMESTER, MOCK_SUBJECTS } from '../../lib/mockData'
import { isSubjectArray } from '../../lib/storage'
import { countOrphanRiskAssignments } from '../../lib/seedData'
import {
  createSubject,
  deriveClassSessions,
  normalizeSubject,
  type SubjectDraft,
} from '../../lib/subjects'
import type { Assignment, Subject, SubjectSchedule } from '../../types'

/**
 * Outcome of a guarded "restore sample subjects" attempt.
 *
 * `blocked` means assignments would be orphaned, so nothing was changed.
 */
export type SubjectResetOutcome =
  | { status: 'restored' }
  | { status: 'blocked'; affectedCount: number }
  | { status: 'failed' }

export type { SubjectDraft } from '../../lib/subjects'

/**
 * Subject state backed by localStorage.
 *
 * Subjects are created with their own ids, so assignments that reference them
 * by id keep pointing at the right subject across edits, archiving and reload.
 */
export function useSubjects() {
  const {
    value,
    setValue,
    reset,
    persist,
    readLive,
  } = useLocalStorage<Subject[]>(
    STORAGE_KEYS.subjects,
    [...MOCK_SUBJECTS],
    isSubjectArray,
  )

  const subjects = useMemo(
    () =>
      value
        .map((subject) => normalizeSubject(subject))
        .filter((subject): subject is Subject => subject !== null),
    [value],
  )

  const classSessions = useMemo(() => deriveClassSessions(subjects), [subjects])

  /**
   * Replace the stored list, writing synchronously and reporting whether it
   * landed. Callers compute the next list from `readLive()` so a mutation
   * cannot overwrite a newer write with a stale snapshot; the deferred write
   * effect then finds identical bytes and skips.
   */
  const commit = useCallback(
    (next: Subject[]): boolean => {
      setValue(next)
      return persist(next)
    },
    [persist, setValue],
  )

  const addSubject = useCallback(
    (draft: SubjectDraft): boolean => {
      const subject = createSubject(draft, MOCK_SEMESTER)
      return commit([subject, ...readLive()])
    },
    [commit, readLive],
  )

  const updateSubject = useCallback(
    (id: string, draft: SubjectDraft): boolean => {
      const next = readLive().map((subject) =>
        subject.id === id
          ? {
              ...subject,
              name: draft.name.trim(),
              code: draft.code.trim().toUpperCase(),
              instructor: draft.instructor.trim(),
              color: draft.color,
              credits: draft.credits,
              grade: draft.grade,
              location: draft.location.trim(),
              schedule: draft.schedule.map((slot) => ({ ...slot })),
            }
          : subject,
      )
      return commit(next)
    },
    [commit, readLive],
  )

  const setArchived = useCallback(
    (id: string, archived: boolean): boolean =>
      commit(
        readLive().map((subject) => (subject.id === id ? { ...subject, archived } : subject)),
      ),
    [commit, readLive],
  )

  const toggleArchived = useCallback(
    (id: string): boolean => {
      const subject = readLive().find((candidate) => candidate.id === id)
      if (!subject) return false
      return setArchived(id, !subject.archived)
    },
    [readLive, setArchived],
  )

  const removeSubject = useCallback(
    (id: string): boolean =>
      commit(readLive().filter((subject) => subject.id !== id)),
    [commit, readLive],
  )

  const resetSubjects = useCallback((): boolean => reset(), [reset])

  /**
   * Guarded "restore sample subjects".
   *
   * The reset REPLACES the subject list, so an assignment referencing a
   * student-created subject would be left pointing at an id that no longer
   * exists. Rather than orphaning it, the reset is refused and the caller is
   * told how many assignments must be reassigned or removed first.
   *
   * The guard reads the CURRENT stored assignments rather than values captured
   * during render, so a page mounted before a subject was deleted — or before
   * an assignment was created in another component — cannot pass on a stale
   * snapshot and orphan real work.
   */
  const restoreSampleSubjects = useCallback((): SubjectResetOutcome => {
    const atRisk = countOrphanRiskAssignments(readAssignmentsFromStorage())
    if (atRisk > 0) {
      return { status: 'blocked', affectedCount: atRisk }
    }

    return reset() ? { status: 'restored' } : { status: 'failed' }
  }, [reset])

  /**
   * Live count of assignments that a subject reset would orphan.
   *
   * Reading storage here means a dialog opened after a subject was deleted, or
   * after an assignment was created elsewhere in this tab, shows the true
   * blocked state instead of the snapshot captured at render.
   */
  const getSubjectResetRisk = useCallback(
    (): number => countOrphanRiskAssignments(readAssignmentsFromStorage()),
    [],
  )

  const replaceSchedule = useCallback(
    (id: string, schedule: SubjectSchedule[]): boolean =>
      commit(
        readLive().map((subject) =>
          subject.id === id
            ? { ...subject, schedule: schedule.map((slot) => ({ ...slot })) }
            : subject,
        ),
      ),
    [commit, readLive],
  )

  return {
    subjects,
    classSessions,
    addSubject,
    updateSubject,
    setArchived,
    toggleArchived,
    removeSubject,
    replaceSchedule,
    resetSubjects,
    restoreSampleSubjects,
    getSubjectResetRisk,
  }
}

/** Read the current stored assignments for the reset guard's risk check. */
function readAssignmentsFromStorage(): Assignment[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.assignments)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is Assignment => typeof item === 'object' && item !== null,
    )
  } catch {
    return []
  }
}
