/**
 * First-run onboarding steps.
 *
 * Completion is derived from real student data, never from the presence of the
 * seeded sample records: creating a subject counts, seeing a sample one does
 * not. Pure functions so the rules are directly testable.
 */

import { ROUTES } from './constants'

export type OnboardingStepId = 'profile' | 'subject' | 'assignment' | 'calendar'

export type OnboardingStep = {
  id: OnboardingStepId
  title: string
  description: string
  /** Route the student is sent to for this step. */
  to: string
  cta: string
  isComplete: boolean
}

export type OnboardingInput = {
  /** A non-empty display name means the student set their profile up. */
  displayName: string
  /** The student created a subject themselves, rather than a sample one. */
  hasUserSubject: boolean
  /** The student created an assignment themselves, rather than a sample one. */
  hasUserAssignment: boolean
  /** The student opened the calendar at least once. */
  visitedCalendar: boolean
}

export function buildOnboardingSteps(input: OnboardingInput): OnboardingStep[] {
  const hasName = input.displayName.trim().length > 0

  return [
    {
      id: 'profile',
      title: 'Set up your profile',
      description: 'Add your name, school level and term so the app fits you.',
      to: ROUTES.settings,
      cta: 'Set up profile',
      isComplete: hasName,
    },
    {
      id: 'subject',
      title: 'Add your first subject',
      description: 'A subject holds your classes, assignments and grade.',
      to: ROUTES.subjects,
      cta: 'Add subject',
      isComplete: input.hasUserSubject,
    },
    {
      id: 'assignment',
      title: 'Add your first assignment',
      description: 'Track a deadline with a due date and subject.',
      to: ROUTES.assignments,
      cta: 'Add assignment',
      isComplete: input.hasUserAssignment,
    },
    {
      id: 'calendar',
      title: 'Explore the calendar',
      description: 'See classes and deadlines laid out by week and month.',
      to: ROUTES.calendar,
      cta: 'Open calendar',
      isComplete: input.visitedCalendar,
    },
  ]
}

export function countCompletedSteps(steps: readonly OnboardingStep[]): number {
  return steps.filter((step) => step.isComplete).length
}

export function isOnboardingComplete(steps: readonly OnboardingStep[]): boolean {
  return countCompletedSteps(steps) === steps.length
}

/**
 * The card is shown while there is something left to do and the student has not
 * hidden it. Dismissal is remembered, never assumed.
 */
export function shouldShowOnboarding(
  steps: readonly OnboardingStep[],
  dismissed: boolean,
): boolean {
  if (dismissed) return false
  return !isOnboardingComplete(steps)
}
