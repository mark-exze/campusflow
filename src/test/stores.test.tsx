import { act, renderHook } from '@testing-library/react'

import { STORAGE_KEYS } from '../lib/constants'
import { MOCK_SUBJECTS } from '../lib/mockData'
import { useProfile } from '../hooks/useProfile'
import { useAssignments } from '../features/assignments/store'
import { useSubjects } from '../features/subjects/store'
import { toSubjectDraft } from '../features/subjects/subjectFormValues'
import type { Subject } from '../types'

function readSubjectsFromStorage(): Subject[] {
  const raw = window.localStorage.getItem(STORAGE_KEYS.subjects)
  return raw ? (JSON.parse(raw) as Subject[]) : []
}

const NEW_DRAFT = {
  name: 'Thermodynamics',
  code: 'PHY 210',
  instructor: 'Dr. Kim',
  color: 'bg-rose-500',
  credits: 3,
  grade: 90,
  location: 'Room 12',
  schedule: [{ dayOfWeek: 2, startTime: '13:00', endTime: '14:15' }],
}

describe('useSubjects', () => {
  it('seeds the sample subjects', () => {
    const { result } = renderHook(() => useSubjects())

    expect(result.current.subjects).toHaveLength(MOCK_SUBJECTS.length)
    expect(result.current.subjects.every((subject) => !subject.archived)).toBe(true)
  })

  it('adds a subject at the top with a stable id', () => {
    const { result } = renderHook(() => useSubjects())

    let createdId = ''
    act(() => {
      createdId = result.current.addSubject(NEW_DRAFT).id
    })

    const added = result.current.subjects.find((subject) => subject.id === createdId)
    expect(added).toBeDefined()
    expect(added?.name).toBe('Thermodynamics')
    expect(added?.code).toBe('PHY 210')
    expect(added?.archived).toBe(false)
    expect(createdId).toMatch(/^sub-/)
  })

  it('gives every subject a distinct id', () => {
    const { result } = renderHook(() => useSubjects())

    act(() => {
      result.current.addSubject({ ...NEW_DRAFT, code: 'PHY 300' })
      result.current.addSubject({ ...NEW_DRAFT, code: 'PHY 400' })
    })

    const ids = result.current.subjects.map((subject) => subject.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('edits a subject in place, keeping its id', () => {
    const { result } = renderHook(() => useSubjects())
    const target = result.current.subjects[0]!

    act(() => {
      result.current.updateSubject(target.id, {
        ...toSubjectDraft({
          name: 'Renamed',
          code: 'NEW 101',
          instructor: 'Prof. New',
          color: 'bg-teal-500',
          credits: '2',
          grade: '77',
          location: 'Room 9',
          schedule: [{ dayOfWeek: 4, startTime: '08:00', endTime: '09:00' }],
        }),
      })
    })

    const updated = result.current.subjects.find((subject) => subject.id === target.id)
    expect(updated?.name).toBe('Renamed')
    expect(updated?.code).toBe('NEW 101')
    expect(updated?.credits).toBe(2)
    expect(updated?.schedule).toEqual([{ dayOfWeek: 4, startTime: '08:00', endTime: '09:00' }])
  })

  it('archives and restores a subject', () => {
    const { result } = renderHook(() => useSubjects())
    const target = result.current.subjects[0]!

    act(() => {
      result.current.toggleArchived(target.id)
    })
    expect(result.current.subjects.find((s) => s.id === target.id)?.archived).toBe(true)

    act(() => {
      result.current.toggleArchived(target.id)
    })
    expect(result.current.subjects.find((s) => s.id === target.id)?.archived).toBe(false)
  })

  it('sets the archived flag explicitly', () => {
    const { result } = renderHook(() => useSubjects())
    const target = result.current.subjects[1]!

    act(() => {
      result.current.setArchived(target.id, true)
    })
    expect(result.current.subjects.find((s) => s.id === target.id)?.archived).toBe(true)
  })

  it('removes a subject and keeps the others', () => {
    const { result } = renderHook(() => useSubjects())
    const target = result.current.subjects[0]!
    const before = result.current.subjects.length

    act(() => {
      result.current.removeSubject(target.id)
    })

    expect(result.current.subjects).toHaveLength(before - 1)
    expect(result.current.subjects.some((subject) => subject.id === target.id)).toBe(false)
  })

  it('drops archived subjects from the derived class sessions', () => {
    const { result } = renderHook(() => useSubjects())
    const target = result.current.subjects.find(
      (subject) => subject.schedule.length > 0,
    )
    expect(target).toBeDefined()

    const before = result.current.classSessions.length

    act(() => {
      result.current.setArchived(target!.id, true)
    })

    const expectedDrop = target!.schedule.length
    expect(result.current.classSessions).toHaveLength(before - expectedDrop)
    expect(
      result.current.classSessions.some((session) => session.subjectId === target!.id),
    ).toBe(false)
  })

  it('restores the sample subjects on reset', () => {
    const { result } = renderHook(() => useSubjects())

    act(() => {
      result.current.removeSubject(result.current.subjects[0]!.id)
      result.current.addSubject({ ...NEW_DRAFT, code: 'PHY 999' })
    })
    expect(result.current.subjects).toHaveLength(MOCK_SUBJECTS.length)

    act(() => {
      result.current.resetSubjects()
    })

    expect(result.current.subjects).toHaveLength(MOCK_SUBJECTS.length)
    expect(
      result.current.subjects.some((subject) => subject.code === 'PHY 999'),
    ).toBe(false)
  })

  it('persists subjects across a remount', () => {
    const { result, unmount } = renderHook(() => useSubjects())

    act(() => {
      result.current.addSubject(NEW_DRAFT)
    })
    unmount()

    const stored = readSubjectsFromStorage()
    expect(stored.some((subject) => subject.code === 'PHY 210')).toBe(true)

    const { result: reloaded } = renderHook(() => useSubjects())
    expect(reloaded.current.subjects.some((subject) => subject.code === 'PHY 210')).toBe(true)
  })
})

describe('useProfile', () => {
  it('defaults to a blank display name', () => {
    const { result } = renderHook(() => useProfile())
    expect(result.current.profile.displayName).toBe('')
  })

  it('persists profile changes across a remount', () => {
    const { result, unmount } = renderHook(() => useProfile())

    act(() => {
      result.current.updateProfile({ displayName: 'Alex' })
    })
    unmount()

    const stored = window.localStorage.getItem(STORAGE_KEYS.profile)
    expect(stored).toContain('Alex')

    const { result: reloaded } = renderHook(() => useProfile())
    expect(reloaded.current.profile.displayName).toBe('Alex')
  })

  it('normalizes values written through saveProfile', () => {
    const { result } = renderHook(() => useProfile())

    act(() => {
      result.current.saveProfile({
        displayName: '   Alex   ',
        schoolLevel: 'university',
        schoolName: ' State University ',
        academicYear: ' 2026-2027 ',
        academicTerm: ' Fall Term ',
        dateFormat: 'mdy',
      })
    })

    expect(result.current.profile).toEqual({
      displayName: 'Alex',
      schoolLevel: 'university',
      schoolName: 'State University',
      academicYear: '2026-2027',
      academicTerm: 'Fall Term',
      dateFormat: 'mdy',
    })
  })

  it('resets back to defaults', () => {
    const { result } = renderHook(() => useProfile())

    act(() => {
      result.current.updateProfile({ displayName: 'Alex', schoolLevel: 'high-school' })
    })
    act(() => {
      result.current.resetProfile()
    })

    expect(result.current.profile.displayName).toBe('')
    expect(result.current.profile.schoolLevel).toBe('college')
  })
})

describe('useAssignments with persisted subjects', () => {
  it('reads subjects written by the subjects store', () => {
    const { result } = renderHook(() => useAssignments())
    expect(result.current.subjects).toHaveLength(MOCK_SUBJECTS.length)

    act(() => {
      result.current.addAssignment({
        title: 'New task',
        subjectId: result.current.subjects[0]!.id,
        type: 'homework',
        priority: 'low',
        dueDate: '2026-12-01',
        estimatedHours: 1,
        description: '',
      })
    })

    expect(result.current.assignments.some((a) => a.title === 'New task')).toBe(true)
  })

  it('resolves a subject name for an assignment', () => {
    const { result } = renderHook(() => useAssignments())
    const assignment = result.current.assignments[0]!
    expect(result.current.getSubject(assignment.subjectId)?.id).toBe(assignment.subjectId)
    expect(result.current.getSubject('missing-id')).toBeUndefined()
  })
})
