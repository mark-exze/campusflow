/**
 * Pure value helpers for the subject form. Kept out of the component file so
 * React Fast Refresh keeps working and so tests can import them directly.
 */

import { SUBJECT_COLORS } from '../../lib/constants'
import type { SubjectSchedule } from '../../types'

export type SubjectFormValues = {
  name: string
  code: string
  instructor: string
  color: string
  credits: string
  grade: string
  location: string
  schedule: SubjectSchedule[]
}

const DEFAULT_SLOT: SubjectSchedule = {
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
}

export const EMPTY_SUBJECT_VALUES: SubjectFormValues = {
  name: '',
  code: '',
  instructor: '',
  color: SUBJECT_COLORS[0]!.value,
  credits: '3',
  grade: '0',
  location: '',
  schedule: [{ ...DEFAULT_SLOT }],
}

/** Build form values from an existing subject for editing. */
export function toSubjectFormValues(subject: {
  name: string
  code: string
  instructor: string
  color: string
  credits: number
  grade: number
  location: string
  schedule: SubjectSchedule[]
}): SubjectFormValues {
  return {
    name: subject.name,
    code: subject.code,
    instructor: subject.instructor,
    color: subject.color,
    credits: String(subject.credits),
    grade: String(subject.grade),
    location: subject.location,
    schedule: subject.schedule.map((slot) => ({ ...slot })),
  }
}

/** Parse the form's string number fields into the draft the store expects. */
export function toSubjectDraft(values: SubjectFormValues) {
  return {
    name: values.name,
    code: values.code,
    instructor: values.instructor,
    color: values.color,
    credits: Number(values.credits),
    grade: Number(values.grade),
    location: values.location,
    schedule: values.schedule,
  }
}
