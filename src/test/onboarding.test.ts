import { describe, expect, it } from 'vitest'

import {
  buildOnboardingSteps,
  countCompletedSteps,
  isOnboardingComplete,
  shouldShowOnboarding,
  type OnboardingInput,
} from '../lib/onboarding'
import {
  SEED_SUBJECT_IDS,
  getAssignmentOrigin,
  getStudentSubjects,
  getSubjectOrigin,
  getUserSubjects,
  hasStudentAssignment,
  hasStudentSubject,
  isCustomisedAssignment,
  isCustomisedSubject,
  isSeededAssignment,
  isSeededSubject,
  summarizeRecords,
} from '../lib/seedData'
import { MOCK_ASSIGNMENTS, MOCK_SUBJECTS } from '../lib/mockData'
import type { Assignment, OnboardingState, Subject } from '../types'

function input(overrides: Partial<OnboardingInput> = {}): OnboardingInput {
  return {
    displayName: '',
    hasUserSubject: false,
    hasUserAssignment: false,
    visitedCalendar: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Sample vs user-created records
// ---------------------------------------------------------------------------

describe('sample versus user-created records', () => {
  it('identifies every seeded subject', () => {
    for (const subject of MOCK_SUBJECTS) {
      expect(isSeededSubject(subject)).toBe(true)
      expect(SEED_SUBJECT_IDS.has(subject.id)).toBe(true)
    }
  })

  it('identifies every seeded assignment', () => {
    for (const assignment of MOCK_ASSIGNMENTS) {
      expect(isSeededAssignment(assignment)).toBe(true)
    }
  })

  it('does not treat a student-created subject as sample data', () => {
    const created: Subject = { ...MOCK_SUBJECTS[0]!, id: 'sub-mine', name: 'My course' }
    expect(isSeededSubject(created)).toBe(false)
    expect(hasStudentSubject([created])).toBe(true)
  })

  it('does not treat a student-created assignment as sample data', () => {
    const created: Assignment = { ...MOCK_ASSIGNMENTS[0]!, id: 'asg-mine' }
    expect(isSeededAssignment(created)).toBe(false)
    expect(hasStudentAssignment([created])).toBe(true)
  })

  it('reports no user progress from sample data alone', () => {
    // The whole point: six sample subjects and eight sample assignments must
    // not satisfy a single onboarding step.
    expect(hasStudentSubject(MOCK_SUBJECTS)).toBe(false)
    expect(hasStudentAssignment(MOCK_ASSIGNMENTS)).toBe(false)
    expect(getUserSubjects(MOCK_SUBJECTS)).toHaveLength(0)
  })

  it('counts sample and user records separately', () => {
    const summary = summarizeRecords(MOCK_SUBJECTS, MOCK_ASSIGNMENTS)

    expect(summary.sampleSubjects).toBe(6)
    expect(summary.userSubjects).toBe(0)
    expect(summary.activeSubjects).toBe(6)
    expect(summary.archivedSubjects).toBe(0)
    expect(summary.sampleAssignments).toBe(8)
    expect(summary.userAssignments).toBe(0)
  })

  it('splits archived subjects out of the active count', () => {
    const subjects = MOCK_SUBJECTS.map((subject) =>
      subject.id === 'sub-calc' ? { ...subject, archived: true } : subject,
    )
    const summary = summarizeRecords(subjects, [])

    expect(summary.activeSubjects).toBe(5)
    expect(summary.archivedSubjects).toBe(1)
    // Archived is not double counted as active.
    expect(summary.activeSubjects + summary.archivedSubjects).toBe(subjects.length)
  })

  it('counts a mixed set correctly', () => {
    const subjects: Subject[] = [
      ...MOCK_SUBJECTS,
      { ...MOCK_SUBJECTS[0]!, id: 'sub-mine-1' },
      { ...MOCK_SUBJECTS[1]!, id: 'sub-mine-2', archived: true },
    ]
    const assignments: Assignment[] = [
      ...MOCK_ASSIGNMENTS,
      { ...MOCK_ASSIGNMENTS[0]!, id: 'asg-mine' },
    ]

    const summary = summarizeRecords(subjects, assignments)
    expect(summary.sampleSubjects).toBe(6)
    expect(summary.userSubjects).toBe(2)
    expect(summary.activeSubjects).toBe(7)
    expect(summary.archivedSubjects).toBe(1)
    expect(summary.sampleAssignments).toBe(8)
    expect(summary.userAssignments).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Onboarding steps
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Customised sample records
// ---------------------------------------------------------------------------

describe('customised sample records', () => {
  it('treats an untouched seeded subject as sample data', () => {
    const subject = MOCK_SUBJECTS[0]!
    expect(getSubjectOrigin(subject)).toBe('sample')
    expect(isCustomisedSubject(subject)).toBe(false)
  })

  it('treats an edited seeded subject as customised, keeping its id', () => {
    const original = MOCK_SUBJECTS[0]!
    const edited: Subject = { ...original, name: 'My real course' }

    // The stable id is never changed, so assignment references survive.
    expect(edited.id).toBe(original.id)
    expect(getSubjectOrigin(edited)).toBe('customised')
  })

  it('treats an edited seeded assignment as customised, keeping its id', () => {
    const original = MOCK_ASSIGNMENTS[0]!
    const edited: Assignment = { ...original, title: 'My submission' }

    expect(edited.id).toBe(original.id)
    expect(getAssignmentOrigin(edited)).toBe('customised')
    expect(isCustomisedAssignment(edited)).toBe(true)
  })

  it('does not treat a subject created from scratch as customised', () => {
    const created: Subject = { ...MOCK_SUBJECTS[0]!, id: 'sub-mine' }
    expect(getSubjectOrigin(created)).toBe('user')
    expect(isCustomisedSubject(created)).toBe(false)
  })

  it('ignores the archived flag when deciding customisation', () => {
    // Archiving is a state change, not content: hiding a sample subject must
    // not convert it into the student's own work.
    const archived: Subject = { ...MOCK_SUBJECTS[0]!, archived: true }
    expect(getSubjectOrigin(archived)).toBe('sample')
  })

  it('counts a schedule change as customisation', () => {
    const withSlot: Subject = {
      ...MOCK_SUBJECTS[0]!,
      schedule: [...MOCK_SUBJECTS[0]!.schedule, { dayOfWeek: 5, startTime: '08:00', endTime: '09:00' }],
    }
    expect(getSubjectOrigin(withSlot)).toBe('customised')
  })

  it('counts a customised subject toward onboarding progress', () => {
    // The student personalised a sample record, which is a genuine action, so
    // the step is satisfied — untouched samples still are not.
    const customised: Subject[] = [{ ...MOCK_SUBJECTS[0]!, name: 'Renamed by me' }]

    expect(hasStudentSubject(MOCK_SUBJECTS)).toBe(false)
    expect(hasStudentSubject(customised)).toBe(true)

    const steps = buildOnboardingSteps(
      input({ hasUserSubject: hasStudentSubject(customised) }),
    )
    expect(steps[1]?.isComplete).toBe(true)
  })

  it('counts a customised assignment toward onboarding progress', () => {
    const customised: Assignment[] = [{ ...MOCK_ASSIGNMENTS[0]!, title: 'Mine' }]

    expect(hasStudentAssignment(MOCK_ASSIGNMENTS)).toBe(false)
    expect(hasStudentAssignment(customised)).toBe(true)
  })

  it('splits all three origins without double counting', () => {
    const subjects: Subject[] = [
      ...MOCK_SUBJECTS, // 6 untouched samples
      { ...MOCK_SUBJECTS[0]!, name: 'Customised' }, // same id, edited
      { ...MOCK_SUBJECTS[1]!, id: 'sub-mine' }, // created
    ]
    const assignments: Assignment[] = [
      ...MOCK_ASSIGNMENTS, // 8 untouched samples
      { ...MOCK_ASSIGNMENTS[0]!, title: 'Edited' }, // customised
      { ...MOCK_ASSIGNMENTS[1]!, id: 'asg-mine' }, // created
    ]

    const summary = summarizeRecords(subjects, assignments)

    expect(summary.sampleSubjects).toBe(6)
    expect(summary.customisedSubjects).toBe(1)
    expect(summary.userSubjects).toBe(1)
    expect(
      summary.sampleSubjects + summary.customisedSubjects + summary.userSubjects,
    ).toBe(subjects.length)
    expect(summary.activeSubjects + summary.archivedSubjects).toBe(subjects.length)

    expect(summary.sampleAssignments).toBe(8)
    expect(summary.customisedAssignments).toBe(1)
    expect(summary.userAssignments).toBe(1)
    expect(
      summary.sampleAssignments + summary.customisedAssignments + summary.userAssignments,
    ).toBe(assignments.length)
  })

  it('lists only subjects the student made their own', () => {
    const created = MOCK_SUBJECTS[1]!.name
    const subjects: Subject[] = [
      ...MOCK_SUBJECTS,
      { ...MOCK_SUBJECTS[0]!, name: 'Customised' },
      { ...MOCK_SUBJECTS[1]!, id: 'sub-mine' },
    ]

    const theirs = getStudentSubjects(subjects)
    expect(theirs).toHaveLength(2)
    expect(theirs.map((subject) => subject.name).sort()).toEqual(['Customised', created].sort())

    // Untouched samples are not listed, even though one shares the id.
    expect(
      theirs.some((subject) => subject.id === 'sub-calc' && subject.name === 'Calculus II'),
    ).toBe(false)
  })

  it('keeps an archived sample subject classified as sample data', () => {
    const archived: Subject = { ...MOCK_SUBJECTS[0]!, archived: true }
    const summary = summarizeRecords([...MOCK_SUBJECTS, archived], [])

    // Archiving is excluded from the content fingerprint, so hiding a sample
    // subject does not convert it into the student's own work.
    expect(summary.customisedSubjects).toBe(0)
    expect(summary.sampleSubjects).toBe(7)
    // Archived is still counted separately from active.
    expect(summary.archivedSubjects).toBe(1)
    expect(summary.activeSubjects).toBe(6)
    // And it never satisfies onboarding.
    expect(hasStudentSubject([...MOCK_SUBJECTS, archived])).toBe(false)
  })
})

describe('onboarding steps', () => {
  it('marks nothing complete on a first run with sample data', () => {
    const steps = buildOnboardingSteps(input())

    expect(steps).toHaveLength(4)
    expect(steps.every((step) => !step.isComplete)).toBe(true)
    expect(countCompletedSteps(steps)).toBe(0)
    expect(isOnboardingComplete(steps)).toBe(false)
  })

  it('treats a display name as profile completion', () => {
    expect(buildOnboardingSteps(input({ displayName: 'Alex' }))[0]?.isComplete).toBe(true)
    // Whitespace does not count.
    expect(buildOnboardingSteps(input({ displayName: '   ' }))[0]?.isComplete).toBe(false)
  })

  it('only counts records the student created', () => {
    const steps = buildOnboardingSteps(
      input({ hasUserSubject: true, hasUserAssignment: true }),
    )

    expect(steps[1]?.isComplete).toBe(true)
    expect(steps[2]?.isComplete).toBe(true)
    expect(countCompletedSteps(steps)).toBe(2)
  })

  it('completes only when every step is done', () => {
    const steps = buildOnboardingSteps(
      input({
        displayName: 'Alex',
        hasUserSubject: true,
        hasUserAssignment: true,
        visitedCalendar: true,
      }),
    )

    expect(isOnboardingComplete(steps)).toBe(true)
    expect(countCompletedSteps(steps)).toBe(4)
    expect(shouldShowOnboarding(steps, false)).toBe(false)
  })

  it('points every step at an existing route with a call to action', () => {
    for (const step of buildOnboardingSteps(input())) {
      expect(step.to.startsWith('/')).toBe(true)
      expect(step.cta.length).toBeGreaterThan(0)
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.description.length).toBeGreaterThan(0)
    }
  })

  it('hides the card once dismissed, even with steps outstanding', () => {
    const steps = buildOnboardingSteps(input({ displayName: 'Alex' }))
    expect(shouldShowOnboarding(steps, false)).toBe(true)
    expect(shouldShowOnboarding(steps, true)).toBe(false)
  })

  it('shows the card again when dismissal is reversed', () => {
    const steps = buildOnboardingSteps(input())
    expect(shouldShowOnboarding(steps, true)).toBe(false)

    let state: OnboardingState = { dismissed: true, visitedCalendar: false }
    state = { ...state, dismissed: false }
    expect(shouldShowOnboarding(steps, state.dismissed)).toBe(true)
  })

  it('keeps the calendar step independently of sample class data', () => {
    // Sample subjects carry schedules, but visiting is what counts.
    expect(buildOnboardingSteps(input({ visitedCalendar: false }))[3]?.isComplete).toBe(false)
    expect(buildOnboardingSteps(input({ visitedCalendar: true }))[3]?.isComplete).toBe(true)
  })
})
