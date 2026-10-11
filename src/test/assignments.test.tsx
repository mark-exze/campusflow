import { renderHook, act } from '@testing-library/react'

import { sortAssignments, useAssignments } from '../features/assignments/store'
import { STORAGE_KEYS } from '../lib/constants'
import type { Assignment } from '../types'

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a-1',
    title: 'Test assignment',
    subjectId: 'sub-calc',
    type: 'homework',
    priority: 'medium',
    status: 'pending',
    dueDate: '2026-10-20',
    estimatedHours: 1,
    description: '',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

function setup() {
  return renderHook(() => useAssignments())
}

describe('sortAssignments', () => {
  it('puts completed assignments last', () => {
    const result = sortAssignments([
      makeAssignment({ id: 'done', status: 'completed' }),
      makeAssignment({ id: 'pending', status: 'pending' }),
    ])

    expect(result.map((assignment) => assignment.id)).toEqual(['pending', 'done'])
  })

  it('orders by due date then priority within incomplete work', () => {
    const result = sortAssignments([
      makeAssignment({ id: 'later', dueDate: '2026-10-25', priority: 'high' }),
      makeAssignment({ id: 'sooner', dueDate: '2026-10-20', priority: 'low' }),
      makeAssignment({ id: 'sooner-high', dueDate: '2026-10-20', priority: 'high' }),
    ])

    expect(result.map((assignment) => assignment.id)).toEqual([
      'sooner-high',
      'sooner',
      'later',
    ])
  })

  it('does not mutate the input array', () => {
    const input = [
      makeAssignment({ id: 'done', status: 'completed' }),
      makeAssignment({ id: 'pending', status: 'pending' }),
    ]
    const copy = [...input]

    sortAssignments(input)

    expect(input).toEqual(copy)
  })
})

describe('useAssignments store', () => {
  it('seeds sample assignments on first run', () => {
    const { result } = setup()

    expect(result.current.assignments.length).toBeGreaterThan(0)
    expect(result.current.subjects.length).toBeGreaterThan(0)
  })

  it('adds an assignment as pending and returns it', () => {
    const { result } = setup()

    let createdId = ''

    act(() => {
      createdId = result.current.addAssignment({
        title: '  New quiz  ',
        subjectId: 'sub-ds',
        type: 'quiz',
        priority: 'high',
        dueDate: '2026-12-01',
        estimatedHours: 2,
        description: '  revision  ',
      }).id
    })

    // The store exposes a sorted list, so look the item up by id.
    const added = result.current.assignments.find((item) => item.id === createdId)
    expect(added?.title).toBe('New quiz')
    expect(added?.description).toBe('revision')
    expect(added?.status).toBe('pending')
    expect(added?.priority).toBe('high')
  })

  it('generates unique ids for each new assignment', () => {
    const { result } = setup()
    const baseInput = {
      subjectId: 'sub-ds',
      type: 'quiz' as const,
      priority: 'low' as const,
      dueDate: '2026-12-01',
      estimatedHours: 1,
      description: '',
    }

    act(() => {
      result.current.addAssignment({ ...baseInput, title: 'First' })
      result.current.addAssignment({ ...baseInput, title: 'Second' })
    })

    const ids = result.current.assignments.map((assignment) => assignment.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('toggles completion back and forth', () => {
    const { result } = setup()
    const target = result.current.activeAssignments[0]
    expect(target).toBeDefined()

    act(() => {
      result.current.toggleComplete(target!.id)
    })
    expect(result.current.getAssignmentStatus(target!.id)).toBe('completed')

    act(() => {
      result.current.toggleComplete(target!.id)
    })
    expect(result.current.getAssignmentStatus(target!.id)).toBe('pending')
  })

  it('splits overdue from upcoming work', () => {
    const { result } = setup()

    for (const assignment of result.current.overdueAssignments) {
      expect(assignment.status).not.toBe('completed')
    }

    for (const assignment of result.current.upcomingAssignments) {
      expect(assignment.status).not.toBe('completed')
    }
  })

  it('deletes an assignment', () => {
    const { result } = setup()
    const target = result.current.assignments[0]!
    const before = result.current.assignments.length

    act(() => {
      result.current.deleteAssignment(target.id)
    })

    expect(result.current.assignments).toHaveLength(before - 1)
    expect(result.current.assignments.find((item) => item.id === target.id)).toBeUndefined()
  })

  it('persists assignments to localStorage', () => {
    const { result } = setup()

    act(() => {
      result.current.addAssignment({
        title: 'Persisted',
        subjectId: 'sub-lit',
        type: 'essay',
        priority: 'medium',
        dueDate: '2026-11-20',
        estimatedHours: 3,
        description: '',
      })
    })

    const stored = window.localStorage.getItem(STORAGE_KEYS.assignments)
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!) as Assignment[]).toHaveLength(result.current.assignments.length)
    expect(stored).toContain('Persisted')
  })

  it('restores the sample data on reset', () => {
    const { result } = setup()

    act(() => {
      result.current.addAssignment({
        title: 'To be removed',
        subjectId: 'sub-lit',
        type: 'essay',
        priority: 'medium',
        dueDate: '2026-11-20',
        estimatedHours: 3,
        description: '',
      })
    })
    const changed = result.current.assignments.length

    act(() => {
      result.current.resetToSampleData()
    })

    expect(result.current.assignments).toHaveLength(changed - 1)
    expect(
      result.current.assignments.some((assignment) => assignment.title === 'To be removed'),
    ).toBe(false)
  })

  it("returns today's classes limited to the current weekday", () => {
    const { result } = setup()

    expect(result.current.todayClasses.length).toBeGreaterThan(0)
    for (const session of result.current.todayClasses) {
      expect(session.dayOfWeek).toBe(new Date().getDay())
    }
  })

  it('builds a seven-day week schedule', () => {
    const { result } = setup()

    expect(result.current.weekSchedule).toHaveLength(7)
    const total = result.current.weekSchedule.reduce(
      (sum, day) => sum + day.classes.length,
      0,
    )
    expect(total).toBe(result.current.classSessions.length)
  })
})
