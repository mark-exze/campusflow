import { act, renderHook, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { renderAppAt } from './renderAppAt'
import { renderWithRouter } from './utils'
import { DashboardPage } from '../features/dashboard/page'
import { AssignmentForm } from '../features/assignments/AssignmentForm'
import { validateAssignmentForm } from '../features/assignments/validation'
import { SettingsPage } from '../features/settings/page'
import { SubjectsPage } from '../features/subjects/page'
import { MOCK_SUBJECTS } from '../lib/mockData'
import { STORAGE_KEYS } from '../lib/constants'
import { useAssignments } from '../features/assignments/store'
import { useSubjects } from '../features/subjects/store'
import type { Assignment, Subject } from '../types'

function readStored<T>(key: string): T {
  return JSON.parse(window.localStorage.getItem(key)!) as T
}

describe('DashboardPage', () => {
  it('renders every dashboard section', () => {
    renderWithRouter(<DashboardPage />)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText("Today's classes")).toBeInTheDocument()
    expect(screen.getByText('Upcoming deadlines')).toBeInTheDocument()
    expect(screen.getByText('Subject overview')).toBeInTheDocument()
    expect(screen.getByText('Quick actions')).toBeInTheDocument()
  })

  it('greets the student using the saved display name', () => {
    window.localStorage.setItem(
      'campusflow.profile.v1',
      JSON.stringify({
        displayName: 'Marisol',
        schoolLevel: 'university',
        schoolName: '',
        academicYear: '2026-2027',
        academicTerm: 'Fall Term',
        dateFormat: 'mdy',
      }),
    )

    renderWithRouter(<DashboardPage />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toContain('Marisol')
    // The hardcoded term must no longer appear.
    expect(heading.textContent).not.toContain('Week 6')
    expect(screen.getByText('Fall Term · 2026-2027')).toBeInTheDocument()
  })

  it('falls back to a neutral greeting when no name is saved', () => {
    renderWithRouter(<DashboardPage />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toContain('there')
  })

  it('shows a subject edited by the student', () => {
    const subjects = MOCK_SUBJECTS.map((subject) =>
      subject.id === 'sub-calc' ? { ...subject, name: 'Advanced Calculus' } : subject,
    )
    window.localStorage.setItem(
      'campusflow.subjects.v1',
      JSON.stringify(subjects),
    )

    renderWithRouter(<DashboardPage />)

    // The name shows in the subject overview and in assignment subject chips.
    expect(screen.getAllByText('Advanced Calculus').length).toBeGreaterThan(0)
    expect(screen.queryByText('Calculus II')).not.toBeInTheDocument()
  })

  it('shows subject codes from the sample data', () => {
    renderWithRouter(<DashboardPage />)

    expect(screen.getAllByText('MATH 201').length).toBeGreaterThan(0)
  })

  it('removes a deadline from the list when toggled', async () => {
    const user = userEvent.setup()
    renderWithRouter(<DashboardPage />)

    const firstCompleteButton = screen.getAllByRole('button', {
      name: /Mark .* as complete/i,
    })[0]!
    const label = firstCompleteButton.getAttribute('aria-label') ?? ''

    await user.click(firstCompleteButton)

    // Completed work leaves the "upcoming deadlines" list entirely.
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()
  })
})

describe('validateAssignmentForm', () => {
  // The validator takes the full subject list, because it has to reject
  // archived subjects rather than just unknown ids.
  const subjectOptions = MOCK_SUBJECTS

  const validValues = {
    title: 'Problem Set 6',
    subjectId: subjectOptions[0]!.id,
    type: 'homework' as const,
    priority: 'medium' as const,
    status: 'pending' as const,
    dueDate: '2026-12-01',
    estimatedHours: '2',
    description: '',
    progress: '0',
  }

  it('accepts valid input', () => {
    expect(validateAssignmentForm(validValues, subjectOptions)).toEqual({})
  })

  it('requires a title of at least three characters', () => {
    const errors = validateAssignmentForm({ ...validValues, title: 'ab' }, subjectOptions)
    expect(errors.title).toBeDefined()

    const blankError = validateAssignmentForm({ ...validValues, title: '   ' }, subjectOptions)
    expect(blankError.title).toBeDefined()
  })

  it('requires a known subject', () => {
    const errors = validateAssignmentForm({ ...validValues, subjectId: '' }, subjectOptions)
    expect(errors.subjectId).toBeDefined()

    const unknown = validateAssignmentForm({ ...validValues, subjectId: 'nope' }, subjectOptions)
    expect(unknown.subjectId).toBeDefined()
  })

  it('requires a due date and a positive hour estimate', () => {
    expect(validateAssignmentForm({ ...validValues, dueDate: '' }, subjectOptions).dueDate).toBeDefined()
    expect(validateAssignmentForm({ ...validValues, estimatedHours: '0' }, subjectOptions).estimatedHours).toBeDefined()
    expect(validateAssignmentForm({ ...validValues, estimatedHours: 'abc' }, subjectOptions).estimatedHours).toBeDefined()
    expect(validateAssignmentForm({ ...validValues, estimatedHours: '1000' }, subjectOptions).estimatedHours).toBeDefined()
  })
})
describe('every route renders', () => {
  const routes = [
    { route: '/dashboard', heading: /good (morning|afternoon|evening), (alex|there)/i },
    { route: '/assignments', heading: /your assignments/i },
    { route: '/subjects', heading: /^subjects$/i },
    { route: '/calendar', heading: /^calendar$/i },
    { route: '/settings', heading: /^preferences$/i },
    { route: '/does-not-exist', heading: /page not found/i },
  ]

  it.each(routes)('renders $route without crashing', ({ route, heading }) => {
    renderAppAt(route)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('exposes app-level navigation links', () => {
    renderAppAt('/dashboard')

    const navs = screen.getAllByRole('navigation', { name: 'Main' })
    expect(navs.length).toBeGreaterThan(0)
  })

  it('has a skip link pointing at the main content region', () => {
    renderAppAt('/dashboard')

    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute(
      'href',
      '#main-content',
    )
  })
})

describe('AssignmentForm', () => {
  it('submits trimmed values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithRouter(
      <AssignmentForm subjects={MOCK_SUBJECTS} onSubmit={onSubmit} />,
    )

    await user.type(screen.getByLabelText(/title/i), 'New assignment')
    await user.click(screen.getByRole('button', { name: /save assignment/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: 'New assignment',
      subjectId: MOCK_SUBJECTS[0]!.id,
      type: 'homework',
      priority: 'medium',
    })
  })

  it('blocks submission and reports errors when the title is empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithRouter(
      <AssignmentForm subjects={MOCK_SUBJECTS} onSubmit={onSubmit} />,
    )

    await user.click(screen.getByRole('button', { name: /save assignment/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument()
  })
})

describe('SubjectsPage', () => {
  it('lists the sample subjects', () => {
    renderWithRouter(<SubjectsPage />)

    expect(screen.getByRole('heading', { level: 1, name: /^subjects$/i })).toBeInTheDocument()
    expect(screen.getByText('Calculus II')).toBeInTheDocument()
    expect(screen.getByText('MATH 201')).toBeInTheDocument()
  })

  it('adds a subject through the dialog', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    await user.click(screen.getByRole('button', { name: /^Add subject$/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    await user.type(within(dialog).getByLabelText(/subject name/i), 'Thermodynamics')
    await user.type(within(dialog).getByLabelText(/subject code/i), 'PHY 210')
    await user.click(within(dialog).getByRole('button', { name: /create subject/i }))

    expect(await screen.findByText('Thermodynamics')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('rejects a duplicate subject code', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    await user.click(screen.getByRole('button', { name: /^Add subject$/i }))
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText(/subject name/i), 'Calculus III')
    await user.type(within(dialog).getByLabelText(/subject code/i), 'MATH 201')
    await user.click(within(dialog).getByRole('button', { name: /create subject/i }))

    expect(await within(dialog).findByText(/already uses this code/i)).toBeInTheDocument()
    expect(screen.queryByText('Calculus III')).not.toBeInTheDocument()
  })

  it('requires a name before creating', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    await user.click(screen.getByRole('button', { name: /^Add subject$/i }))
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: /create subject/i }))

    expect(await within(dialog).findByText(/at least 2 characters/i)).toBeInTheDocument()
  })

  it('archives a subject and marks it visually', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    await user.click(screen.getByRole('button', { name: /Archive Calculus II/i }))

    const restoreButton = await screen.findByRole('button', {
      name: /Restore Calculus II/i,
    })
    expect(restoreButton).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Archive Calculus II/i })).not.toBeInTheDocument()

    // The badge lives inside this subject's card, not the summary tile.
    const card = screen.getByText('Calculus II').closest('li')
    expect(within(card!).getByText('Archived')).toBeInTheDocument()
  })

  it('counts completed and incomplete assignments separately in the delete dialog', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    // Calculus II has 1 in-progress and 1 completed sample assignment.
    await user.click(screen.getByRole('button', { name: /Delete Calculus II/i }))

    const dialog = await screen.findByRole('dialog')

    // The counts are reported separately, and completed work is included.
    // The split appears in the summary and again in the explanation.
    expect(
      within(dialog).getAllByText(/1 incomplete and 1 completed/i).length,
    ).toBeGreaterThan(0)

    const explanation = within(dialog).getByText(/Completed assignments are deleted too/i)
    expect(explanation).toBeInTheDocument()

    // Archiving is recommended as the safer alternative.
    expect(within(dialog).getByText(/Recommended:/i)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Archive instead/i })).toBeInTheDocument()

    // Every assignment belonging to the subject is named in the confirmation.
    expect(within(dialog).getByText(/including 1 completed/i)).toBeInTheDocument()
  })

  it('requires explicit confirmation before permanently deleting', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    await user.click(screen.getByRole('button', { name: /Delete Calculus II/i }))
    const dialog = await screen.findByRole('dialog')

    const confirmButton = within(dialog).getByRole('button', {
      name: /Delete subject and 2 assignments/i,
    })

    // The destructive action is blocked until the checkbox is ticked.
    expect(confirmButton).toBeDisabled()

    await user.click(within(dialog).getByRole('checkbox'))

    expect(
      within(dialog).getByRole('button', { name: /Delete subject and 2 assignments/i }),
    ).toBeEnabled()
  })

  it('archives from the delete dialog without losing assignments', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    await user.click(screen.getByRole('button', { name: /Delete Calculus II/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Archive instead/i }))

    const restoreButton = await screen.findByRole('button', {
      name: /Restore Calculus II/i,
    })
    expect(restoreButton).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // The subject still exists in storage with its assignments intact.
    const subjects = JSON.parse(window.localStorage.getItem('campusflow.subjects.v1')!) as {
      id: string
      code: string
      archived: boolean
    }[]
    const calc = subjects.find((subject) => subject.code === 'MATH 201')
    expect(calc?.archived).toBe(true)

    const assignments = JSON.parse(window.localStorage.getItem('campusflow.assignments.v1')!) as {
      subjectId: string
      id: string
    }[]
    expect(assignments.some((assignment) => assignment.subjectId === calc!.id)).toBe(true)
  })

  it('deletes a subject that has no assignments', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    // Physics with Lab only has one assignment in the sample data; use a
    // subject with none by creating it fresh.
    await user.click(screen.getByRole('button', { name: /^Add subject$/i }))
    let dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/subject name/i), 'Empty Course')
    await user.type(within(dialog).getByLabelText(/subject code/i), 'XYZ 101')
    await user.click(within(dialog).getByRole('button', { name: /create subject/i }))
    await screen.findByText('Empty Course')

    await user.click(screen.getByRole('button', { name: /Delete Empty Course/i }))
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/no assignments/i)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /Delete subject$/i }))

    await waitFor(() => {
      expect(screen.queryByText('Empty Course')).not.toBeInTheDocument()
    })
  })

  it('deletes a subject and its assignments when explicitly confirmed', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    const assignmentsBefore = JSON.parse(
      window.localStorage.getItem('campusflow.assignments.v1')!,
    ) as { subjectId: string }[]
    const dependentCount = assignmentsBefore.filter(
      (assignment) => assignment.subjectId === 'sub-calc',
    ).length
    expect(dependentCount).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /Delete Calculus II/i }))
    const dialog = await screen.findByRole('dialog')

    // Confirmation is mandatory, so ticking the box is part of the flow.
    await user.click(within(dialog).getByRole('checkbox'))
    await user.click(
      within(dialog).getByRole('button', {
        name: `Delete subject and ${dependentCount} assignments`,
      }),
    )

    await waitFor(() => {
      expect(screen.queryByText('Calculus II')).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const subjects = JSON.parse(window.localStorage.getItem('campusflow.subjects.v1')!) as {
      code: string
    }[]
    expect(subjects.some((subject) => subject.code === 'MATH 201')).toBe(false)

    // No assignment is left pointing at the deleted subject.
    const assignments = JSON.parse(window.localStorage.getItem('campusflow.assignments.v1')!) as {
      subjectId: string
    }[]
    expect(assignments).toHaveLength(assignmentsBefore.length - dependentCount)
    expect(assignments.some((assignment) => assignment.subjectId === 'sub-calc')).toBe(false)
  })

  it('closes the delete dialog with Escape', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    await user.click(screen.getByRole('button', { name: /Delete Calculus II/i }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    // Cancelling must not delete anything.
    expect(screen.getByText('Calculus II')).toBeInTheDocument()
  })
})

describe('SettingsPage profile', () => {
  it('saves the profile and shows it on the dashboard', async () => {
    const user = userEvent.setup()
    // The full shell is needed: the test navigates to the dashboard by link.
    renderAppAt('/settings')

    await user.clear(screen.getByLabelText(/display name/i))
    await user.type(screen.getByLabelText(/display name/i), 'Marisol')
    await user.selectOptions(screen.getByLabelText(/school level/i), 'university')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    expect(window.localStorage.getItem('campusflow.profile.v1')).toContain('Marisol')

    // Navigate to the dashboard and confirm the name is used there.
    await user.click(screen.getAllByRole('link', { name: /dashboard/i })[0]!)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Marisol/i)
  })

  it('rejects an invalid academic year with a visible error', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SettingsPage />)

    await user.clear(screen.getByLabelText(/academic year/i))
    await user.type(screen.getByLabelText(/academic year/i), 'twenty')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    expect(await screen.findByText(/Use a year such as/i)).toBeInTheDocument()
    // Nothing invalid is persisted.
    expect(window.localStorage.getItem('campusflow.profile.v1')).not.toContain('twenty')
  })
})

// ---------------------------------------------------------------------------
// Reset actions require confirmation
// ---------------------------------------------------------------------------

describe('reset actions require confirmation', () => {
  it('asks before replacing the student subjects with sample data', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SubjectsPage />)

    const before = readStored<Subject[]>(STORAGE_KEYS.subjects).length

    await user.click(screen.getByRole('button', { name: /restore sample subjects/i }))
    const dialog = await screen.findByRole('dialog')

    expect(dialog).toHaveAccessibleName(/restore sample subjects/i)
    expect(within(dialog).getByText(/replaces every subject/i)).toBeInTheDocument()

    // Cancelling leaves the stored data untouched.
    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(readStored<Subject[]>(STORAGE_KEYS.subjects)).toHaveLength(before)

    // Confirming performs the reset.
    await user.click(screen.getByRole('button', { name: /restore sample subjects/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /restore sample subjects/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(readStored<Subject[]>(STORAGE_KEYS.subjects)).toHaveLength(MOCK_SUBJECTS.length)
  })

  it('asks before replacing assignments with sample data', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /restore sample assignments/i }))
    const dialog = await screen.findByRole('dialog')

    // Cancelling is the safe default and the dialog closes with no change.
    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

// ---------------------------------------------------------------------------
// Subject reset integrity
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Subject reset integrity — the reset must never orphan assignments
// ---------------------------------------------------------------------------

/** Create a student-owned subject with an assignment attached to it. */
function seedStudentSubjectWithAssignment(): { subjectId: string; unmount: () => void } {
  const { result, unmount } = renderHook(() => ({
    subjects: useSubjects(),
    assignments: useAssignments(),
  }))

  act(() => {
    result.current.subjects.addSubject({
      name: 'My Own Course',
      code: 'ABC 100',
      instructor: '',
      color: 'bg-sky-500',
      credits: 3,
      grade: 70,
      location: '',
      schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
    })
  })
  
  // Read the id only after the update has been committed.
  const subjectId =
    result.current.subjects.subjects.find((subject) => subject.name === 'My Own Course')?.id ?? ''
  act(() => {
    result.current.assignments.addAssignment({
      title: 'On my own course',
      subjectId,
      type: 'homework',
      priority: 'medium',
      dueDate: '2026-12-01',
      estimatedHours: 1,
      description: '',
      progress: 0,
    })
  })

  return { subjectId, unmount }
}

describe('subject reset integrity', () => {
  it('BLOCKS the reset when an assignment would become orphaned', async () => {
    const user = userEvent.setup()
    const { subjectId, unmount } = seedStudentSubjectWithAssignment()
    unmount()

    expect(subjectId).toBeTruthy()

    renderWithRouter(<SubjectsPage />)
    await user.click(screen.getByRole('button', { name: /restore sample subjects/i }))

    const dialog = await screen.findByRole('dialog')

    // The dialog is explicit that the reset cannot proceed, and why.
    expect(dialog).toHaveAccessibleDescription(
      'Blocked — 1 assignment still references your subjects.',
    )
    expect(within(dialog).getByText(/Reassign or remove this assignment/i)).toBeInTheDocument()

    // No destructive action is offered — only a route to the assignment.
    expect(
      within(dialog).queryByRole('button', { name: /^restore sample subjects$/i }),
    ).not.toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /go to assignments/i })).toHaveAttribute(
      'href',
      '/assignments',
    )
    expect(within(dialog).getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
  })

  it('leaves subjects and assignments unchanged when the reset is blocked', async () => {
    const user = userEvent.setup()
    const { subjectId, unmount } = seedStudentSubjectWithAssignment()
    unmount()

    const subjectsBefore = readStored<Subject[]>(STORAGE_KEYS.subjects)
    const assignmentsBefore = readStored<Assignment[]>(STORAGE_KEYS.assignments)

    renderWithRouter(<SubjectsPage />)
    await user.click(screen.getByRole('button', { name: /restore sample subjects/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Nothing was deleted, rewritten or reordered.
    expect(readStored<Subject[]>(STORAGE_KEYS.subjects)).toEqual(subjectsBefore)
    expect(readStored<Assignment[]>(STORAGE_KEYS.assignments)).toEqual(assignmentsBefore)

    // The student's subject and the assignment on it are both still there.
    const subjects = readStored<Subject[]>(STORAGE_KEYS.subjects)
    expect(subjects.some((subject) => subject.id === subjectId)).toBe(true)
    const assignments = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    expect(assignments.some((assignment) => assignment.subjectId === subjectId)).toBe(true)
  })

  it('still blocks after the page was mounted BEFORE the at-risk assignment existed', async () => {
    const user = userEvent.setup()

    // The guard must read current storage at confirm time, not the render snapshot.
    const { unmount } = renderHook(() => ({
      subjects: useSubjects(),
      assignments: useAssignments(),
    }))
    unmount()

    renderWithRouter(<SubjectsPage />)

    // Only sample subjects exist when the page mounts, so the dialog looks safe.
    await user.click(screen.getByRole('button', { name: /restore sample subjects/i }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleDescription('This replaces every subject you have.')
    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }))

    // Now an assignment is created on a new subject, out from under the page.
    const { subjectId, unmount: unmount2 } = seedStudentSubjectWithAssignment()
    unmount2()
    expect(subjectId).toBeTruthy()

    // Re-opening the dialog must now show the block, not a stale "safe" state.
    await user.click(screen.getByRole('button', { name: /restore sample subjects/i }))
    expect(
      await screen.findByText(/Reassign or remove this assignment/i),
    ).toBeInTheDocument()
  })

  it('succeeds when no assignment points at a student subject', async () => {
    const user = userEvent.setup()
    const { unmount } = renderHook(() => ({
      subjects: useSubjects(),
      assignments: useAssignments(),
    }))
    unmount()

    renderWithRouter(<SubjectsPage />)
    await user.click(screen.getByRole('button', { name: /restore sample subjects/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleDescription('This replaces every subject you have.')

    // The safe reset goes ahead and restores exactly the six samples.
    await user.click(within(dialog).getByRole('button', { name: /^restore sample subjects$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(await screen.findByText('Sample subjects restored.')).toBeInTheDocument()
    const subjects = readStored<Subject[]>(STORAGE_KEYS.subjects)
    expect(subjects.map((subject) => subject.id).sort()).toEqual(
      [...MOCK_SUBJECTS.map((subject) => subject.id)].sort(),
    )
  })

    const user = userEvent.setup()
  it('blocks the reset from Settings too, consistently', async () => {
    const { subjectId, unmount } = seedStudentSubjectWithAssignment()
    unmount()
    expect(subjectId).toBeTruthy()

    renderWithRouter(<SettingsPage />)
    await user.click(screen.getByRole('button', { name: /restore sample subjects/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleDescription(
      'Blocked — 1 assignment still references your subjects.',
    )
    expect(
      within(dialog).queryByRole('button', { name: /^restore sample data$/i }),
    ).not.toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /go to assignments/i })).toBeInTheDocument()
  })

  it('reports a failure honestly when persistence fails', async () => {
    const user = userEvent.setup()
    const { unmount } = renderHook(() => ({
      subjects: useSubjects(),
      assignments: useAssignments(),
    }))
    unmount()

    const before = window.localStorage.getItem(STORAGE_KEYS.subjects)
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    renderWithRouter(<SubjectsPage />)
    await user.click(screen.getByRole('button', { name: /restore sample subjects/i }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /^restore sample subjects$/i,
      }),
    )

    // No false success — the student is told it did not save.
    expect(await screen.findByText(/Could not restore/i)).toBeInTheDocument()

    Storage.prototype.setItem = original
    expect(window.localStorage.getItem(STORAGE_KEYS.subjects)).toBe(before)
  })
})
