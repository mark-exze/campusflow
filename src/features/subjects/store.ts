import { useCallback, useMemo } from 'react'

import { useLocalStorage } from '../../hooks/useLocalStorage'
import { STORAGE_KEYS } from '../../lib/constants'
import { MOCK_SEMESTER, MOCK_SUBJECTS } from '../../lib/mockData'
import { isSubjectArray } from '../../lib/storage'
import {
  createSubject,
  deriveClassSessions,
  normalizeSubject,
  type SubjectDraft,
} from '../../lib/subjects'
import type { Subject, SubjectSchedule } from '../../types'

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

  const resetSubjects = useCallback(() => {
    reset()
  }, [reset])

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
  }
}
