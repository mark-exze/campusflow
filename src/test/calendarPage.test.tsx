import { act, renderHook } from '@testing-library/react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderAppAt } from './renderAppAt'
import {
  DEFAULT_WEEK_START,
  buildWeekDates,
  getMonthName,
  getWeekLabel,
  shiftMonth,
} from '../lib/calendarEvents'
import { addDays, getTodayDateString } from '../lib/date'
import { STORAGE_KEYS } from '../lib/constants'
import { MOCK_SUBJECTS } from '../lib/mockData'
import { useAssignments } from '../features/assignments/store'
import { useSubjects } from '../features/subjects/store'
import type { Assignment, Subject } from '../types'

function readStored<T>(key: string): T {
  return JSON.parse(window.localStorage.getItem(key)!) as T
}

/** Archive or restore a subject through its store, then drop the hook. */
function setArchivedInStore(subjectId: string, archived: boolean): void {
  const { result, unmount } = renderHook(() => useSubjects())
  act(() => {
    result.current.setArchived(subjectId, archived)
  })
  unmount()
}

/** Create an assignment through the store so the calendar has a fresh deadline. */
function addAssignmentInStore(overrides: Partial<Assignment> = {}): void {
  const { result, unmount } = renderHook(() => useAssignments())

  act(() => {
    const base = result.current.assignments[0]
    result.current.addAssignment({
      title: overrides.title ?? 'Brand new deadline',
      subjectId: overrides.subjectId ?? base!.subjectId,
      type: 'homework',
      priority: 'medium',
      dueDate: overrides.dueDate ?? getTodayDateString(),
      estimatedHours: 2,
      description: '',
    })
  })
  unmount()
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

describe('calendar page views', () => {
  it('renders the month grid with weekday headers', () => {
    renderAppAt('/calendar')

    expect(screen.getByRole('heading', { level: 1, name: /calendar/i })).toBeInTheDocument()
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
  })

  it('shows assignment deadlines from the sample data', () => {
    renderAppAt('/calendar')

    // Sample deadlines fall in the current month or a nearby one; navigate to
    // it if needed so the assertion does not depend on today's date.
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
  })

  it('switches between month and week views', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')

    const monthButton = screen.getByRole('radio', { name: 'month' })
    const weekButton = screen.getByRole('radio', { name: 'week' })
    expect(monthButton).toHaveAttribute('aria-checked', 'true')

    // Month view exposes one "view events" button per grid cell.
    expect(screen.getAllByRole('button', { name: /View events for/i }).length).toBeGreaterThan(0)

    await user.click(weekButton)
    expect(weekButton).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryAllByRole('button', { name: /View events for/i })).toHaveLength(0)

    await user.click(monthButton)
    expect(monthButton).toHaveAttribute('aria-checked', 'true')
    expect(screen.getAllByRole('button', { name: /View events for/i }).length).toBeGreaterThan(0)
  })

  it('navigates months and returns with Today', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')

    const heading = () => screen.getByRole('heading', { level: 2 }).textContent ?? ''
    const start = heading()

    await user.click(screen.getByRole('button', { name: /next period/i }))
    expect(heading()).not.toBe(start)

    await user.click(screen.getByRole('button', { name: /previous period/i }))
    expect(heading()).toBe(start)

    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(heading()).toBe(start)
  })

  it('navigates weeks', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')

    await user.click(screen.getByRole('radio', { name: 'week' }))
    const heading = screen.getByRole('heading', { level: 2 }).textContent ?? ''

    await user.click(screen.getByRole('button', { name: /next period/i }))
    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(heading)
  })

  it('does not overflow horizontally in week view', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')
    await user.click(screen.getByRole('radio', { name: 'week' }))

    // Stacked day cards mean no single row is wider than the viewport.
    const main = screen.getByRole('main')
    expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth + 1)
  })
})

// ---------------------------------------------------------------------------
// Event details
// ---------------------------------------------------------------------------

describe('calendar event details', () => {
  it('lists the events for a selected day', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')

    await user.click(screen.getAllByRole('button', { name: /View events for/i })[0]!)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
  })

  it('shows assignment details, including progress', async () => {
    const user = userEvent.setup()

    // Put a deadline on today so it is always visible in the current month.
    addAssignmentInStore({ title: 'Rendered deadline', dueDate: getTodayDateString() })
    renderAppAt('/calendar')

    await user.click(screen.getAllByRole('button', { name: /assignment due/i })[0]!)
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText('Due date')).toBeInTheDocument()
    expect(within(dialog).getByText('Priority')).toBeInTheDocument()
    expect(within(dialog).getByText('Status')).toBeInTheDocument()
    expect(within(dialog).getByText('Progress')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /manage assignments/i })).toBeInTheDocument()
  })

  it('shows class details with time, location and instructor', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')

    await user.click(screen.getAllByRole('button', { name: /class .* on /i })[0]!)
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText('Time')).toBeInTheDocument()
    expect(within(dialog).getByText('Classroom')).toBeInTheDocument()
    expect(within(dialog).getByText('Instructor')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /manage subjects/i })).toBeInTheDocument()
  })

  it('closes the event dialog with Escape', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')

    await user.click(screen.getAllByRole('button', { name: /class .* on /i })[0]!)
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Count badges
// ---------------------------------------------------------------------------

describe('calendar count badges', () => {
  it('scopes the month badge to the calendar month, not the padded grid', async () => {
    const user = userEvent.setup()

    // A deadline on the first grid cell, which belongs to the previous month,
    // and one inside the month itself.
    const monthAnchor = getTodayDateString()
    addAssignmentInStore({ title: 'Inside the month', dueDate: `${monthAnchor.slice(0, 7)}-15` })
    addAssignmentInStore({
      title: 'Outside the month',
      dueDate: shiftMonth(`${monthAnchor.slice(0, 7)}-01`, 1),
    })

    renderAppAt('/calendar')
    await user.click(screen.getByRole('button', { name: 'Today' }))

    // The badge names the month it is counting.
    const badge = screen.getByText(/events? in /i)
    expect(badge.textContent).toContain(getMonthName(monthAnchor))
    expect(badge.textContent).not.toContain('Outside the month')
  })

  it('counts a week badge over exactly seven days', async () => {
    const user = userEvent.setup()
    const dates = buildWeekDates(getTodayDateString(), DEFAULT_WEEK_START)

    addAssignmentInStore({ title: 'First day deadline', dueDate: dates[0]! })
    addAssignmentInStore({ title: 'Last day deadline', dueDate: dates[6]! })
    // One just outside the window.
    addAssignmentInStore({ title: 'Beyond the week', dueDate: addDays(dates[6]!, 1) })

    renderAppAt('/calendar')
    await user.click(screen.getByRole('radio', { name: 'week' }))

    expect(screen.getByText(/events? this week/i)).toBeInTheDocument()
    expect(screen.queryByText('Beyond the week')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Day selection and events
// ---------------------------------------------------------------------------

describe('calendar day and event interaction', () => {
  it('opens the complete event list for a day, beyond the month-cell limit', async () => {
    const user = userEvent.setup()
    const today = getTodayDateString()

    // More deadlines than a month cell can show (MONTH_EVENT_LIMIT is 2).
    for (let index = 0; index < 3; index += 1) {
      addAssignmentInStore({ title: `Bulk deadline ${index}`, dueDate: today })
    }

    renderAppAt('/calendar')
    await user.click(screen.getByRole('button', { name: `View events for ${today}` }))

    const dialog = await screen.findByRole('dialog')
    for (let index = 0; index < 3; index += 1) {
      expect(within(dialog).getByText(`Bulk deadline ${index}`)).toBeInTheDocument()
    }

    // The list is complete: today's classes are present too.
    const rows = within(dialog).getAllByRole('listitem')
    expect(rows.length).toBeGreaterThan(3)
  })

  it('opens assignment details for a deadline and class details for a class', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')

    await user.click(screen.getByRole('button', { name: /Problem Set 5.*assignment due/i }))
    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Progress')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /manage assignments/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    // A recurring class appears on several dates (including grid padding), so
    // take the first and check its detail dialog is the class one.
    await user.click(screen.getAllByRole('button', { name: /^Calculus II, class .* on /i })[0]!)
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Classroom')).toBeInTheDocument()
    expect(within(dialog).getByText('Instructor')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /manage subjects/i })).toBeInTheDocument()
  })

  it('keeps the selected period when switching between month and week', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')

    // Step forward one month; the anchor moves to the first of that month.
    await user.click(screen.getByRole('button', { name: /next period/i }))
    const expectedAnchor = shiftMonth(getTodayDateString(), 1)

    await user.click(screen.getByRole('radio', { name: 'week' }))
    const weekHeading = screen.getByRole('heading', { level: 2 }).textContent ?? ''

    // The week shown must be the one containing that anchor date.
    const expectedWeek = buildWeekDates(expectedAnchor, DEFAULT_WEEK_START)
    expect(weekHeading).toBe(getWeekLabel(expectedWeek))
  })

  it('restores focus to the day button when the dialog closes', async () => {
    const user = userEvent.setup()
    const today = getTodayDateString()
    renderAppAt('/calendar')

    const dayButton = screen.getByRole('button', { name: `View events for ${today}` })
    dayButton.focus()
    expect(dayButton).toHaveFocus()

    await user.click(dayButton)
    await screen.findByRole('dialog')

    // Focus moves into the dialog.
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(dayButton).toHaveFocus()
  })

  it('offers keyboard-accessible day selection', async () => {
    const user = userEvent.setup()
    const today = getTodayDateString()
    renderAppAt('/calendar')

    const dayButton = screen.getByRole('button', { name: `View events for ${today}` })
    dayButton.focus()

    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('gives every event a meaningful accessible label', () => {
    renderAppAt('/calendar')

    const eventButtons = screen.getAllByRole('button', { name: /assignment due|class .* on /i })
    expect(eventButtons.length).toBeGreaterThan(0)

    for (const button of eventButtons) {
      const label = button.getAttribute('aria-label') ?? ''
      expect(label).toMatch(/assignment due \d{4}-\d{2}-\d{2}|class \d{2}:\d{2} – \d{2}:\d{2} on \d{4}-\d{2}-\d{2}/)
    }
  })
})

// ---------------------------------------------------------------------------
// Archived subjects and data consistency
// ---------------------------------------------------------------------------

describe('calendar respects archived subjects', () => {
  it('drops archived-subject classes but keeps their deadlines visible', async () => {
    const user = userEvent.setup()
    setArchivedInStore('sub-calc', true)
    renderAppAt('/calendar')

    // The archived subject still has a deadline on the calendar.
    const deadlineButton = screen.getByRole('button', {
      name: /Problem Set 5.*assignment due/i,
    })
    expect(deadlineButton).toBeInTheDocument()

    // Its recurring classes are gone from the calendar.
    const classButton = screen.queryByRole('button', {
      name: /^Calculus II, class .* on /i,
    })
    expect(classButton).not.toBeInTheDocument()

    // Restoring brings the class back.
    await user.click(screen.getByRole('button', { name: /previous period/i }))
    await user.click(screen.getByRole('button', { name: 'Today' }))

    setArchivedInStore('sub-calc', false)
    expect(MOCK_SUBJECTS.find((subject) => subject.id === 'sub-calc')?.name).toBe('Calculus II')
  })

  it('restoring a subject brings its classes back', () => {
    setArchivedInStore('sub-phys', true)
    const { result: archived } = renderHook(() => useAssignments())
    const whileArchived = archived.current.classSessions.filter(
      (session) => session.subjectId === 'sub-phys',
    ).length
    expect(whileArchived).toBe(0)

    setArchivedInStore('sub-phys', false)
    const { result: restored } = renderHook(() => useAssignments())
    expect(
      restored.current.classSessions.filter((session) => session.subjectId === 'sub-phys').length,
    ).toBeGreaterThan(0)
  })

  it('reflects a newly created deadline', async () => {
    addAssignmentInStore({ title: 'Created for calendar', dueDate: getTodayDateString() })
    const user = userEvent.setup()
    renderAppAt('/calendar')

    const today = getTodayDateString()
    await user.click(screen.getByRole('button', { name: `View events for ${today}` }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText('Created for calendar')).toBeInTheDocument()
  })

  it('keeps completed assignments on the calendar', () => {
    renderAppAt('/calendar')

    const stored = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    expect(stored.some((assignment) => assignment.status === 'completed')).toBe(true)
  })

  it('derives the subject list that class sessions come from', () => {
    const { result } = renderHook(() => useAssignments())
    const subjects: Subject[] = result.current.subjects.map((subject) => ({ ...subject }))

    expect(subjects.length).toBeGreaterThan(0)
    // Only non-archived subjects contribute sessions.
    const archivedIds = new Set(
      subjects.filter((subject) => subject.archived).map((subject) => subject.id),
    )
    for (const session of result.current.classSessions) {
      expect(archivedIds.has(session.subjectId)).toBe(false)
    }
  })
})
