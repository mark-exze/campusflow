import { act, renderHook } from '@testing-library/react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderAppAt } from './renderAppAt'
import { renderWithRouter } from './utils'
import { CalendarPage } from '../features/calendar/page'
import { DashboardPage } from '../features/dashboard/page'
import { SubjectsPage } from '../features/subjects/page'
import {
  useAssignments,
  type AddAssignmentResult,
  type UpdateAssignmentResult,
} from '../features/assignments/store'
import { useProfile } from '../hooks/useProfile'
import { StorageWriteError, useStorageError } from '../hooks/useLocalStorage'
import { useSubjects } from '../features/subjects/store'
import { buildCalendarEvents } from '../lib/calendarEvents'
import { STORAGE_KEYS } from '../lib/constants'
import { getTodayDateString } from '../lib/date'
import { MOCK_SUBJECTS } from '../lib/mockData'
import type { Assignment, Subject } from '../types'

function readStored<T>(key: string): T {
  return JSON.parse(window.localStorage.getItem(key)!) as T
}

function mountBoth() {
  return renderHook(() => ({ subjects: useSubjects(), assignments: useAssignments() }))
}

/** Seed the stores so tests that render a page have data to act on. */
function seedSubjects() {
  const { unmount } = mountBoth()
  unmount()
}

// ---------------------------------------------------------------------------
// Malformed stored records
// ---------------------------------------------------------------------------

describe('malformed stored records', () => {
  it('renders the subjects page instead of crashing when subjects storage is null', () => {
    window.localStorage.setItem(STORAGE_KEYS.subjects, 'null')

    expect(() => renderWithRouter(<SubjectsPage />)).not.toThrow()
    expect(screen.getByRole('heading', { level: 1, name: /^subjects$/i })).toBeInTheDocument()
  })

  it('renders instead of crashing when subjects storage is the wrong shape', () => {
    // An object rather than an array: `.map` would throw on the parsed value.
    window.localStorage.setItem(STORAGE_KEYS.subjects, '{"a":1}')

    expect(() => renderWithRouter(<SubjectsPage />)).not.toThrow()
  })

  it('renders instead of crashing when subjects storage is not valid JSON', () => {
    window.localStorage.setItem(STORAGE_KEYS.subjects, '{oops-not-json')

    expect(() => renderWithRouter(<SubjectsPage />)).not.toThrow()
  })

  it('renders the dashboard instead of crashing when assignments storage is malformed', () => {
    for (const payload of ['null', '"a string"', '42', '{bad']) {
      window.localStorage.setItem(STORAGE_KEYS.assignments, payload)
      const { unmount } = renderWithRouter(<DashboardPage />)
      expect(
        screen.getByRole('heading', { level: 1 }),
      ).toBeInTheDocument()
      unmount()
    }
  })

  it('renders the calendar instead of crashing with a malformed assignment record', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.assignments,
      JSON.stringify([{ id: 'x' }, null, 'nonsense']),
    )

    expect(() => renderWithRouter(<CalendarPage />)).not.toThrow()
  })

  it('leaves the unreadable bytes in place rather than overwriting them', () => {
    const corrupt = '{"a":1}'
    window.localStorage.setItem(STORAGE_KEYS.subjects, corrupt)

    const { result, unmount } = renderHook(() => useSubjects())
    // The hook still renders a usable subject list.
    expect(result.current.subjects.length).toBeGreaterThan(0)
    unmount()

    // The original bytes survive, so the student can still recover them.
    expect(window.localStorage.getItem(STORAGE_KEYS.subjects)).toBe(corrupt)
  })

  it('starts writing again after the first real edit', () => {
    window.localStorage.setItem(STORAGE_KEYS.subjects, 'garbage')
    const { result } = mountBoth()

    act(() => {
      result.current.subjects.updateSubject('sub-calc', {
        name: 'Renamed',
        code: 'MATH 201',
        instructor: '',
        color: 'bg-sky-500',
        credits: 4,
        grade: 80,
        location: 'Room 1',
        schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      })
    })

    const stored = readStored<Subject[]>(STORAGE_KEYS.subjects)
    expect(stored.find((subject) => subject.id === 'sub-calc')?.name).toBe('Renamed')
  })
})

// ---------------------------------------------------------------------------
// Stale state across simultaneously mounted hooks
// ---------------------------------------------------------------------------

describe('stale state across mounted hooks', () => {
  it('respects an archive made by another mounted instance', () => {
    const { result, unmount } = mountBoth()
    const before = result.current.assignments.classSessions.filter(
      (session) => session.subjectId === 'sub-calc',
    ).length
    expect(before).toBeGreaterThan(0)

    // Archive through a *separate* hook instance, as another page would.
    act(() => {
      result.current.subjects.setArchived('sub-calc', true)
    })
    unmount()

    const { result: fresh } = mountBoth()
    expect(
      fresh.current.assignments.classSessions.filter((s) => s.subjectId === 'sub-calc'),
    ).toHaveLength(0)
  })

  it('blocks assignment creation against a stale archived snapshot', () => {
    const { result } = mountBoth()

    act(() => {
      result.current.subjects.setArchived('sub-ds', true)
    })

    let reason = ''
    act(() => {
      const outcome = result.current.assignments.addAssignment({
        title: 'Should not land',
        subjectId: 'sub-ds',
        type: 'homework',
        priority: 'low',
        dueDate: '2026-12-01',
        estimatedHours: 1,
        description: '',
        progress: 0,
      })
      if (outcome.status === 'blocked') reason = outcome.reason
    })

    expect(reason).toMatch(/archived/i)
  })

  it('does not resurrect a deleted subject through a second instance', () => {
    const { result, unmount } = mountBoth()

    act(() => {
      result.current.subjects.removeSubject('sub-hist')
    })
    unmount()

    const { result: fresh } = mountBoth()
    expect(fresh.current.assignments.subjects.some((subject) => subject.id === 'sub-hist')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Referential integrity
// ---------------------------------------------------------------------------

describe('referential integrity', () => {
  it('deletes a subject and its dependent assignments together', () => {
    const { result } = mountBoth()
    const dependent = result.current.assignments.assignments.filter(
      (assignment) => assignment.subjectId === 'sub-calc',
    )
    expect(dependent.length).toBeGreaterThan(0)

    act(() => {
      result.current.subjects.removeSubject('sub-calc')
      result.current.assignments.deleteAssignmentsBySubject('sub-calc')
    })

    // The SUBJECTS store is the writer here, so query its list. The
    // assignments store keeps its own read-only snapshot of the same key,
    // which is precisely the stale-instance behaviour these tests pin down.
    expect(result.current.subjects.subjects.some((subject) => subject.id === 'sub-calc')).toBe(false)
    expect(
      result.current.assignments.assignments.some((a) => a.subjectId === 'sub-calc'),
    ).toBe(false)

    // Nothing is orphaned: every remaining assignment still has a subject.
    const ids = new Set(result.current.subjects.subjects.map((subject) => subject.id))
    for (const assignment of result.current.assignments.assignments) {
      expect(ids.has(assignment.subjectId)).toBe(true)
    }
  })

  it('keeps assignments on an archived subject', () => {
    const { result } = mountBoth()

    act(() => {
      result.current.subjects.setArchived('sub-calc', true)
    })

    const kept = result.current.assignments.assignments.filter(
      (assignment) => assignment.subjectId === 'sub-calc',
    )
    expect(kept.length).toBeGreaterThan(0)
    // ...and its label still resolves.
    expect(result.current.assignments.getSubject('sub-calc')?.name).toBe('Calculus II')
  })

  it('preserves unrelated storage keys when assignments change', () => {
    // Seed the stores first so the snapshot reflects real values rather than
    // an untouched empty key.
    const { unmount } = mountBoth()
    unmount()

    const snapshot = {
      subjects: window.localStorage.getItem(STORAGE_KEYS.subjects),
      profile: window.localStorage.getItem(STORAGE_KEYS.profile),
      theme: window.localStorage.getItem(STORAGE_KEYS.theme),
    }
    expect(snapshot.subjects).not.toBeNull()

    const { result } = mountBoth()
    act(() => {
      result.current.assignments.deleteAssignment(
        result.current.assignments.assignments[0]!.id,
      )
    })

    expect(window.localStorage.getItem(STORAGE_KEYS.subjects)).toBe(snapshot.subjects)
    expect(window.localStorage.getItem(STORAGE_KEYS.profile)).toBe(snapshot.profile)
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe(snapshot.theme)
  })
})

// ---------------------------------------------------------------------------
// Archive / restore transitions
// ---------------------------------------------------------------------------

describe('archive and restore transitions', () => {
  it('removes then restores recurring classes', () => {
    const scheduleLength =
      MOCK_SUBJECTS.find((subject) => subject.id === 'sub-phys')!.schedule.length

    // Archive, then read it back through a fresh mount.
    const { result: archiver, unmount } = mountBoth()
    act(() => {
      archiver.current.subjects.setArchived('sub-phys', true)
    })
    unmount()

    const archived = mountBoth()
    expect(
      archived.result.current.assignments.classSessions.filter(
        (s) => s.subjectId === 'sub-phys',
      ),
    ).toHaveLength(0)
    archived.unmount()

    // Restore, then read it back again.
    const { result: restorer, unmount: unmount2 } = mountBoth()
    act(() => {
      restorer.current.subjects.setArchived('sub-phys', false)
    })
    unmount2()

    const restored = mountBoth()
    expect(
      restored.result.current.assignments.classSessions.filter(
        (s) => s.subjectId === 'sub-phys',
      ),
    ).toHaveLength(scheduleLength)
  })

  it('re-enables assignment creation after restoring', () => {
    const NEW_TASK = {
      title: 'Should land',
      subjectId: 'sub-ds',
      type: 'homework' as const,
      priority: 'low' as const,
      dueDate: '2026-12-01',
      estimatedHours: 1,
      description: '',
      progress: 0,
    }

    // Archive Data Structures.
    const { result: archiver, unmount } = mountBoth()
    act(() => {
      archiver.current.subjects.setArchived('sub-ds', true)
    })
    unmount()

    // A fresh mount honours the archive and refuses the create.
    const blocked = mountBoth()
    act(() => {
      expect(blocked.result.current.assignments.addAssignment(NEW_TASK).status).toBe('blocked')
    })
    blocked.unmount()

    // Restore it, and the same create now succeeds.
    const { result: restorer, unmount: unmount2 } = mountBoth()
    act(() => {
      restorer.current.subjects.setArchived('sub-ds', false)
    })
    unmount2()

    const allowed = mountBoth()
    act(() => {
      expect(allowed.result.current.assignments.addAssignment(NEW_TASK).status).toBe('created')
    })
  })
})

// ---------------------------------------------------------------------------
// Calendar freshness
// ---------------------------------------------------------------------------

describe('calendar data freshness', () => {
  it('shows a newly created assignment deadline', () => {
    const { result } = mountBoth()
    const today = getTodayDateString()

    act(() => {
      result.current.assignments.addAssignment({
        title: 'Fresh deadline',
        subjectId: 'sub-ds',
        type: 'homework',
        priority: 'low',
        dueDate: today,
        estimatedHours: 1,
        description: '',
        progress: 0,
      })
    })

    const events = buildCalendarEvents(today, today, result.current.assignments.subjects, result.current.assignments.assignments)
    const deadline = events.find((event) => event.kind === 'assignment' && event.title === 'Fresh deadline')

    expect(deadline?.date).toBe(today)
  })

  it('drops classes for an archived subject from the calendar window', () => {
    const { result } = mountBoth()

    act(() => {
      result.current.subjects.setArchived('sub-calc', true)
    })

    const events = buildCalendarEvents('2026-10-05', '2026-10-12', result.current.subjects.subjects, [])

    expect(events.some((event) => event.subjectId === 'sub-calc')).toBe(false)
  })

  it('reflects an edited due date', () => {
    const { result } = mountBoth()
    const target = result.current.assignments.assignments[0]!

    act(() => {
      result.current.assignments.updateAssignment(target.id, { dueDate: '2026-11-11' })
    })

    expect(
      result.current.assignments.assignments.find((a) => a.id === target.id)?.dueDate,
    ).toBe('2026-11-11')
  })
})

// ---------------------------------------------------------------------------
// Refresh persistence
// ---------------------------------------------------------------------------

describe('refresh persistence', () => {
  it('keeps assignment edits after a remount', () => {
    const { result, unmount } = mountBoth()
    const target = result.current.assignments.assignments[0]!

    act(() => {
      result.current.assignments.updateAssignment(target.id, { title: 'Persisted edit' })
    })
    unmount()

    const { result: after } = mountBoth()
    expect(after.current.assignments.subjects.some((s) => s.id === target.id)).toBe(false)
    expect(
      after.current.assignments.assignments.find((a) => a.id === target.id)?.title,
    ).toBe('Persisted edit')
  })

  it('keeps profile edits after a remount', () => {
    const { result, unmount } = renderHook(() => useProfile())

    act(() => {
      result.current.saveProfile({
        displayName: 'Marisol',
        schoolLevel: 'university',
        schoolName: 'State University',
        academicYear: '2026-2027',
        academicTerm: 'Fall Term',
        dateFormat: 'mdy',
      })
    })
    unmount()

    const { result: after } = renderHook(() => useProfile())
    expect(after.current.profile.displayName).toBe('Marisol')
    expect(after.current.profile.dateFormat).toBe('mdy')
  })

  it('does not restore sample data for a deleted assignment', () => {
    const { result, unmount } = mountBoth()
    const victim = result.current.assignments.assignments[0]!

    act(() => {
      result.current.assignments.deleteAssignment(victim.id)
    })
    const countAfterDelete = result.current.assignments.assignments.length
    unmount()

    const { result: after } = mountBoth()
    expect(after.current.assignments.assignments.some((a) => a.id === victim.id)).toBe(false)
    expect(after.current.assignments.assignments).toHaveLength(countAfterDelete)
  })
})

// ---------------------------------------------------------------------------
// Write failures
// ---------------------------------------------------------------------------

describe('storage write failures', () => {
  it('reports a write failure instead of silently swallowing it', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    const { result } = renderHook(() => useStorageError())
    const { result: store } = mountBoth()

    act(() => {
      store.current.subjects.setArchived('sub-calc', true)
    })

    Storage.prototype.setItem = original

    expect(result.current).not.toBeNull()
    expect(result.current).toBeInstanceOf(StorageWriteError)
    expect((result.current as StorageWriteError).cause).toBeInstanceOf(Error)
    expect((result.current as StorageWriteError).message).toMatch(/could not save/i)
  })

  it('clears the error once writes succeed again', () => {
    const { result: error } = renderHook(() => useStorageError())
    const { result: store } = mountBoth()

    // A failing assignments write reports a problem for that key.
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    act(() => {
      store.current.assignments.addAssignment(FAILING_TASK)
    })
    expect(error.current).not.toBeNull()
    expect(error.current).toBeInstanceOf(StorageWriteError)

    // A later successful write for the SAME key clears it.
    Storage.prototype.setItem = original
    act(() => {
      expect(store.current.assignments.addAssignment(RECOVERING_TASK).status).toBe('created')
    })
    expect(error.current).toBeNull()
  })

  it('does not clear one key problem when another key succeeds', () => {
    const { result: error } = renderHook(() => useStorageError())
    const { result: store } = mountBoth()

    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    act(() => {
      store.current.assignments.addAssignment(FAILING_TASK)
    })
    expect(error.current).not.toBeNull()

    // A successful write for a different key must not hide the outstanding one.
    Storage.prototype.setItem = original
    act(() => {
      store.current.subjects.setArchived('sub-lit', true)
    })
    expect(error.current).toBeInstanceOf(StorageWriteError)
  })
})

const FAILING_TASK = {
  title: 'Fails to save',
  subjectId: 'sub-ds',
  type: 'homework' as const,
  priority: 'low' as const,
  dueDate: '2026-12-01',
  estimatedHours: 1,
  description: '',
  progress: 0,
}

const RECOVERING_TASK = {
  ...FAILING_TASK,
  title: 'Saves fine',
}

// ---------------------------------------------------------------------------
// Premature success reporting
// ---------------------------------------------------------------------------

describe('premature success reporting', () => {
  const NEW_TASK = {
    title: 'Risky task',
    subjectId: 'sub-ds',
    type: 'homework' as const,
    priority: 'low' as const,
    dueDate: '2026-12-01',
    estimatedHours: 1,
    description: '',
    progress: 0,
  }

  it('does not report success when the write fails', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    const { result } = mountBoth()

    let outcome: AddAssignmentResult | undefined
    act(() => {
      outcome = result.current.assignments.addAssignment(NEW_TASK)
    })

    Storage.prototype.setItem = original

    expect(outcome?.status).toBe('unsaved')
    expect(outcome?.status === 'unsaved' && outcome.reason).toMatch(/would not store/i)
  })

  it('reports success only after the bytes actually landed', () => {
    const { result } = mountBoth()

    let outcome: AddAssignmentResult | undefined
    act(() => {
      outcome = result.current.assignments.addAssignment(NEW_TASK)
    })

    expect(outcome?.status).toBe('created')
    // The write really happened, synchronously, before the result was returned.
    const stored = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    expect(stored.some((a) => a.title === 'Risky task')).toBe(true)
  })

  it('does not report an update as saved when the write fails', () => {
    const { result } = mountBoth()
    const target = result.current.assignments.assignments[0]!

    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    let outcome: UpdateAssignmentResult | undefined
    act(() => {
      outcome = result.current.assignments.updateAssignment(target.id, { title: 'Renamed' })
    })

    Storage.prototype.setItem = original

    expect(outcome?.status).toBe('unsaved')
    // The pre-edit value is still what is stored.
    const stored = readStored<Assignment[]>(STORAGE_KEYS.assignments)
    expect(stored.find((a) => a.id === target.id)?.title).toBe(target.title)
  })

  it('reports subject mutations honestly too', () => {
    const { result, unmount } = renderHook(() => useSubjects())

    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    let ok = true
    act(() => {
      ok = result.current.addSubject(NEW_SUBJECT_DRAFT)
    })
    Storage.prototype.setItem = original
    unmount()

    expect(ok).toBe(false)
    expect(
      readStored<Subject[]>(STORAGE_KEYS.subjects).some((s) => s.code === 'ZZZ 100'),
    ).toBe(false)
  })

  it('reports profile saves honestly too', () => {
    const { result } = renderHook(() => useProfile())

    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    let ok = true
    act(() => {
      ok = result.current.saveProfile({
        displayName: 'Alex',
        schoolLevel: 'college',
        schoolName: '',
        academicYear: '2026-2027',
        academicTerm: '1st Term',
        dateFormat: 'dmy',
      })
    })
    Storage.prototype.setItem = original

    expect(ok).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEYS.profile)).not.toContain('Alex')
  })

  it('does not write twice for one mutation', () => {
    const { result } = mountBoth()
    let writes = 0
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      if (key === STORAGE_KEYS.assignments) writes += 1
      return original.call(this, key, value)
    }

    act(() => {
      result.current.assignments.addAssignment(NEW_TASK)
    })
    Storage.prototype.setItem = original

    expect(writes).toBe(1)
  })

  it('keeps the form open with its values when a save fails', async () => {
    const user = userEvent.setup()
    seedSubjects()
    renderAppAt('/assignments')

    await user.click(screen.getByRole('button', { name: /^Add assignment$/i }))
    const dialog = await screen.findByRole('form', { name: /add assignment/i })

    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    await user.type(within(dialog).getByLabelText(/title/i), 'Unsaveable')
    await user.click(within(dialog).getByRole('button', { name: /save assignment/i }))
    Storage.prototype.setItem = original

    // The student is told it did not save, and the entry survives for a retry.
    expect(await screen.findByText(/Not saved/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/title/i)).toHaveValue('Unsaveable')
  })

  it('shows a global notice that agrees with the inline message', async () => {
    const user = userEvent.setup()
    seedSubjects()
    renderAppAt('/assignments')

    await user.click(screen.getByRole('button', { name: /^Add assignment$/i }))
    const dialog = await screen.findByRole('form', { name: /add assignment/i })

    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    await user.type(within(dialog).getByLabelText(/title/i), 'Unsaveable')
    await user.click(within(dialog).getByRole('button', { name: /save assignment/i }))

    // Both the inline status and the global notice say the same thing.
    expect(await screen.findByText(/Not saved/i)).toBeInTheDocument()
    expect(screen.getByRole('status').textContent).toMatch(/could not be saved/i)

    Storage.prototype.setItem = original
  })
})

// ---------------------------------------------------------------------------
// Corrupt storage recovery
// ---------------------------------------------------------------------------

describe('corrupt storage recovery', () => {
  it('never deletes or overwrites the corrupted bytes', () => {
    const corrupt = '{"subjects":[[['
    window.localStorage.setItem(STORAGE_KEYS.subjects, corrupt)
    window.localStorage.setItem('an.unrelated.key', 'keep me')

    const { unmount } = mountBoth()
    unmount()

    expect(window.localStorage.getItem(STORAGE_KEYS.subjects)).toBe(corrupt)
    expect(window.localStorage.getItem('an.unrelated.key')).toBe('keep me')
  })

  it('warns the student rather than presenting sample data as recovered', () => {
    window.localStorage.setItem(STORAGE_KEYS.assignments, 'not-json-at-all')

    // The notice is rendered by the layout, so the full shell is required.
    renderAppAt('/dashboard')

    const notice = screen.getByRole('status')
    expect(notice.textContent).toMatch(/could not be read/i)
    expect(notice.textContent).toMatch(/left untouched/i)
  })

  it('recovers normally once the student makes an explicit edit', () => {
    window.localStorage.setItem(STORAGE_KEYS.subjects, 'corrupt')

    const { result: first, unmount } = mountBoth()
    act(() => {
      first.current.subjects.setArchived('sub-lit', true)
    })
    unmount()

    // The edit writes through, replacing the unusable bytes deliberately.
    const stored = readStored<Subject[]>(STORAGE_KEYS.subjects)
    expect(Array.isArray(stored)).toBe(true)
    expect(stored.length).toBeGreaterThan(0)
  })

  it('does not lose other datasets when one key is unreadable', () => {
    const { result: seed, unmount: unmountSeed } = mountBoth()
    act(() => {
      seed.current.subjects.setArchived('sub-lit', true)
    })
    unmountSeed()

    const subjectsBefore = window.localStorage.getItem(STORAGE_KEYS.subjects)
    window.localStorage.setItem(STORAGE_KEYS.profile, '{{{broken')

    const { unmount } = mountBoth()
    unmount()

    expect(window.localStorage.getItem(STORAGE_KEYS.subjects)).toBe(subjectsBefore)
    // The unreadable profile bytes are also preserved.
    expect(window.localStorage.getItem(STORAGE_KEYS.profile)).toBe('{{{broken')
  })
})

const NEW_SUBJECT_DRAFT = {
  name: 'Blocked subject',
  code: 'ZZZ 100',
  instructor: '',
  color: 'bg-sky-500',
  credits: 3,
  grade: 70,
  location: '',
  schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
}
