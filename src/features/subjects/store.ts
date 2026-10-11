import { useCallback, useMemo } from 'react'

import { useLocalStorage } from '../../hooks/useLocalStorage'
import { STORAGE_KEYS } from '../../lib/constants'
import { MOCK_SEMESTER, MOCK_SUBJECTS } from '../../lib/mockData'
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
  const { value, setValue, reset } = useLocalStorage<Subject[]>(
    STORAGE_KEYS.subjects,
    [...MOCK_SUBJECTS],
  )

  const subjects = useMemo(
    () =>
      value
        .map((subject) => normalizeSubject(subject))
        .filter((subject): subject is Subject => subject !== null),
    [value],
  )

  const classSessions = useMemo(() => deriveClassSessions(subjects), [subjects])

  const addSubject = useCallback(
    (draft: SubjectDraft): Subject => {
      const subject = createSubject(draft, MOCK_SEMESTER)
      setValue((previous) => [subject, ...previous])
      return subject
    },
    [setValue],
  )

  const updateSubject = useCallback(
    (id: string, draft: SubjectDraft) => {
      setValue((previous) =>
        previous.map((subject) =>
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
        ),
      )
    },
    [setValue],
  )

  const setArchived = useCallback(
    (id: string, archived: boolean) => {
      setValue((previous) =>
        previous.map((subject) => (subject.id === id ? { ...subject, archived } : subject)),
      )
    },
    [setValue],
  )

  const toggleArchived = useCallback(
    (id: string) => {
      const subject = subjects.find((candidate) => candidate.id === id)
      if (subject) setArchived(id, !subject.archived)
    },
    [setArchived, subjects],
  )

  const removeSubject = useCallback(
    (id: string) => {
      setValue((previous) => previous.filter((subject) => subject.id !== id))
    },
    [setValue],
  )

  const resetSubjects = useCallback(() => {
    reset()
  }, [reset])

  const replaceSchedule = useCallback(
    (id: string, schedule: SubjectSchedule[]) => {
      setValue((previous) =>
        previous.map((subject) =>
          subject.id === id
            ? { ...subject, schedule: schedule.map((slot) => ({ ...slot })) }
            : subject,
        ),
      )
    },
    [setValue],
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
