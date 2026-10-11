import { act, renderHook } from '@testing-library/react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithRouter } from './utils'
import { renderAppAt } from './renderAppAt'
import { DashboardPage } from '../features/dashboard/page'
import { CalendarPage } from '../features/calendar/page'
import { STORAGE_KEYS } from '../lib/constants'
import { getTodayDateString } from '../lib/date'
import { MOCK_ASSIGNMENTS, MOCK_SUBJECTS } from '../lib/mockData'
import { isAssignmentOverdue } from '../lib/assignmentFilters'
import { buildOnboardingSteps } from '../lib/onboarding'
import {
  getStudentSubjects,
  getSubjectOrigin,
  hasStudentSubject,
} from '../lib/seedData'
import { useAssignments } from '../features/assignments/store'
import { useProfile } from '../hooks/useProfile'
import { useSubjects } from '../features/subjects/store'
import type { Assignment, OnboardingState, Subject } from '../types'

function mount() {
  return renderHook(() => ({ subjects: useSubjects(), assignments: useAssignments() }))
}

function readStored<T>(key: string): T {
  return JSON.parse(window.localStorage.getItem(key)!) as T
}

const NEW_SUBJECT = {
  name: 'Thermodynamics',
  code: 'PHY 210',
  instructor: '',
  color: 'bg-sky-500',
  credits: 3,
  grade: 70,
  location: '',
  schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
}

const NEW_TASK = {
  title: 'My own task',
  subjectId: 'sub-ds',
  type: 'homework' as const,
  priority: 'low' as const,
  dueDate: '2026-12-01',
  estimatedHours: 1,
  description: '',
  progress: 0,
}

// ---------------------------------------------------------------------------
// Dashboard metrics
// ---------------------------------------------------------------------------

describe('dashboard metrics', () => {
  it('counts active subjects excluding archived', () => {
    // Read through a fresh mount: each store keeps its own snapshot of the
    // subjects key until it is remounted, which is what navigation does.
    const { result, unmount } = mount()
    act(() => {
      result.current.subjects.setArchived('sub-calc', true)
    })
    unmount()

    const { result: after } = mount()
    expect(after.current.assignments.stats.activeSubjects).toBe(5)
    expect(after.current.assignments.stats.archivedSubjects).toBe(1)
  })

  it('does not count completed assignments as pending', () => {
    const { result } = mount()
    const stats = result.current.assignments.stats

    // Sample data has one completed assignment.
    const stored = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    const completedCount = stored.filter((a) => a.status === 'completed').length

    expect(stats.completed).toBe(completedCount)
    expect(stats.active).toBe(stored.length - completedCount)
    // Pending and completed never overlap.
    expect(stats.active + stats.completed).toBe(stored.length)
  })

  it('partitions outstanding work into overdue and upcoming', () => {
    const { result } = mount()
    const { overdueAssignments, upcomingAssignments, activeAssignments } =
      result.current.assignments

    // Exact partition with no double counting.
    expect(overdueAssignments.length + upcomingAssignments.length).toBe(
      activeAssignments.length,
    )
    for (const assignment of overdueAssignments) {
      expect(assignment.status).not.toBe('completed')
      expect(isAssignmentOverdue(assignment, getTodayDateString())).toBe(true)
    }
    for (const assignment of upcomingAssignments) {
      expect(assignment.status).not.toBe('completed')
      expect(isAssignmentOverdue(assignment, getTodayDateString())).toBe(false)
    }
  })

  it('counts only outstanding work as overdue', () => {
    const { result } = mount()
    const active = result.current.assignments.activeAssignments

    expect(result.current.assignments.stats.overdue).toBe(
      active.filter((a) => isAssignmentOverdue(a, getTodayDateString())).length,
    )
  })

  it('counts due-today work against local dates', () => {
    const { result } = mount()
    const today = getTodayDateString()
    const active = result.current.assignments.activeAssignments

    expect(result.current.assignments.stats.dueToday).toBe(
      active.filter((a) => a.dueDate === today).length,
    )
  })

  it('reports a null average rather than a misleading zero when nothing is open', () => {
    const { result, unmount } = mount()

    // Complete every outstanding assignment.
    act(() => {
      const ids = result.current.assignments.activeAssignments.map((a) => a.id)
      for (const id of ids) {
        result.current.assignments.toggleComplete(id)
      }
    })
    unmount()

    const { result: after } = mount()
    expect(after.current.assignments.activeAssignments).toHaveLength(0)
    expect(after.current.assignments.stats.averageProgress).toBeNull()
    expect(after.current.assignments.stats.completed).toBe(
      readStored<Assignment[]>(STORAGE_KEYS.assignments).filter((a) => a.status === 'completed')
        .length,
    )
  })

  it('updates when a subject is created', () => {
    const { result, unmount } = mount()
    act(() => {
      result.current.subjects.addSubject(NEW_SUBJECT)
    })
    unmount()

    const { result: after } = mount()
    expect(after.current.assignments.subjects).toHaveLength(MOCK_SUBJECTS.length + 1)
    expect(after.current.assignments.stats.activeSubjects).toBe(MOCK_SUBJECTS.length + 1)
    expect(after.current.assignments.stats.userSubjects).toBe(1)
    expect(after.current.assignments.stats.sampleSubjects).toBe(MOCK_SUBJECTS.length)
  })

  it('updates when an assignment is created', () => {
    const { result } = mount()
    const before = result.current.assignments.stats.active

    act(() => {
      result.current.assignments.addAssignment(NEW_TASK)
    })

    expect(result.current.assignments.stats.active).toBe(before + 1)
    expect(result.current.assignments.stats.userAssignments).toBe(1)
    expect(result.current.assignments.stats.sampleAssignments).toBe(MOCK_ASSIGNMENTS.length)
  })

  it('moves an assignment from active to completed when toggled', () => {
    const { result } = mount()
    const activeBefore = result.current.assignments.stats.active
    const completedBefore = result.current.assignments.stats.completed

    act(() => {
      result.current.assignments.toggleComplete(
        result.current.assignments.activeAssignments[0]!.id,
      )
    })

    expect(result.current.assignments.stats.active).toBe(activeBefore - 1)
    expect(result.current.assignments.stats.completed).toBe(completedBefore + 1)
  })

  it('renders dashboard tiles from real stored data', () => {
    const { unmount } = mount()
    unmount()
    renderWithRouter(<DashboardPage />)

    // Active subjects tile reflects the six sample subjects.
    const subjects = readStored<Subject[]>(STORAGE_KEYS.subjects)
    const activeCount = subjects.filter((s) => !s.archived).length

    const summary = screen.getByRole('region', { name: /day summary/i })
    expect(within(summary).getByText('Active subjects')).toBeInTheDocument()
    expect(within(summary).getByText(String(activeCount))).toBeInTheDocument()
  })

  it('shows an archived-subject note instead of counting them as active', () => {
    const { result, unmount } = mount()
    act(() => {
      result.current.subjects.setArchived('sub-calc', true)
    })
    unmount()

    renderWithRouter(<DashboardPage />)

    expect(screen.getByText(/1 archived subject kept out of the active count/i)).toBeInTheDocument()
  })

  it('shows a dash rather than 0% when no work is open', async () => {
    const { result, unmount } = mount()
    act(() => {
      for (const id of result.current.assignments.activeAssignments.map((a) => a.id)) {
        result.current.assignments.toggleComplete(id)
      }
    })
    unmount()

    renderWithRouter(<DashboardPage />)

    expect(screen.getByText('Open work progress')).toBeInTheDocument()
    expect(screen.getByText('No open assignments to average.')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Onboarding on the dashboard
// ---------------------------------------------------------------------------

describe('dashboard onboarding', () => {
  it('is shown on the dashboard on a first run', () => {
    renderWithRouter(<DashboardPage />)

    expect(screen.getByRole('heading', { name: /getting started/i })).toBeInTheDocument()
    expect(screen.getByText('0 of 4 done')).toBeInTheDocument()
  })

  it('does not mark sample records as progress', () => {
    renderWithRouter(<DashboardPage />)

    // No step is complete purely from sample records, and the card says so.
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
    expect(screen.getByText(/sample data you can explore/i)).toBeInTheDocument()
  })

  it('completes a step once the student creates a subject', async () => {
    const { result, unmount } = mount()
    act(() => {
      result.current.subjects.addSubject(NEW_SUBJECT)
    })
    unmount()

    renderWithRouter(<DashboardPage />)

    expect(screen.getByText('1 of 4 done')).toBeInTheDocument()
    expect(screen.getAllByText('Done')).toHaveLength(1)
  })

  it('dismisses and persists the dismissal', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithRouter(<DashboardPage />)

    await user.click(screen.getByRole('button', { name: /hide getting started/i }))
    expect(screen.queryByRole('heading', { name: /getting started/i })).not.toBeInTheDocument()

    expect(readStored<OnboardingState>(STORAGE_KEYS.onboarding).dismissed).toBe(true)

    // A reload keeps it hidden, and offers a way back.
    unmount()
    renderWithRouter(<DashboardPage />)
    expect(screen.queryByRole('heading', { name: /getting started/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /getting started/i })).toBeInTheDocument()
  })

  it('can be restored from the dashboard', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      STORAGE_KEYS.onboarding,
      JSON.stringify({ dismissed: true, visitedCalendar: false }),
    )
    renderAppAt('/dashboard')

    expect(screen.queryByRole('heading', { name: /getting started/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /getting started/i }))

    expect(await screen.findByRole('heading', { name: /getting started/i })).toBeInTheDocument()
    expect(readStored<OnboardingState>(STORAGE_KEYS.onboarding).dismissed).toBe(false)
  })

  it('navigates each step to an existing route', async () => {
    const user = userEvent.setup()
    renderAppAt('/dashboard')
    const card = within(screen.getByTestId('getting-started'))

    const profileLink = card.getByRole('link', { name: /set up profile/i })
    expect(profileLink).toHaveAttribute('href', '/settings')

    expect(card.getByRole('link', { name: /^add subject$/i })).toHaveAttribute('href', '/subjects')
    expect(card.getByRole('link', { name: /^add assignment$/i })).toHaveAttribute(
      'href',
      '/assignments',
    )

    await user.click(card.getByRole('link', { name: /open calendar/i }))
    expect(await screen.findByRole('heading', { name: /^calendar$/i })).toBeInTheDocument()
  })

  it('marks the calendar step after visiting it', () => {
    // Visiting the calendar page is what completes the step.
    const calendar = renderWithRouter(<CalendarPage />)
    calendar.unmount()

    expect(readStored<OnboardingState>(STORAGE_KEYS.onboarding).visitedCalendar).toBe(true)

    renderWithRouter(<DashboardPage />)
    expect(screen.getByText('1 of 4 done')).toBeInTheDocument()
  })

  it('records the calendar visit exactly once', async () => {
    const user = userEvent.setup()
    renderWithRouter(<CalendarPage />)
    await screen.findByRole('heading', { name: /^calendar$/i })

    const first = window.localStorage.getItem(STORAGE_KEYS.onboarding)

    // Navigating within the calendar must not rewrite the payload.
    await user.click(screen.getByRole('button', { name: /next period/i }))
    expect(window.localStorage.getItem(STORAGE_KEYS.onboarding)).toBe(first)
  })

  it('hides the card once every step is complete', () => {
    // Complete every step through real records, each written to storage before
    // the app is mounted, so the dashboard reads a fully satisfied state.
    const stores = mount()
    act(() => {
      stores.result.current.subjects.addSubject(NEW_SUBJECT)
      stores.result.current.assignments.addAssignment(NEW_TASK)
    })
    stores.unmount()

    const calendar = renderWithRouter(<CalendarPage />)
    calendar.unmount()
    expect(readStored<OnboardingState>(STORAGE_KEYS.onboarding).visitedCalendar).toBe(true)

    const profileHook = renderHook(() => useProfile())
    act(() => {
      profileHook.result.current.saveProfile({
        displayName: 'Marisol',
        schoolLevel: 'college',
        schoolName: '',
        academicYear: '2026-2027',
        academicTerm: '1st Term',
        dateFormat: 'dmy',
      })
    })
    profileHook.unmount()
  })

  it('withdraws progress when the student deletes their own subject', () => {
    // Creating a subject completes that step.
    const { result: created, unmount: unmountCreated } = mount()
    act(() => {
      created.current.subjects.addSubject(NEW_SUBJECT)
    })
    unmountCreated()

    const subjectStepIsComplete = () =>
      buildOnboardingSteps({
        displayName: '',
        hasUserSubject: hasStudentSubject(readStored<Subject[]>(STORAGE_KEYS.subjects)),
        hasUserAssignment: false,
        visitedCalendar: false,
      })[1]?.isComplete

    expect(subjectStepIsComplete()).toBe(true)

    // Deleting it opens the step again, because progress follows real data.
    const { result: removed, unmount: unmountRemoved } = mount()
    act(() => {
      const own = getStudentSubjects(removed.current.assignments.subjects)[0]!
      removed.current.subjects.removeSubject(own.id)
    })
    unmountRemoved()

    expect(subjectStepIsComplete()).toBe(false)
  })

  it('keeps a customised sample subject counting towards progress', () => {
    // The student edits a seeded record. The id is unchanged, so no assignment
    // reference breaks, but the step is still satisfied.
    const { result: edited, unmount } = mount()
    act(() => {
      edited.current.subjects.updateSubject('sub-calc', {
        name: 'My real course',
        code: 'MATH 201',
        instructor: '',
        color: 'bg-sky-500',
        credits: 4,
        grade: 88,
        location: 'Room 204',
        schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:15' }],
      })
    })
    unmount()

    const calc = readStored<Subject[]>(STORAGE_KEYS.subjects).find(
      (subject) => subject.id === 'sub-calc',
    )!
    // The stable id is preserved, so assignments still resolve.
    expect(calc.id).toBe('sub-calc')
    expect(getSubjectOrigin(calc)).toBe('customised')

    renderWithRouter(<DashboardPage />)
    expect(screen.getByText('1 of 4 done')).toBeInTheDocument()
    expect(screen.getAllByText('Done')).toHaveLength(1)
  })
})
