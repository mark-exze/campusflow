import { act, renderHook } from '@testing-library/react'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderAppAt } from './renderAppAt'
import { renderWithRouter } from './utils'
import { SubjectsPage } from '../features/subjects/page'
import { MOCK_ASSIGNMENTS, MOCK_SUBJECTS } from '../lib/mockData'
import { STORAGE_KEYS } from '../lib/constants'
import { countAssignmentsBySubject, deleteSubjectWithAssignments } from '../lib/subjects'
import {
  editableSubjectOptions,
  hasNoActiveSubjects,
  selectableSubjects,
  toAssignmentFormValues,
  validateAssignmentForm,
} from '../features/assignments/validation'
import { useAssignments } from '../features/assignments/store'
import { useSubjects } from '../features/subjects/store'
import type { Assignment, Subject } from '../types'

type AssignmentFormValues = ReturnType<typeof toAssignmentFormValues>

const FORM_VALUES: AssignmentFormValues = {
  title: 'New task',
  subjectId: '',
  type: 'homework',
  priority: 'medium',
  status: 'pending',
  dueDate: '2026-12-01',
  estimatedHours: '2',
  description: '',
  progress: '0',
}

/** The same task expressed as a store input, since the store takes numbers. */
const NEW_TASK = {
  title: 'New task',
  subjectId: 'sub-ds',
  type: 'homework' as const,
  priority: 'medium' as const,
  dueDate: '2026-12-01',
  estimatedHours: 2,
  description: '',
  progress: 0,
}

function archivedByDefault(...ids: string[]): Subject[] {
  return MOCK_SUBJECTS.map((subject) =>
    ids.includes(subject.id) ? { ...subject, archived: true } : subject,
  )
}

function readStored<T>(key: string): T {
  return JSON.parse(window.localStorage.getItem(key)!) as T
}

/**
 * Write through the subjects store, then drop the hook. Mounting the
 * assignments store afterwards re-reads the same key, which is what happens
 * when the student navigates between pages.
 */
function setArchivedInStore(subjectId: string, archived: boolean): void {
  const { result, unmount } = renderHook(() => useSubjects())
  act(() => {
    result.current.setArchived(subjectId, archived)
  })
  unmount()
}

function mountAssignments() {
  return renderHook(() => useAssignments())
}

// ---------------------------------------------------------------------------
// 1. Archived subjects cannot receive new assignments
// ---------------------------------------------------------------------------

describe('archived subjects cannot receive new assignments', () => {
  it('excludes archived subjects from the selectable list', () => {
    const selectable = selectableSubjects(archivedByDefault('sub-calc'))

    expect(selectable.some((subject) => subject.id === 'sub-calc')).toBe(false)
    expect(selectable).toHaveLength(MOCK_SUBJECTS.length - 1)
  })

  it('refuses an archived subject at the validation layer', () => {
    const subjects = archivedByDefault('sub-calc')
    const errors = validateAssignmentForm({ ...FORM_VALUES, subjectId: 'sub-calc' }, subjects)

    expect(errors.subjectId).toBeDefined()
    expect(errors.subjectId).toMatch(/archived/i)
  })

  it('accepts an active subject', () => {
    const subjects = archivedByDefault('sub-calc')
    const activeId = selectableSubjects(subjects)[0]!.id

    expect(validateAssignmentForm({ ...FORM_VALUES, subjectId: activeId }, subjects)).toEqual({})
  })

  it('blocks creation in the store, not only in the form', () => {
    setArchivedInStore('sub-calc', true)

    const { result } = mountAssignments()

    let reason = ''
    act(() => {
      const outcome = result.current.addAssignment({
        ...NEW_TASK,
        title: 'Should not be added',
        subjectId: 'sub-calc',
        estimatedHours: 2,
      })
      if (outcome.status === 'blocked') reason = outcome.reason
    })

    expect(reason).toMatch(/archived/i)
    expect(result.current.assignments.some((a) => a.title === 'Should not be added')).toBe(false)
  })

  it('detects when every subject is archived', () => {
    const allIds = MOCK_SUBJECTS.map((subject) => subject.id)
    expect(hasNoActiveSubjects(archivedByDefault(...allIds))).toBe(true)
    expect(hasNoActiveSubjects(MOCK_SUBJECTS)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2. Existing assignments retain their archived subject association
// ---------------------------------------------------------------------------

describe('existing assignments keep an archived subject', () => {
  it('keeps the archived subject selectable when editing that assignment', () => {
    const options = editableSubjectOptions(archivedByDefault('sub-calc'), 'sub-calc')

    expect(options.some((subject) => subject.id === 'sub-calc')).toBe(true)
    // Only the subject already in use is carried over.
    expect(options).toHaveLength(MOCK_SUBJECTS.length)
  })

  it('does not add other archived subjects when editing', () => {
    const options = editableSubjectOptions(archivedByDefault('sub-calc', 'sub-lit'), 'sub-calc')

    expect(options.some((subject) => subject.id === 'sub-calc')).toBe(true)
    expect(options.some((subject) => subject.id === 'sub-lit')).toBe(false)
  })

  it('permits saving an assignment that stays on its archived subject', () => {
    const subjects = archivedByDefault('sub-calc')

    expect(
      validateAssignmentForm({ ...FORM_VALUES, subjectId: 'sub-calc' }, subjects, {
        currentSubjectId: 'sub-calc',
      }),
    ).toEqual({})
  })

  it('refuses moving an assignment to a different archived subject', () => {
    const subjects = archivedByDefault('sub-calc', 'sub-lit')

    expect(
      validateAssignmentForm({ ...FORM_VALUES, subjectId: 'sub-lit' }, subjects, {
        currentSubjectId: 'sub-calc',
      }).subjectId,
    ).toMatch(/archived/i)
  })

  it('falls back to active subjects when there is nothing to preserve', () => {
    const options = editableSubjectOptions(archivedByDefault('sub-calc'), undefined)

    expect(options.some((subject) => subject.id === 'sub-calc')).toBe(false)
    expect(options).toHaveLength(MOCK_SUBJECTS.length - 1)
  })

  it('resolves the subject name for an assignment on an archived subject', () => {
    const { result } = mountAssignments()

    const assignment = result.current.assignments.find((a) => a.subjectId === 'sub-calc')
    expect(assignment).toBeDefined()
    expect(result.current.getSubject(assignment!.subjectId)?.name).toBe('Calculus II')
  })

  it('round-trips an assignment through edit form values without changing its subject', () => {
    const assignment: Assignment = {
      id: 'a1',
      title: 'Problem Set 1',
      subjectId: 'sub-calc',
      type: 'homework',
      priority: 'high',
      status: 'pending',
      dueDate: '2026-11-01',
      estimatedHours: 2,
      description: 'notes',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    }

    expect(toAssignmentFormValues(assignment)).toMatchObject({
      title: 'Problem Set 1',
      subjectId: 'sub-calc',
      priority: 'high',
      dueDate: '2026-11-01',
      estimatedHours: '2',
    })
  })

  it('keeps the archived subject visible on its assignments in the UI', async () => {
    setArchivedInStore('sub-calc', true)
    renderAppAt('/assignments')

    expect(await screen.findByText('Problem Set 5 — Integration')).toBeInTheDocument()
    expect(screen.getAllByText('MATH 201').length).toBeGreaterThan(0)
  })

  it('closes the form instead of reopening create when ending an edit', async () => {
    const user = userEvent.setup()
    renderAppAt('/assignments')

    // Start an edit from the card action.
    await user.click(screen.getAllByRole('button', { name: /^Edit /i })[0]!)
    expect(await screen.findByRole('form', { name: /edit assignment/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Close$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('form')).not.toBeInTheDocument()
    })
  })

  it('edits an assignment without changing its subject when that subject is archived', async () => {
    const user = userEvent.setup()
    setArchivedInStore('sub-calc', true)
    renderAppAt('/assignments')

    await user.click(screen.getAllByRole('button', { name: /Edit .*Problem Set 5/i })[0]!)
    const form = await screen.findByRole('form', { name: /edit assignment/i })

    // The archived subject stays selected and stays in the dropdown.
    expect(within(form).getByLabelText(/subject/i)).toHaveValue('sub-calc')
    expect(within(form).getByRole('option', { name: /MATH 201/ })).toBeInTheDocument()
    expect(within(form).getByText(/kept on an archived subject/i)).toBeInTheDocument()

    await user.clear(within(form).getByLabelText(/title/i))
    await user.type(within(form).getByLabelText(/title/i), 'Problem Set 5 Revised')
    await user.click(within(form).getByRole('button', { name: /save changes/i }))

    // The rename is saved and the subject association survives.
    expect(await screen.findByText('Problem Set 5 Revised')).toBeInTheDocument()
    expect(screen.getAllByText('MATH 201').length).toBeGreaterThan(0)
  })

  it('does not offer another archived subject as an edit target', async () => {
    const user = userEvent.setup()
    setArchivedInStore('sub-lit', true)
    renderAppAt('/assignments')

    await user.click(screen.getAllByRole('button', { name: /Edit .*Problem Set 5/i })[0]!)
    const form = await screen.findByRole('form', { name: /edit assignment/i })

    // English Literature is archived and this assignment does not use it, so
    // it must not be offered as a destination.
    const options = within(form).getAllByRole('option')
    expect(options.some((option) => option.textContent?.includes('ENG 210'))).toBe(false)

    // Saving with the preserved subject still works.
    await user.click(within(form).getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(screen.queryByRole('form')).not.toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// 3. Restoring a subject enables assignment creation
// ---------------------------------------------------------------------------

describe('restoring a subject enables assignment creation', () => {
  it('makes an archived subject selectable again', () => {
    const archived = archivedByDefault('sub-calc')
    const restored = archived.map((subject) =>
      subject.id === 'sub-calc' ? { ...subject, archived: false } : subject,
    )

    expect(selectableSubjects(archived).some((s) => s.id === 'sub-calc')).toBe(false)
    expect(selectableSubjects(restored).some((s) => s.id === 'sub-calc')).toBe(true)
    expect(
      validateAssignmentForm({ ...FORM_VALUES, subjectId: 'sub-calc' }, restored).subjectId,
    ).toBeUndefined()
  })

  it('allows the store to create an assignment after restoring', () => {
    setArchivedInStore('sub-calc', true)

    const blocked = mountAssignments()
    act(() => {
      expect(
        blocked.result.current.addAssignment({
          ...NEW_TASK,
          title: 'Blocked once',
          subjectId: 'sub-calc',
          estimatedHours: 2,
        }).status,
      ).toBe('blocked')
    })
    blocked.unmount()

    setArchivedInStore('sub-calc', false)

    const { result } = mountAssignments()
    act(() => {
      expect(
        result.current.addAssignment({
          ...NEW_TASK,
          title: 'Allowed after restore',
          subjectId: 'sub-calc',
          estimatedHours: 2,
        }).status,
      ).toBe('created')
    })

    expect(result.current.assignments.some((a) => a.title === 'Allowed after restore')).toBe(true)
  })

  it('removes an archived subject from the Add Assignment dropdown', async () => {
    const user = userEvent.setup()
    renderAppAt('/subjects')

    // Archive Calculus II.
    await user.click(screen.getByRole('button', { name: /Archive Calculus II/i }))
    await screen.findByRole('button', { name: /Restore Calculus II/i })

    // The Add Assignment dropdown must stop offering it. Scope to the form,
    // because the page's subject *filter* deliberately keeps archived subjects.
    await user.click(screen.getAllByRole('link', { name: /assignments/i })[0]!)
    await user.click(screen.getByRole('button', { name: /^Add assignment$/i }))

    const form = await screen.findByRole('form', { name: /add assignment/i })
    const options = within(form).getAllByRole('option')
    expect(options.some((option) => option.getAttribute('value') === 'sub-calc')).toBe(false)
    expect(options.some((option) => option.getAttribute('value') === 'sub-ds')).toBe(true)
  })

  it('returns a restored subject to the Add Assignment dropdown', async () => {
    const user = userEvent.setup()
    setArchivedInStore('sub-calc', true)
    renderAppAt('/subjects')

    // Restore it, then confirm the Add Assignment form offers it again.
    await user.click(await screen.findByRole('button', { name: /Restore Calculus II/i }))

    await user.click(screen.getAllByRole('link', { name: /assignments/i })[0]!)
    await user.click(await screen.findByRole('button', { name: /^Add assignment$/i }))

    const form = await screen.findByRole('form', { name: /add assignment/i })
    const options = within(form).getAllByRole('option')
    expect(options.some((option) => option.getAttribute('value') === 'sub-calc')).toBe(true)
  })

  it('warns the student instead of allowing creation when every subject is archived', async () => {
    // Archive every subject through the store.
    for (const subject of MOCK_SUBJECTS) {
      setArchivedInStore(subject.id, true)
    }

    renderAppAt('/assignments')

    expect(await screen.findByText('No active subjects')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Add assignment$/i })).toBeDisabled()
    expect(screen.getByRole('link', { name: /go to subjects/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 4. Completed assignments are counted in deletion
// ---------------------------------------------------------------------------

describe('completed assignments are counted for deletion', () => {
  it('includes completed assignments in the total', () => {
    // Give every sample assignment to one subject, completed ones included.
    const assignments: Assignment[] = MOCK_ASSIGNMENTS.map((assignment) => ({
      ...assignment,
      subjectId: 'sub-calc',
    }))

    const counts = countAssignmentsBySubject(assignments)

    expect(counts.get('sub-calc')).toEqual({
      active: assignments.filter((a) => a.status !== 'completed').length,
      completed: assignments.filter((a) => a.status === 'completed').length,
      total: assignments.length,
    })
    // The sample data deliberately includes completed work.
    expect(assignments.some((a) => a.status === 'completed')).toBe(true)
  })

  it('treats a subject with only completed assignments as still occupied', () => {
    const onlyCompleted: Assignment[] = [
      {
        id: 'a1',
        title: 'Done',
        subjectId: 'sub-calc',
        type: 'homework',
        priority: 'low',
        status: 'completed',
        dueDate: '2026-09-01',
        estimatedHours: 1,
        description: '',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]

    const counts = countAssignmentsBySubject(onlyCompleted)
    expect(counts.get('sub-calc')).toEqual({ active: 0, completed: 1, total: 1 })
  })

  it('shows the completed breakdown in the delete dialog', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    await user.click(screen.getByRole('button', { name: /Delete Calculus II/i }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getAllByText(/1 incomplete and 1 completed/i).length).toBeGreaterThan(0)
    expect(within(dialog).getByText(/Completed assignments are deleted too/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/Recommended:/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 5. Deletion removes associated records only after confirmation
// ---------------------------------------------------------------------------

describe('deletion requires confirmation', () => {
  it('removes the subject and every dependent assignment', () => {
    const subjects = MOCK_SUBJECTS.map((subject) => ({ ...subject }))
    const assignments = MOCK_ASSIGNMENTS.map((assignment) => ({ ...assignment }))
    const dependentIds = assignments
      .filter((assignment) => assignment.subjectId === 'sub-calc')
      .map((assignment) => assignment.id)
    expect(dependentIds.length).toBeGreaterThan(0)

    const result = deleteSubjectWithAssignments(subjects, assignments, 'sub-calc')

    expect(result.status).toBe('deleted')
    if (result.status === 'deleted') {
      expect(result.subjects.some((subject) => subject.id === 'sub-calc')).toBe(false)
      expect([...result.removedAssignmentIds].sort()).toEqual([...dependentIds].sort())
      expect(result.assignments.some((a) => a.subjectId === 'sub-calc')).toBe(false)

      // No orphaned records remain.
      const remainingSubjectIds = new Set(result.subjects.map((subject) => subject.id))
      expect(
        result.assignments.every((assignment) => remainingSubjectIds.has(assignment.subjectId)),
      ).toBe(true)
    }
  })

  it('deletes nothing when the confirmation dialog is cancelled', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    const subjectsBefore = readStored<Subject[]>(STORAGE_KEYS.subjects)
    const assignmentsBefore = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    expect(subjectsBefore.length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /Delete Calculus II/i }))
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: /^Cancel$/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(readStored<Subject[]>(STORAGE_KEYS.subjects)).toEqual(subjectsBefore)
    expect(readStored<Assignment[]>(STORAGE_KEYS.assignments)).toEqual(assignmentsBefore)
  })

  it('deletes nothing while the confirmation checkbox is unticked', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    const subjectsBefore = readStored<Subject[]>(STORAGE_KEYS.subjects)

    await user.click(screen.getByRole('button', { name: /Delete Calculus II/i }))
    const dialog = await screen.findByRole('dialog')

    // The destructive button is inert until the student opts in.
    const confirmButton = within(dialog).getByRole('button', {
      name: /Delete subject and \d+ assignments?/i,
    })
    expect(confirmButton).toBeDisabled()

    await user.click(confirmButton).catch(() => undefined)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }).catch(() => undefined)

    expect(readStored<Subject[]>(STORAGE_KEYS.subjects)).toEqual(subjectsBefore)
  })
})

// ---------------------------------------------------------------------------
// 6. Data stays consistent after a refresh
// ---------------------------------------------------------------------------

describe('data consistency after refresh', () => {
  it('restores archived state and dependent assignments on remount', () => {
    setArchivedInStore('sub-phys', true)

    const { result } = mountAssignments()
    expect(result.current.subjects.find((s) => s.id === 'sub-phys')?.archived).toBe(true)

    // Its assignments survive and still point at the archived subject.
    const physics = result.current.assignments.filter((a) => a.subjectId === 'sub-phys')
    expect(physics.length).toBeGreaterThan(0)
    expect(result.current.getSubject('sub-phys')?.archived).toBe(true)
  })

  it('keeps every stored assignment pointing at a stored subject', () => {
    // Mounting once seeds storage from the sample data.
    const seeded = mountAssignments()
    expect(seeded.result.current.assignments.length).toBeGreaterThan(0)
    seeded.unmount()

    const subjects = readStored<Subject[]>(STORAGE_KEYS.subjects)
    const assignments = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    const subjectIds = new Set(subjects.map((subject) => subject.id))

    for (const assignment of assignments) {
      expect(subjectIds.has(assignment.subjectId)).toBe(true)
    }
  })

  it('leaves no orphans after a confirmed deletion, across a reload', () => {
    const { result, unmount } = renderHook(() => ({
      subjectsStore: useSubjects(),
      assignmentsStore: useAssignments(),
    }))

    act(() => {
      result.current.subjectsStore.removeSubject('sub-calc')
      result.current.assignmentsStore.deleteAssignmentsBySubject('sub-calc')
    })
    unmount()

    // Remount, as a page refresh would.
    const { result: reloaded } = renderHook(() => ({
      subjectsStore: useSubjects(),
      assignmentsStore: useAssignments(),
    }))

    const subjects = reloaded.current.subjectsStore.subjects
    const assignments = reloaded.current.assignmentsStore.assignments

    expect(subjects.some((s) => s.id === 'sub-calc')).toBe(false)
    expect(assignments.some((a) => a.subjectId === 'sub-calc')).toBe(false)

    const subjectIds = new Set(subjects.map((subject) => subject.id))
    for (const assignment of assignments) {
      expect(subjectIds.has(assignment.subjectId)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Two stores share one key — stale instances must never clobber newer data
// ---------------------------------------------------------------------------

describe('shared localStorage key does not lose writes', () => {
  it('keeps a newer subject write when an older hook instance is still mounted', () => {
    const mockCount = MOCK_SUBJECTS.length

    // The assignments store also reads the subjects key. Mount it first so its
    // copy goes stale, exactly as happens while both pages are alive.
    const { result: reader, rerender } = renderHook(() => useAssignments())
    const { result: writer, unmount } = renderHook(() => useSubjects())

    act(() => {
      writer.current.removeSubject('sub-calc')
    })
    unmount()

    // Re-rendering the stale reader must not push its old copy back to storage.
    rerender()

    const stored = readStored<Subject[]>(STORAGE_KEYS.subjects)
    expect(stored).toHaveLength(mockCount - 1)
    expect(stored.some((subject) => subject.id === 'sub-calc')).toBe(false)

    // The stale instance keeps showing its own snapshot, which is harmless
    // because it is remounted on navigation.
    expect(reader.current.subjects).toHaveLength(mockCount)
  })

  it('shows the updated subject list on the next mount', () => {
    // Write through the subjects store first, as the subjects page does.
    const { result: writer, unmount } = renderHook(() => useSubjects())
    act(() => {
      writer.current.removeSubject('sub-calc')
    })
    unmount()

    // A remounted assignments store reads the updated key.
    const { result } = renderHook(() => ({
      subjects: useSubjects(),
      assignments: useAssignments(),
    }))

    const resolved = result.current.assignments.subjects
    expect(resolved).toHaveLength(MOCK_SUBJECTS.length - 1)
    expect(resolved.some((subject) => subject.id === 'sub-calc')).toBe(false)
  })
})
