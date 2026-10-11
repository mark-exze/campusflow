import { useId, useState } from 'react'
import type { FormEvent } from 'react'

import { ColorPicker, Field, Input, Select } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { DAY_NAMES, DAY_NAMES_FULL, SUBJECT_COLORS } from '../../lib/constants'
import type { SubjectSchedule } from '../../types'
import {
  EMPTY_SUBJECT_VALUES,
  type SubjectFormValues,
} from './subjectFormValues'

export type SubjectFormProps = {
  initialValues?: SubjectFormValues | undefined
  /**
   * Validation is supplied by the caller so the subject store can check for
   * duplicate codes against the current list.
   */
  onValidate: (values: SubjectFormValues) => Record<string, string | undefined>
  onSubmit: (values: SubjectFormValues) => void
  onCancel: () => void
  submitLabel: string
}

const DEFAULT_SLOT: SubjectSchedule = {
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
}

export function SubjectForm({
  initialValues,
  onValidate,
  onSubmit,
  onCancel,
  submitLabel,
}: SubjectFormProps) {
  const [values, setValues] = useState<SubjectFormValues>(initialValues ?? EMPTY_SUBJECT_VALUES)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const formId = useId()

  const update = <K extends keyof SubjectFormValues>(key: K, value: SubjectFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const updateSlot = (index: number, patch: Partial<SubjectSchedule>) => {
    setValues((current) => ({
      ...current,
      schedule: current.schedule.map((slot, position) =>
        position === index ? { ...slot, ...patch } : slot,
      ),
    }))
    setErrors((current) => ({ ...current, schedule: undefined }))
  }

  const addSlot = () => {
    setValues((current) => ({
      ...current,
      schedule: [...current.schedule, { ...DEFAULT_SLOT }],
    }))
  }

  const removeSlot = (index: number) => {
    setValues((current) => ({
      ...current,
      schedule: current.schedule.filter((_, position) => position !== index),
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = onValidate(values)
    setErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) return
    onSubmit(values)
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-label={submitLabel} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${formId}-name`} label="Subject name" error={errors.name} required>
          <Input
            id={`${formId}-name`}
            name="name"
            type="text"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="e.g. Calculus II"
            invalid={Boolean(errors.name)}
          />
        </Field>

        <Field
          id={`${formId}-code`}
          label="Subject code"
          error={errors.code}
          hint="Unique, e.g. MATH 201"
          required
        >
          <Input
            id={`${formId}-code`}
            name="code"
            type="text"
            value={values.code}
            onChange={(event) => update('code', event.target.value)}
            placeholder="MATH 201"
            invalid={Boolean(errors.code)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${formId}-instructor`} label="Instructor" error={errors.instructor}>
          <Input
            id={`${formId}-instructor`}
            name="instructor"
            type="text"
            value={values.instructor}
            onChange={(event) => update('instructor', event.target.value)}
            placeholder="Optional"
          />
        </Field>

        <Field id={`${formId}-location`} label="Classroom / location" error={errors.location}>
          <Input
            id={`${formId}-location`}
            name="location"
            type="text"
            value={values.location}
            onChange={(event) => update('location', event.target.value)}
            placeholder="Optional, e.g. Room 204"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${formId}-credits`} label="Credits" error={errors.credits}>
          <Input
            id={`${formId}-credits`}
            name="credits"
            type="number"
            min="0"
            max="30"
            step="0.5"
            value={values.credits}
            onChange={(event) => update('credits', event.target.value)}
            invalid={Boolean(errors.credits)}
          />
        </Field>

        <Field id={`${formId}-grade`} label="Current grade (%)" error={errors.grade}>
          <Input
            id={`${formId}-grade`}
            name="grade"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={values.grade}
            onChange={(event) => update('grade', event.target.value)}
            invalid={Boolean(errors.grade)}
          />
        </Field>
      </div>

      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">Colour</span>
        <ColorPicker
          name="color"
          legend="Subject colour"
          value={values.color}
          options={SUBJECT_COLORS}
          onChange={(color) => update('color', color)}
        />
      </div>

      <fieldset className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <legend className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Class schedule
          </legend>
          <Button type="button" variant="secondary" size="sm" onClick={addSlot}>
            <Icon name="Plus" className="size-3.5" />
            Add time slot
          </Button>
        </div>

        {errors.schedule ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">{errors.schedule}</p>
        ) : null}

        {values.schedule.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No class times yet. Add at least one slot so this subject appears on
            the calendar.
          </p>
        ) : (
          <ul className="space-y-2">
            {values.schedule.map((slot, index) => (
              <li
                key={`slot-${index}`}
                className="space-y-2 rounded-xl border border-slate-200 p-2 dark:border-slate-800"
              >
                {/* Day on its own row, times below, so nothing overflows at
                    375px inside the dialog. */}
                <Select
                  aria-label={`Day for time slot ${index + 1}`}
                  value={String(slot.dayOfWeek)}
                  onChange={(event) => updateSlot(index, { dayOfWeek: Number(event.target.value) })}
                >
                  {DAY_NAMES.map((day, dayIndex) => (
                    <option key={day} value={dayIndex}>
                      {DAY_NAMES_FULL[dayIndex]}
                    </option>
                  ))}
                </Select>

                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Start time for time slot ${index + 1}`}
                    type="time"
                    value={slot.startTime}
                    onChange={(event) => updateSlot(index, { startTime: event.target.value })}
                    className="min-w-0 flex-1"
                  />

                  <Input
                    aria-label={`End time for time slot ${index + 1}`}
                    type="time"
                    value={slot.endTime}
                    onChange={(event) => updateSlot(index, { endTime: event.target.value })}
                    className="min-w-0 flex-1"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeSlot(index)}
                    aria-label={`Remove time slot ${index + 1}`}
                  >
                    <Icon name="Trash2" className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          <Icon name="Check" className="size-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

