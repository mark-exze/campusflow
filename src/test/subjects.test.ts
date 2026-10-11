import { describe, expect, it } from 'vitest'

import {
  canDeleteSafely,
  countAssignmentsBySubject,
  createSubject,
  createSubjectId,
  deleteSubject,
  deleteSubjectWithAssignments,
  deriveClassSessions,
  emptySchedule,
  findDuplicateCode,
  normalizeSubject,
  validateSubject,
  type SubjectDraft,
} from '../lib/subjects'
import type { Assignment, Subject } from '../types'

function draft(overrides: Partial<SubjectDraft> = {}): SubjectDraft {
  return {
    name: 'Calculus II',
    code: 'MATH 201',
    instructor: 'Dr. Amara Patel',
    color: 'bg-sky-500',
    credits: 4,
    grade: 88,
    location: 'Room 204',
    schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:15' }],
    ...overrides,
  }
}

function subject(overrides: Partial<Subject> = {}): Subject {
  return {
    ...createSubject(draft(), 'Fall 2026'),
    id: 'sub-1',
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
    dueDate: '2026-12-01',
    estimatedHours: 2,
    description: '',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('createSubjectId', () => {
  it('produces unique, prefixed ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createSubjectId()))

    expect(ids.size).toBe(50)
    for (const id of ids) {
      expect(id.startsWith('sub-')).toBe(true)
    }
  })
})

describe('emptySchedule', () => {
  it('starts with a valid Monday slot', () => {
    expect(emptySchedule()).toEqual({ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' })
  })
})

describe('validateSubject', () => {
  it('accepts a valid draft', () => {
    expect(validateSubject(draft(), { subjects: [] })).toEqual({})
  })

  it('requires a name and a code', () => {
    const errors = validateSubject(draft({ name: ' ', code: ' ' }), { subjects: [] })

    expect(errors.name).toBeDefined()
    expect(errors.code).toBeDefined()
  })

  it('rejects names that are too short', () => {
    expect(validateSubject(draft({ name: 'A' }), { subjects: [] }).name).toBeDefined()
    expect(validateSubject(draft({ name: 'Ab' }), { subjects: [] }).name).toBeUndefined()
  })

  it('rejects codes with invalid characters', () => {
    expect(validateSubject(draft({ code: 'MATH/201' }), { subjects: [] }).code).toBeDefined()
    expect(validateSubject(draft({ code: 'MATH-201' }), { subjects: [] }).code).toBeUndefined()
    expect(validateSubject(draft({ code: 'MATH 201' }), { subjects: [] }).code).toBeUndefined()
  })

  it('detects duplicate codes case-insensitively', () => {
    const existing = [subject({ id: 'sub-other', code: 'math 201' })]

    expect(validateSubject(draft(), { subjects: existing }).code).toBeDefined()
    expect(
      validateSubject(draft({ code: 'MATH 201' }), { subjects: existing, currentId: 'sub-other' })
        .code,
    ).toBeUndefined()
  })

  it('does not treat the subject being edited as its own duplicate', () => {
    const existing = [subject({ id: 'sub-1', code: 'MATH 201' })]
    expect(
      validateSubject(draft(), { subjects: existing, currentId: 'sub-1' }).code,
    ).toBeUndefined()
  })

  it('rejects out-of-range credits and grades', () => {
    expect(validateSubject(draft({ credits: -1 }), { subjects: [] }).credits).toBeDefined()
    expect(validateSubject(draft({ credits: 99 }), { subjects: [] }).credits).toBeDefined()
    expect(validateSubject(draft({ grade: 101 }), { subjects: [] }).grade).toBeDefined()
    expect(validateSubject(draft({ grade: -1 }), { subjects: [] }).grade).toBeDefined()
    expect(validateSubject(draft({ grade: Number.NaN }), { subjects: [] }).grade).toBeDefined()
  })

  it('requires at least one class slot', () => {
    expect(validateSubject(draft({ schedule: [] }), { subjects: [] }).schedule).toBeDefined()
  })

  it('rejects a slot whose end time is not after its start time', () => {
    expect(
      validateSubject(
        draft({ schedule: [{ dayOfWeek: 1, startTime: '10:00', endTime: '10:00' }] }),
        { subjects: [] },
      ).schedule,
    ).toBeDefined()

    expect(
      validateSubject(
        draft({ schedule: [{ dayOfWeek: 1, startTime: '10:30', endTime: '10:00' }] }),
        { subjects: [] },
      ).schedule,
    ).toBeDefined()
  })

  it('rejects invalid days and malformed times', () => {
    expect(
      validateSubject(draft({ schedule: [{ dayOfWeek: 9, startTime: '09:00', endTime: '10:00' }] }), {
        subjects: [],
      }).schedule,
    ).toBeDefined()

    expect(
      validateSubject(
        draft({ schedule: [{ dayOfWeek: 1, startTime: '9am', endTime: '10:00' }] }),
        { subjects: [] },
      ).schedule,
    ).toBeDefined()
  })

  it('reports the offending slot number', () => {
    const errors = validateSubject(
      draft({
        schedule: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
          { dayOfWeek: 2, startTime: '14:00', endTime: '13:00' },
        ],
      }),
      { subjects: [] },
    )

    expect(errors.schedule).toContain('Slot 2')
  })

  it('rejects a colour outside the palette', () => {
    expect(validateSubject(draft({ color: 'bg-pink-900' }), { subjects: [] }).color).toBeDefined()
  })
})

describe('findDuplicateCode', () => {
  it('matches regardless of case and spacing', () => {
    const existing = [subject({ code: 'math 201' })]

    expect(findDuplicateCode(existing, 'MATH 201')?.id).toBe(existing[0]!.id)
    expect(findDuplicateCode(existing, 'MATH 201', existing[0]!.id)).toBeUndefined()
    expect(findDuplicateCode(existing, 'PHY 102')).toBeUndefined()
  })
})

describe('normalizeSubject', () => {
  it('salvages a record with missing optional fields', () => {
    const normalized = normalizeSubject({ id: 'sub-x', name: 'Biology' })

    expect(normalized).not.toBeNull()
    expect(normalized?.code).toBe('')
    expect(normalized?.credits).toBe(0)
    expect(normalized?.archived).toBe(false)
    expect(normalized?.color).not.toBe('')
  })

  it('drops records that cannot be salvaged', () => {
    expect(normalizeSubject(null)).toBeNull()
    expect(normalizeSubject({})).toBeNull()
    expect(normalizeSubject({ id: 'sub-x' })).toBeNull()
    expect(normalizeSubject({ name: 'No id' })).toBeNull()
  })

  it('clamps values into valid ranges', () => {
    const normalized = normalizeSubject({
      id: 'sub-x',
      name: 'Biology',
      credits: -4,
      grade: 150,
      dayOfWeek: 99,
    })

    expect(normalized?.credits).toBe(0)
    expect(normalized?.grade).toBe(100)
  })
})

describe('deriveClassSessions', () => {
  it('creates one session per schedule slot', () => {
    const sessions = deriveClassSessions([
      subject({
        id: 'sub-1',
        location: 'Room 5',
        schedule: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '10:15' },
          { dayOfWeek: 3, startTime: '12:00', endTime: '12:50' },
        ],
      }),
    ])

    expect(sessions).toHaveLength(2)
    expect(sessions[0]).toMatchObject({
      subjectId: 'sub-1',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:15',
      location: 'Room 5',
    })
  })

  it('excludes archived subjects', () => {
    const sessions = deriveClassSessions([
      subject({ id: 'sub-active', archived: false }),
      subject({ id: 'sub-old', archived: true }),
    ])

    expect(sessions.map((session) => session.subjectId)).toEqual(['sub-active'])
  })

  it('generates stable, unique ids', () => {
    const sessions = deriveClassSessions([
      subject({
        id: 'sub-1',
        schedule: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
          { dayOfWeek: 1, startTime: '14:00', endTime: '15:00' },
        ],
      }),
    ])

    const ids = sessions.map((session) => session.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('countAssignmentsBySubject', () => {
  it('splits active and completed counts per subject', () => {
    const counts = countAssignmentsBySubject([
      assignment({ id: 'a1', subjectId: 'sub-1', status: 'completed' }),
      assignment({ id: 'a2', subjectId: 'sub-1', status: 'pending' }),
      assignment({ id: 'a3', subjectId: 'sub-2', status: 'in-progress' }),
    ])

    expect(counts.get('sub-1')).toEqual({ active: 1, completed: 1, total: 2 })
    expect(counts.get('sub-2')).toEqual({ active: 1, completed: 0, total: 1 })
    expect(counts.get('sub-3')).toBeUndefined()
  })
})

describe('deleteSubject — referential integrity', () => {
  it('deletes a subject with no assignments', () => {
    const result = deleteSubject([subject()], [], 'sub-1')

    expect(result.status).toBe('deleted')
    if (result.status === 'deleted') {
      expect(result.subjects).toHaveLength(0)
      expect(result.removedAssignmentIds).toEqual([])
    }
  })

  it('refuses to delete a subject that still has assignments', () => {
    const result = deleteSubject([subject()], [assignment()], 'sub-1')

    expect(result.status).toBe('blocked')
    if (result.status === 'blocked') {
      expect(result.assignmentCount).toBe(1)
    }
  })

  it('leaves the subjects list untouched when blocked', () => {
    const subjects = [subject()]
    const result = deleteSubject(subjects, [assignment()], 'sub-1')

    expect(result.status).toBe('blocked')
    if (result.status === 'blocked') {
      expect(subjects).toHaveLength(1)
    }
  })

  it('reports a missing subject as blocked', () => {
    expect(deleteSubject([], [], 'does-not-exist').status).toBe('blocked')
  })

  it('removes dependent assignments when explicitly confirmed', () => {
    const subjects = [subject({ id: 'sub-1' }), subject({ id: 'sub-2' })]
    const assignments = [
      assignment({ id: 'a1', subjectId: 'sub-1' }),
      assignment({ id: 'a2', subjectId: 'sub-2' }),
    ]

    const result = deleteSubjectWithAssignments(subjects, assignments, 'sub-1')

    expect(result.status).toBe('deleted')
    if (result.status === 'deleted') {
      expect(result.subjects.map((subject) => subject.id)).toEqual(['sub-2'])
      expect(result.assignments.map((a) => a.id)).toEqual(['a2'])
      expect(result.removedAssignmentIds).toEqual(['a1'])
    }
  })

  it('never leaves an orphaned assignment', () => {
    const subjects = [subject({ id: 'sub-1' })]
    const assignments = [
      assignment({ id: 'a1', subjectId: 'sub-1' }),
      assignment({ id: 'a2', subjectId: 'sub-1' }),
    ]

    const result = deleteSubjectWithAssignments(subjects, assignments, 'sub-1')

    if (result.status === 'deleted') {
      expect(result.assignments).toHaveLength(0)
      const remainingIds = new Set(result.subjects.map((subject) => subject.id))
      expect(result.assignments.every((a) => remainingIds.has(a.subjectId))).toBe(true)
    }
  })

  it('reports whether a safe delete is possible', () => {
    expect(canDeleteSafely([assignment()], 'sub-1')).toBe(false)
    expect(canDeleteSafely([assignment({ subjectId: 'other' })], 'sub-1')).toBe(true)
    expect(canDeleteSafely([], 'sub-1')).toBe(true)
  })
})
