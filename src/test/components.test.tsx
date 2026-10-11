import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { renderAppAt } from './renderAppAt'
import { renderWithRouter } from './utils'
import { DashboardPage } from '../features/dashboard/page'
import { AssignmentForm } from '../features/assignments/AssignmentForm'
import { validateAssignmentForm } from '../features/assignments/validation'
import { MOCK_SUBJECTS } from '../lib/mockData'

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
    renderAppAt('/subjects')

    expect(screen.getByRole('heading', { level: 1, name: /^subjects$/i })).toBeInTheDocument()
    expect(screen.getByText('Calculus II')).toBeInTheDocument()
    expect(screen.getByText('MATH 201')).toBeInTheDocument()
  })

  it('adds a subject through the dialog', async () => {
    const user = userEvent.setup()
    renderAppAt('/subjects')

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
    renderAppAt('/subjects')

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
    renderAppAt('/subjects')

    await user.click(screen.getByRole('button', { name: /^Add subject$/i }))
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: /create subject/i }))

    expect(await within(dialog).findByText(/at least 2 characters/i)).toBeInTheDocument()
  })

  it('archives a subject and marks it visually', async () => {
    const user = userEvent.setup()
    renderAppAt('/subjects')

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
    renderAppAt('/subjects')

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
    renderAppAt('/subjects')

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
    renderAppAt('/subjects')

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
    renderAppAt('/subjects')

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
    renderAppAt('/subjects')

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
    renderAppAt('/subjects')

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
    renderAppAt('/settings')

    await user.clear(screen.getByLabelText(/academic year/i))
    await user.type(screen.getByLabelText(/academic year/i), 'twenty')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    expect(await screen.findByText(/Use a year such as/i)).toBeInTheDocument()
    // Nothing invalid is persisted.
    expect(window.localStorage.getItem('campusflow.profile.v1')).not.toContain('twenty')
  })
})
