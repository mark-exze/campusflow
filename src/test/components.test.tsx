import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { renderWithRouter } from './utils'
import App from '../App'
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
  const subjectIds = MOCK_SUBJECTS.map((subject) => subject.id)

  const validValues = {
    title: 'Problem Set 6',
    subjectId: subjectIds[0]!,
    type: 'homework' as const,
    priority: 'medium' as const,
    dueDate: '2026-12-01',
    estimatedHours: '2',
    description: '',
  }

  it('accepts valid input', () => {
    expect(validateAssignmentForm(validValues, subjectIds)).toEqual({})
  })

  it('requires a title of at least three characters', () => {
    const errors = validateAssignmentForm({ ...validValues, title: 'ab' }, subjectIds)
    expect(errors.title).toBeDefined()

    const blankError = validateAssignmentForm({ ...validValues, title: '   ' }, subjectIds)
    expect(blankError.title).toBeDefined()
  })

  it('requires a known subject', () => {
    const errors = validateAssignmentForm({ ...validValues, subjectId: '' }, subjectIds)
    expect(errors.subjectId).toBeDefined()

    const unknown = validateAssignmentForm({ ...validValues, subjectId: 'nope' }, subjectIds)
    expect(unknown.subjectId).toBeDefined()
  })

  it('requires a due date and a positive hour estimate', () => {
    expect(validateAssignmentForm({ ...validValues, dueDate: '' }, subjectIds).dueDate).toBeDefined()
    expect(validateAssignmentForm({ ...validValues, estimatedHours: '0' }, subjectIds).estimatedHours).toBeDefined()
    expect(validateAssignmentForm({ ...validValues, estimatedHours: 'abc' }, subjectIds).estimatedHours).toBeDefined()
    expect(validateAssignmentForm({ ...validValues, estimatedHours: '1000' }, subjectIds).estimatedHours).toBeDefined()
  })
})
/**
 * Render the whole app. `App` owns its own BrowserRouter, so instead of
 * wrapping it again we point the jsdom address bar at the route first.
 */
function renderAppAt(route: string) {
  window.history.pushState({}, 'Test page', route)
  return render(<App />)
}

describe('every route renders', () => {
  const routes = [
    { route: '/dashboard', heading: /good (morning|afternoon|evening), alex/i },
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
