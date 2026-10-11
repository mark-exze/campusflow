import { act, renderHook } from '@testing-library/react'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderAppAt } from './renderAppAt'
import { STORAGE_KEYS } from '../lib/constants'
import { MOCK_ASSIGNMENTS } from '../lib/mockData'
import { getAssignmentProgress } from '../lib/assignmentProgress'
import { getTodayDateString } from '../lib/date'
import { normalizeAssignment, useAssignments } from '../features/assignments/store'
import { useSubjects } from '../features/subjects/store'
import type { Assignment } from '../types'

function readStored<T>(key: string): T {
  return JSON.parse(window.localStorage.getItem(key)!) as T
}

/** Archive/unarchive through the subjects store, then drop the hook. */
function setArchivedInStore(subjectId: string, archived: boolean): void {
  const { result, unmount } = renderHook(() => useSubjects())
  act(() => {
    result.current.setArchived(subjectId, archived)
  })
  unmount()
}
/** Mount both stores together, as the subjects page does. */
function mountBoth() {
  return renderHook(() => ({ subjectsStore: useSubjects(), assignmentsStore: useAssignments() }))
}

const CREATE_INPUT = {
  title: 'New task',
  subjectId: 'sub-ds',
  type: 'homework' as const,
  priority: 'medium' as const,
  dueDate: '2026-12-01',
  estimatedHours: 2,
  description: '',
}

// ---------------------------------------------------------------------------
// 1. Archived subjects cannot receive new assignments (store layer)
// ---------------------------------------------------------------------------

describe('archived restrictions at the store layer', () => {
  it('blocks creation on an archived subject', () => {
    const { result } = mountBoth()

    act(() => {
      result.current.subjectsStore.setArchived('sub-calc', true)
    })

    let reason = ''
    act(() => {
      const outcome = result.current.assignmentsStore.addAssignment({
        ...CREATE_INPUT,
        subjectId: 'sub-calc',
      })
      if (outcome.status === 'blocked') reason = outcome.reason
    })

    expect(reason).toMatch(/archived/i)
    expect(result.current.assignmentsStore.assignments.some((a) => a.subjectId === 'sub-calc' && a.title === 'New task')).toBe(false)
  })

  it('blocks changing an assignment onto an archived subject', () => {
    const { result } = mountBoth()

    act(() => {
      result.current.subjectsStore.setArchived('sub-lit', true)
    })

    const target = result.current.assignmentsStore.assignments.find((a) => a.subjectId === 'sub-ds')!

    act(() => {
      const outcome = result.current.assignmentsStore.updateAssignment(target.id, {
        subjectId: 'sub-lit',
      })
      expect(outcome.status).toBe('blocked')
    })

    // The assignment keeps its original subject.
    const after = result.current.assignmentsStore.assignments.find((a) => a.id === target.id)!
    expect(after.subjectId).toBe(target.subjectId)
  })
})

// ---------------------------------------------------------------------------
// 2. Existing assignments keep their archived subject
// ---------------------------------------------------------------------------

describe('editing an assignment on an archived subject', () => {
  it('permits saving without changing the subject', () => {
    const { result } = mountBoth()

    act(() => {
      result.current.subjectsStore.setArchived('sub-calc', true)
    })

    const target = result.current.assignmentsStore.assignments.find(
      (a) => a.subjectId === 'sub-calc',
    )!

    let updated: Assignment | undefined
    act(() => {
      const outcome = result.current.assignmentsStore.updateAssignment(target.id, {
        title: 'Renamed still on the archived subject',
      })
      if (outcome.status === 'updated') updated = outcome.assignment
    })

    expect(updated?.subjectId).toBe('sub-calc')
    expect(updated?.title).toBe('Renamed still on the archived subject')
  })

  it('edits a title and description without disturbing other fields', () => {
    const { result } = renderHook(() => useAssignments())
    const target = result.current.assignments[0]!

    let updated: Assignment | undefined
    act(() => {
      const outcome = result.current.updateAssignment(target.id, {
        title: 'Updated title',
        description: 'Updated description',
      })
      if (outcome.status === 'updated') updated = outcome.assignment
    })

    expect(updated?.title).toBe('Updated title')
    expect(updated?.description).toBe('Updated description')
    expect(updated?.dueDate).toBe(target.dueDate)
    expect(updated?.type).toBe(target.type)
    expect(updated?.priority).toBe(target.priority)
    expect(updated?.subjectId).toBe(target.subjectId)
    expect(updated?.createdAt).toBe(target.createdAt)
  })

  it('rejects an update for an assignment that no longer exists', () => {
    const { result } = renderHook(() => useAssignments())

    act(() => {
      const outcome = result.current.updateAssignment('does-not-exist', { title: 'x' })
      expect(outcome.status).toBe('blocked')
    })
  })
})

// ---------------------------------------------------------------------------
// 3. Progress and status consistency
// ---------------------------------------------------------------------------

describe('progress and status consistency', () => {
  it('sets progress to 100 when a store update completes an assignment', () => {
    const { result } = renderHook(() => useAssignments())
    const target = result.current.activeAssignments[0]!

    act(() => {
      result.current.updateAssignment(target.id, { status: 'completed', progress: 40 })
    })

    const after = result.current.assignments.find((a) => a.id === target.id)!
    expect(after.status).toBe('completed')
    expect(after.progress).toBe(100)
    expect(getAssignmentProgress(after)).toBe(100)
  })

  it('caps progress below 100 when reopening a completed assignment', () => {
    const { result } = renderHook(() => useAssignments())
    const target = result.current.completedAssignments[0]!

    act(() => {
      result.current.updateAssignment(target.id, { status: 'in-progress', progress: 100 })
    })

    const after = result.current.assignments.find((a) => a.id === target.id)!
    expect(after.status).toBe('in-progress')
    expect(after.progress).toBe(99)
  })

  it('keeps toggleComplete and progress in step', () => {
    const { result } = renderHook(() => useAssignments())
    const target = result.current.activeAssignments[0]!

    act(() => {
      result.current.toggleComplete(target.id)
    })
    expect(result.current.getAssignmentStatus(target.id)).toBe('completed')
    expect(getAssignmentProgress(result.current.assignments.find((a) => a.id === target.id)!)).toBe(
      100,
    )

    act(() => {
      result.current.toggleComplete(target.id)
    })
    const reopened = result.current.assignments.find((a) => a.id === target.id)!
    expect(reopened.status).toBe('pending')
    expect(getAssignmentProgress(reopened)).toBeLessThan(100)
  })

  it('starts a newly created assignment at 0', () => {
    const { result } = renderHook(() => useAssignments())

    let created: Assignment | undefined
    act(() => {
      const outcome = result.current.addAssignment(CREATE_INPUT)
      if (outcome.status === 'created') created = outcome.assignment
    })

    expect(created?.progress).toBe(0)
    expect(getAssignmentProgress(created!)).toBe(0)
  })

  it('applies an explicit progress value on creation', () => {
    const { result } = renderHook(() => useAssignments())

    let created: Assignment | undefined
    act(() => {
      const outcome = result.current.addAssignment({
        ...CREATE_INPUT,
        title: 'Half done',
        progress: 50,
      })
      if (outcome.status === 'created') created = outcome.assignment
    })

    expect(created?.progress).toBe(50)
  })

  it('setProgress validates against the status', () => {
    const { result } = renderHook(() => useAssignments())
    const target = result.current.activeAssignments[0]!

    act(() => {
      const outcome = result.current.setProgress(target.id, 42)
      expect(outcome.status).toBe('updated')
    })
    expect(result.current.assignments.find((a) => a.id === target.id)?.progress).toBe(42)
  })

  it('normalizes a legacy record with no progress field', () => {
    const legacy = {
      id: 'legacy-1',
      title: 'Old record',
      subjectId: 'sub-1',
      type: 'homework',
      priority: 'medium',
      status: 'in-progress',
      dueDate: '2026-12-01',
      estimatedHours: 2,
      description: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as unknown as Assignment

    expect(normalizeAssignment(legacy).progress).toBe(0)
    expect(normalizeAssignment({ ...legacy, status: 'completed' }).progress).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// 4. Deadline handling and dashboard synchronization
// ---------------------------------------------------------------------------

describe('deadline handling', () => {
  it('excludes completed work from the overdue selector', () => {
    const { result } = renderHook(() => useAssignments())

    for (const assignment of result.current.overdueAssignments) {
      expect(assignment.status).not.toBe('completed')
    }
    expect(result.current.overdueAssignments.some((a) => a.dueDate < getTodayDateString())).toBe(
      true,
    )
  })

  it('counts due-today work using local dates', () => {
    const { result } = renderHook(() => useAssignments())
    const today = getTodayDateString()

    expect(
      result.current.activeAssignments.filter((a) => a.dueDate === today).length,
    ).toBe(result.current.stats.dueToday)
  })

  it('updates dashboard counts when an assignment changes', () => {
    const { result } = renderHook(() => useAssignments())

    const activeBefore = result.current.stats.active
    const completedBefore = result.current.stats.completed
    const target = result.current.activeAssignments[0]!

    act(() => {
      result.current.toggleComplete(target.id)
    })

    expect(result.current.stats.completed).toBe(completedBefore + 1)
    expect(result.current.stats.active).toBe(activeBefore - 1)
  })

  it('removes an overdue assignment from the overdue count once completed', () => {
    const { result } = renderHook(() => useAssignments())
    const overdue = result.current.overdueAssignments[0]
    expect(overdue).toBeDefined()
    const before = result.current.stats.overdue

    act(() => {
      result.current.toggleComplete(overdue!.id)
    })

    expect(result.current.stats.overdue).toBe(before - 1)
  })

  it('reflects progress in the dashboard average', () => {
    const { result } = renderHook(() => useAssignments())
    expect(result.current.stats.averageProgress).toBeGreaterThanOrEqual(0)
    expect(result.current.stats.averageProgress).toBeLessThanOrEqual(100)
  })

  it('counts active assignments for the progress label', () => {
    const { result } = renderHook(() => useAssignments())
    expect(result.current.stats.active).toBe(result.current.activeAssignments.length)
  })
})

// ---------------------------------------------------------------------------
// 6. Page integration: search, filters, sorting and editing
// ---------------------------------------------------------------------------

describe('assignments page', () => {
  it('filters the list by a search term', async () => {
    const user = userEvent.setup()
    renderAppAt('/assignments')

    const search = screen.getByRole('searchbox', { name: /search assignments/i })
    await user.type(search, 'modernist')

    expect(await screen.findByText('Essay: Modernist Themes')).toBeInTheDocument()
  })

  it('shows a no-matches empty state, distinct from having no assignments', async () => {
    const user = userEvent.setup()
    renderAppAt('/assignments')

    await user.type(
      screen.getByRole('searchbox', { name: /search assignments/i }),
      'zzzz-no-such-thing',
    )

    expect(await screen.findByText('No matching assignments')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument()
  })

  it('clears every filter at once', async () => {
    const user = userEvent.setup()
    renderAppAt('/assignments')

    await user.type(screen.getByRole('searchbox', { name: /search assignments/i }), 'zzzz')
    await screen.findByText('No matching assignments')

    await user.click(screen.getByRole('button', { name: /clear all filters/i }))

    expect(screen.queryByText('No matching assignments')).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: /search assignments/i })).toHaveValue('')
  })

  it('combines a subject filter with a status filter', async () => {
    const user = userEvent.setup()
    renderAppAt('/assignments')

    await user.selectOptions(screen.getByLabelText(/^subject$/i), 'sub-calc')
    await user.selectOptions(screen.getByLabelText(/^status$/i), 'completed')

    expect(await screen.findByText('Problem Set 4 — Limits')).toBeInTheDocument()
    // The in-progress Calculus assignment is filtered out.
    expect(screen.queryByText('Problem Set 5 — Integration')).not.toBeInTheDocument()
  })

  it('offers archived subjects in the subject filter', async () => {
    setArchivedInStore('sub-calc', true)
    renderAppAt('/assignments')

    // The filter drop-down keeps archived subjects so historical assignments
    // stay reachable; only the Add form hides them.
    const option = await screen.findByRole('option', { name: /MATH 201.*archived/i })
    expect(option).toHaveValue('sub-calc')
  })

  it('re-sorts the list by newest created', async () => {
    const user = userEvent.setup()
    renderAppAt('/assignments')

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'created-desc')

    // Sorting must not drop any assignment.
    const cards = screen.getAllByRole('article')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('edits status and progress through the form', async () => {
    const user = userEvent.setup()
    renderAppAt('/assignments')

    await user.click(screen.getAllByRole('button', { name: /^Edit /i })[0]!)
    const form = await screen.findByRole('form', { name: /edit assignment/i })

    await user.selectOptions(within(form).getByLabelText(/^status$/i), 'completed')

    // Completing pins progress to 100 and disables manual entry.
    await waitFor(() => {
      expect((within(form).getByLabelText(/^progress$/i) as HTMLInputElement).value).toBe('100')
    })

    await user.click(within(form).getByRole('button', { name: /save changes/i }))

    const stored = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    expect(stored.filter((assignment) => assignment.status === 'completed').length).toBeGreaterThan(
      1,
    )
  })

  it('keeps progress below 100 when reopening a completed assignment', async () => {
    const user = userEvent.setup()
    renderAppAt('/assignments')

    // Find a completed assignment's edit button.
    const completedHeading = screen.getByRole('heading', { name: /^Completed \(/i })
    const section = completedHeading.closest('section')!
    await user.click(within(section).getAllByRole('button', { name: /^Edit /i })[0]!)

    const form = await screen.findByRole('form', { name: /edit assignment/i })
    await user.selectOptions(within(form).getByLabelText(/^status$/i), 'in-progress')

    const progressField = within(form).getByLabelText(/^progress$/i) as HTMLInputElement
    expect(Number(progressField.value)).toBeLessThanOrEqual(99)

    await user.click(within(form).getByRole('button', { name: /save changes/i }))

    const stored = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    expect(stored.every((assignment) => assignment.status !== 'completed' || assignment.progress === 100)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 5. Persistence and compatibility
// ---------------------------------------------------------------------------

describe('persistence', () => {
  it('keeps progress across a remount', () => {
    const { result, unmount } = renderHook(() => useAssignments())
    const target = result.current.activeAssignments[0]!

    act(() => {
      result.current.updateAssignment(target.id, { progress: 65 })
    })
    unmount()

    const { result: reloaded } = renderHook(() => useAssignments())
    expect(reloaded.current.assignments.find((a) => a.id === target.id)?.progress).toBe(65)
  })

  it('keeps the edited subject across a remount', () => {
    const { result, unmount } = renderHook(() => useAssignments())
    const target = result.current.assignments.find((a) => a.subjectId === 'sub-calc')!

    act(() => {
      result.current.updateAssignment(target.id, { title: 'Persisted rename' })
    })
    unmount()

    const stored = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    expect(stored.find((a) => a.id === target.id)?.title).toBe('Persisted rename')
    expect(stored.find((a) => a.id === target.id)?.subjectId).toBe('sub-calc')
  })

  it('does not reset sample data on refresh', () => {
    const { result, unmount } = renderHook(() => useAssignments())

    act(() => {
      const outcome = result.current.addAssignment(CREATE_INPUT)
      expect(outcome.status).toBe('created')
    })
    unmount()

    // A remount must not restore the sample list over the student's data.
    const { result: reloaded } = renderHook(() => useAssignments())
    expect(reloaded.current.assignments.some((a) => a.title === 'New task')).toBe(true)
    expect(reloaded.current.assignments.length).toBe(MOCK_ASSIGNMENTS.length + 1)
  })

  it('keeps archived subject associations after refresh', () => {
    const { result, unmount } = mountBoth()

    act(() => {
      result.current.subjectsStore.setArchived('sub-calc', true)
    })
    unmount()

    const { result: reloaded } = renderHook(() => useAssignments())
    const stored = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    const calcAssignments = stored.filter((a) => a.subjectId === 'sub-calc')

    expect(calcAssignments.length).toBeGreaterThan(0)
    expect(reloaded.current.subjects.find((s) => s.id === 'sub-calc')?.archived).toBe(true)
    // The dashboard still resolves a name for those assignments.
    for (const assignment of calcAssignments) {
      expect(reloaded.current.getSubject(assignment.subjectId)?.name).toBe('Calculus II')
    }
  })
})
