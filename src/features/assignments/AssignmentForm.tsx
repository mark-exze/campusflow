import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import { addDays, getTodayDateString } from '../../lib/date'
import { ASSIGNMENT_TYPES, PRIORITY_OPTIONS } from '../../lib/constants'
import type { AssignmentPriority, AssignmentType, Subject } from '../../types'
import {
  defaultSubjectId,
  editableSubjectOptions,
  validateAssignmentForm,
  type AssignmentFormErrors,
} from './validation'

export type AssignmentFormValues = {
  title: string
  subjectId: string
  type: AssignmentType
  priority: AssignmentPriority
  dueDate: string
  estimatedHours: string
  description: string
}

export type AssignmentFormProps = {
  /**
   * Every subject, including archived ones. The form decides which of them are
   * actually selectable.
   */
  subjects: readonly Subject[]
  onSubmit: (values: AssignmentFormValues) => void
  onCancel?: (() => void) | undefined
  className?: string
  /** Prefill with an existing assignment to switch the form into edit mode. */
  initialValues?: AssignmentFormValues | undefined
  /**
   * Subject the assignment already belongs to. Kept selectable even when
   * archived, so editing never silently reassigns an assignment.
   */
  currentSubjectId?: string | undefined
}

const EMPTY_VALUES: AssignmentFormValues = {
  title: '',
  subjectId: '',
  type: 'homework',
  priority: 'medium',
  dueDate: addDays(getTodayDateString(), 3),
  estimatedHours: '1',
  description: '',
}

export function AssignmentForm({
  subjects,
  onSubmit,
  onCancel,
  className,
  initialValues,
  currentSubjectId,
}: AssignmentFormProps) {
  const isEditing = initialValues !== undefined
  const subjectOptions = editableSubjectOptions(subjects, currentSubjectId)

  const [values, setValues] = useState<AssignmentFormValues>(
    () => initialValues ?? { ...EMPTY_VALUES, subjectId: defaultSubjectId(subjects) },
  )
  const [errors, setErrors] = useState<AssignmentFormErrors>({})
  const formId = useId()

  const currentSubject = subjectOptions.find((subject) => subject.id === values.subjectId)
  const keepsArchivedSubject = currentSubject?.archived === true
  const hasNoSelectableSubject = subjectOptions.length === 0

  const update = <K extends keyof AssignmentFormValues>(
    key: K,
    value: AssignmentFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateAssignmentForm(values, subjectOptions, { currentSubjectId })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
    })

    if (!isEditing) {
      setValues({ ...EMPTY_VALUES, subjectId: defaultSubjectId(subjects) })
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={isEditing ? 'Edit assignment' : 'Add assignment'}
      className={cn('space-y-4', className)}
    >
      <Field id={`${formId}-title`} label="Title" error={errors.title} required>
        <Input
          id={`${formId}-title`}
          name="title"
          type="text"
          value={values.title}
          onChange={(event: ChangeEvent<HTMLInputElement>) => update('title', event.target.value)}
          placeholder="e.g. Problem Set 6"
          invalid={Boolean(errors.title)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${formId}-subject`}
          label="Subject"
          error={errors.subjectId}
          hint={
            isEditing
              ? 'Archived subjects stay only on the assignment that already uses them.'
              : 'Archived subjects are not listed.'
          }
          required
        >
          <Select
            id={`${formId}-subject`}
            name="subjectId"
            value={values.subjectId}
            onChange={(event) => update('subjectId', event.target.value)}
            invalid={Boolean(errors.subjectId)}
          >
            <option value="" disabled>
              Select a subject
            </option>
            {subjectOptions.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} — {subject.name}
                {subject.archived ? ' (archived)' : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Field id={`${formId}-type`} label="Type">
          <Select
            id={`${formId}-type`}
            name="type"
            value={values.type}
            onChange={(event) => update('type', event.target.value as AssignmentType)}
          >
            {ASSIGNMENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {hasNoSelectableSubject ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-2.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
          No active subjects are available. Create a new subject or restore an
          archived one on the Subjects page before saving.
        </p>
      ) : null}

      {keepsArchivedSubject ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          This assignment is kept on an archived subject. You can save it as is,
          but you cannot move it to a different archived subject.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`${formId}-due`} label="Due date" error={errors.dueDate} required>
          <Input
            id={`${formId}-due`}
            name="dueDate"
            type="date"
            value={values.dueDate}
            onChange={(event) => update('dueDate', event.target.value)}
            invalid={Boolean(errors.dueDate)}
          />
        </Field>

        <Field id={`${formId}-priority`} label="Priority">
          <Select
            id={`${formId}-priority`}
            name="priority"
            value={values.priority}
            onChange={(event) => update('priority', event.target.value as AssignmentPriority)}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id={`${formId}-hours`} label="Est. hours" error={errors.estimatedHours} required>
          <Input
            id={`${formId}-hours`}
            name="estimatedHours"
            type="number"
            min="0.5"
            max="200"
            step="0.5"
            value={values.estimatedHours}
            onChange={(event) => update('estimatedHours', event.target.value)}
            invalid={Boolean(errors.estimatedHours)}
          />
        </Field>
      </div>

      <Field id={`${formId}-description`} label="Description">
        <Textarea
          id={`${formId}-description`}
          name="description"
          rows={3}
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Optional notes about the task"
        />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={hasNoSelectableSubject}>
          <Icon name={isEditing ? 'Check' : 'Plus'} className="size-4" />
          {isEditing ? 'Save changes' : 'Save assignment'}
        </Button>
      </div>
    </form>
  )
}
