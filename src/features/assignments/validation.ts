import type { AssignmentFormValues } from './AssignmentForm'

export type AssignmentFormErrors = Partial<Record<keyof AssignmentFormValues, string>>

/**
 * Minimal subject shape the validator needs. `Subject` satisfies this, so
 * callers can pass their subject list straight through.
 */
export type AssignmentSubjectOption = {
  id: string
  archived: boolean
}

export type ValidateAssignmentOptions = {
  /**
   * Subject the assignment already belongs to. When editing, this stays valid
   * even if it is archived, so the student never loses the association.
   */
  currentSubjectId?: string | undefined
}

/**
 * Pure validation for the assignment form, kept separate from the component so
 * it can be unit-tested and reused without rendering.
 *
 * This is the authoritative guard that stops archived subjects from receiving
 * new assignments — the dropdown filtering in the form is only a convenience.
 */
export function validateAssignmentForm(
  values: AssignmentFormValues,
  subjects: readonly AssignmentSubjectOption[],
  options: ValidateAssignmentOptions = {},
): AssignmentFormErrors {
  const errors: AssignmentFormErrors = {}

  if (values.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters.'
  }

  const selected = subjects.find((subject) => subject.id === values.subjectId)

  if (!selected) {
    errors.subjectId = 'Choose a subject.'
  } else if (selected.archived && selected.id !== options.currentSubjectId) {
    errors.subjectId =
      'This subject is archived. Restore it before adding assignments to it.'
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

/**
 * Subjects offered when creating a new assignment: active subjects only.
 */
export function selectableSubjects<T extends AssignmentSubjectOption>(
  subjects: readonly T[],
): T[] {
  return subjects.filter((subject) => !subject.archived)
}

/**
 * Subjects offered when editing an existing assignment: every active subject,
 * plus the assignment's own subject so an archived subject keeps its place.
 * Switching to a *different* archived subject is still refused by the
 * validator.
 */
export function editableSubjectOptions<T extends AssignmentSubjectOption>(
  subjects: readonly T[],
  currentSubjectId: string | undefined,
): T[] {
  const active = selectableSubjects(subjects)

  if (!currentSubjectId) return active

  const current = subjects.find((subject) => subject.id === currentSubjectId)
  if (!current || !current.archived) return active

  return [...active, current]
}

export function defaultSubjectId(subjects: readonly AssignmentSubjectOption[]): string {
  return selectableSubjects(subjects)[0]?.id ?? ''
}

/** True when no active subject can accept a new assignment. */
export function hasNoActiveSubjects(subjects: readonly AssignmentSubjectOption[]): boolean {
  return selectableSubjects(subjects).length === 0
}

/** Build form values from an existing assignment, for edit mode. */
export function toAssignmentFormValues(assignment: {
  title: string
  subjectId: string
  type: AssignmentFormValues['type']
  priority: AssignmentFormValues['priority']
  dueDate: string
  estimatedHours: number
  description: string
}): AssignmentFormValues {
  return {
    title: assignment.title,
    subjectId: assignment.subjectId,
    type: assignment.type,
    priority: assignment.priority,
    dueDate: assignment.dueDate,
    estimatedHours: String(assignment.estimatedHours),
    description: assignment.description,
  }
}
