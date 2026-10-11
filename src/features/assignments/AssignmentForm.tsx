import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'

import { cn } from '../../lib/utils'
import { addDays, getTodayDateString } from '../../lib/date'
import { ASSIGNMENT_TYPES, PRIORITY_OPTIONS } from '../../lib/constants'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import type { AssignmentPriority, AssignmentType, Subject } from '../../types'
import {
  defaultSubjectId,
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
  subjects: readonly Subject[]
  onSubmit: (values: AssignmentFormValues) => void
  onCancel?: (() => void) | undefined
  className?: string
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
}: AssignmentFormProps) {
  const [values, setValues] = useState<AssignmentFormValues>(() => ({
    ...EMPTY_VALUES,
    subjectId: defaultSubjectId(subjects),
  }))
  const [errors, setErrors] = useState<AssignmentFormErrors>({})
  const formId = useId()

  const update = <K extends keyof AssignmentFormValues>(
    key: K,
    value: AssignmentFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateAssignmentForm(
      values,
      subjects.map((subject) => subject.id),
    )
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
    })
    setValues({ ...EMPTY_VALUES, subjectId: defaultSubjectId(subjects) })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Add assignment"
      className={cn('space-y-4', className)}
    >
      <Field
        id={`${formId}-title`}
        label="Title"
        error={errors.title}
        required
      >
        <input
          id={`${formId}-title`}
          name="title"
          type="text"
          value={values.title}
          onChange={(event: ChangeEvent<HTMLInputElement>) => update('title', event.target.value)}
          placeholder="e.g. Problem Set 6"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${formId}-title-error` : undefined}
          className={inputClass(Boolean(errors.title))}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${formId}-subject`} label="Subject" error={errors.subjectId} required>
          <select
            id={`${formId}-subject`}
            name="subjectId"
            value={values.subjectId}
            onChange={(event) => update('subjectId', event.target.value)}
            className={inputClass(Boolean(errors.subjectId))}
          >
            <option value="" disabled>
              Select a subject
            </option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} — {subject.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id={`${formId}-type`} label="Type">
          <select
            id={`${formId}-type`}
            name="type"
            value={values.type}
            onChange={(event) => update('type', event.target.value as AssignmentType)}
            className={inputClass(false)}
          >
            {ASSIGNMENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`${formId}-due`} label="Due date" error={errors.dueDate} required>
          <input
            id={`${formId}-due`}
            name="dueDate"
            type="date"
            value={values.dueDate}
            onChange={(event) => update('dueDate', event.target.value)}
            aria-invalid={errors.dueDate ? true : undefined}
            className={inputClass(Boolean(errors.dueDate))}
          />
        </Field>

        <Field id={`${formId}-priority`} label="Priority">
          <select
            id={`${formId}-priority`}
            name="priority"
            value={values.priority}
            onChange={(event) => update('priority', event.target.value as AssignmentPriority)}
            className={inputClass(false)}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id={`${formId}-hours`} label="Est. hours" error={errors.estimatedHours} required>
          <input
            id={`${formId}-hours`}
            name="estimatedHours"
            type="number"
            min="0.5"
            max="200"
            step="0.5"
            value={values.estimatedHours}
            onChange={(event) => update('estimatedHours', event.target.value)}
            aria-invalid={errors.estimatedHours ? true : undefined}
            className={inputClass(Boolean(errors.estimatedHours))}
          />
        </Field>
      </div>

      <Field id={`${formId}-description`} label="Description">
        <textarea
          id={`${formId}-description`}
          name="description"
          rows={3}
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Optional notes about the task"
          className={inputClass(false)}
        />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" variant="primary">
          <Icon name="Plus" className="size-4" />
          Save assignment
        </Button>
      </div>
    </form>
  )
}

type FieldProps = {
  id: string
  label: string
  error?: string | undefined
  required?: boolean
  children: ReactNode
}

function Field({ id, label, error, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-500" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function inputClass(hasError: boolean): string {
  return cn(
    'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors',
    'placeholder:text-slate-400 focus:border-brand-500 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500',
    hasError
      ? 'border-rose-400 dark:border-rose-500/60'
      : 'border-slate-300 dark:border-slate-700',
  )
}