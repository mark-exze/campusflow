import type { AssignmentFormValues } from './AssignmentForm'
import type { Subject } from '../../types'

export type AssignmentFormErrors = Partial<Record<keyof AssignmentFormValues, string>>

/**
 * Pure validation for the assignment form, kept separate from the component so
 * it can be unit-tested and reused without rendering.
 */
export function validateAssignmentForm(
  values: AssignmentFormValues,
  subjectIds: readonly string[],
): AssignmentFormErrors {
  const errors: AssignmentFormErrors = {}

  if (values.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters.'
  }

  if (!subjectIds.includes(values.subjectId)) {
    errors.subjectId = 'Choose a subject.'
  }

  if (!values.dueDate) {
    errors.dueDate = 'Choose a due date.'
  }

  const hours = Number(values.estimatedHours)
  if (!Number.isFinite(hours) || hours <= 0 || hours > 200) {
    errors.estimatedHours = 'Enter between 1 and 200 hours.'
  }

  return errors
}

export function defaultSubjectId(subjects: readonly Subject[]): string {
  return subjects[0]?.id ?? ''
}
