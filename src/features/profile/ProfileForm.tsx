import { useId, useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import {
  DATE_FORMATS,
  SCHOOL_LEVELS,
  STORAGE_KEYS,
} from '../../lib/constants'
import {
  dateFormatLabel,
  schoolLevelLabel,
  validateProfile,
  type ProfileErrors,
} from '../../lib/profile'
import type { DateFormatPreference, SchoolLevel, StudentProfile } from '../../types'

export type ProfileFormProps = {
  profile: StudentProfile
  onSubmit: (profile: StudentProfile) => void
  onReset: () => void
  className?: string
}

export function ProfileForm({ profile, onSubmit, onReset, className }: ProfileFormProps) {
  const [values, setValues] = useState<StudentProfile>(profile)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const formId = useId()

  const update = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateProfile(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      displayName: values.displayName.trim(),
      schoolName: values.schoolName.trim(),
      academicYear: values.academicYear.trim(),
      academicTerm: values.academicTerm.trim(),
    })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Student profile"
      className={className}
    >
      <div className="space-y-4">
        <Field
          id={`${formId}-name`}
          label="Display name"
          error={errors.displayName}
          hint="Shown on your dashboard."
          required
        >
          <Input
            id={`${formId}-name`}
            name="displayName"
            type="text"
            autoComplete="nickname"
            value={values.displayName}
            onChange={(event) => update('displayName', event.target.value)}
            placeholder="e.g. Alex"
            invalid={Boolean(errors.displayName)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${formId}-level`} label="School level" error={errors.schoolLevel} required>
            <Select
              id={`${formId}-level`}
              name="schoolLevel"
              value={values.schoolLevel}
              onChange={(event) => update('schoolLevel', event.target.value as SchoolLevel)}
            >
              {SCHOOL_LEVELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field id={`${formId}-school`} label="School name" error={errors.schoolName}>
            <Input
              id={`${formId}-school`}
              name="schoolName"
              type="text"
              autoComplete="organization"
              value={values.schoolName}
              onChange={(event) => update('schoolName', event.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id={`${formId}-year`}
            label="Academic year"
            error={errors.academicYear}
            hint="For example 2026-2027"
            required
          >
            <Input
              id={`${formId}-year`}
              name="academicYear"
              type="text"
              inputMode="numeric"
              value={values.academicYear}
              onChange={(event) => update('academicYear', event.target.value)}
              invalid={Boolean(errors.academicYear)}
            />
          </Field>

          <Field id={`${formId}-term`} label="Term / semester" error={errors.academicTerm} required>
            <Input
              id={`${formId}-term`}
              name="academicTerm"
              type="text"
              value={values.academicTerm}
              onChange={(event) => update('academicTerm', event.target.value)}
              placeholder="e.g. 1st Semester"
              list={`${formId}-term-options`}
              invalid={Boolean(errors.academicTerm)}
            />
            <datalist id={`${formId}-term-options`}>
              {SCHOOL_LEVELS.map((option) => (
                <option key={option.value} value={option.defaultTerm} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field
          id={`${formId}-format`}
          label="Date format"
          error={errors.dateFormat}
          hint="Applies to dates across the app."
        >
          <Select
            id={`${formId}-format`}
            name="dateFormat"
            value={values.dateFormat}
            onChange={(event) => update('dateFormat', event.target.value as DateFormatPreference)}
          >
            {DATE_FORMATS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.example})
              </option>
            ))}
          </Select>
        </Field>

        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <p className="font-medium text-slate-600 dark:text-slate-300">Stored header preview</p>
          <p className="mt-1">
            {values.academicTerm.trim() || 'Term'} · {values.academicYear.trim() || 'Year'} ·{' '}
            {schoolLevelLabel(values.schoolLevel)} ·{' '}
            {dateFormatLabel(values.dateFormat)}
          </p>
          <p className="mt-2 break-all text-slate-500 dark:text-slate-500">{STORAGE_KEYS.profile}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="sm">
          <Icon name="Check" className="size-4" />
          Save profile
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <Icon name="RotateCcw" className="size-4" />
          Reset
        </Button>
      </div>
    </form>
  )
}
