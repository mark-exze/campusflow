/**
 * Student profile logic: defaults, normalization and validation.
 *
 * Pure functions only — no React, no storage. That makes them independently
 * unit-testable (see test/profile.test.ts).
 */

import { SCHOOL_LEVELS } from './constants'
import type { DateFormatPreference, SchoolLevel, StudentProfile } from '../types'

export const MAX_SCHOOL_NAME_LENGTH = 80
export const MAX_DISPLAY_NAME_LENGTH = 40

export function isSchoolLevel(value: unknown): value is SchoolLevel {
  return SCHOOL_LEVELS.some((level) => level.value === value)
}

export function isDateFormat(value: unknown): value is DateFormatPreference {
  return value === 'dmy' || value === 'mdy' || value === 'ymd'
}

/**
 * Academic year, derived from the calendar assuming a year that runs from
 * August to July. Override with `now` for deterministic tests.
 */
export function defaultAcademicYear(now: Date = new Date()): string {
  const year = now.getFullYear()
  return now.getMonth() >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

/** Term matching the default school level. */
export function defaultAcademicTerm(level: SchoolLevel = 'college'): string {
  return SCHOOL_LEVELS.find((option) => option.value === level)?.defaultTerm ?? '1st Term'
}

export function schoolLevelLabel(level: SchoolLevel): string {
  return SCHOOL_LEVELS.find((option) => option.value === level)?.label ?? level
}

export function dateFormatLabel(format: DateFormatPreference): string {
  switch (format) {
    case 'dmy':
      return 'Day / Month / Year'
    case 'mdy':
      return 'Month / Day / Year'
    case 'ymd':
      return 'Year / Month / Day'
    default:
      return ''
  }
}

/**
 * Sensible starting point for a brand new student. The display name is left
 * blank on purpose so the dashboard falls back to a neutral greeting until the
 * student fills it in.
 */
export function createDefaultProfile(): StudentProfile {
  const now = new Date()
  return {
    displayName: '',
    schoolLevel: 'college',
    schoolName: '',
    academicYear: defaultAcademicYear(now),
    academicTerm: defaultAcademicTerm(),
    dateFormat: 'dmy',
  }
}

/**
 * Coerce unknown data (from an older build, hand-edited storage, or a partial
 * record) into a complete, valid profile. Missing or invalid fields fall back
 * to defaults so a single bad value cannot break the whole UI.
 */
export function normalizeProfile(raw: unknown): StudentProfile {
  const defaults = createDefaultProfile()
  if (typeof raw !== 'object' || raw === null) return defaults

  const value = raw as Partial<Record<keyof StudentProfile, unknown>>

  const displayName =
    typeof value.displayName === 'string'
      ? value.displayName.trim().slice(0, MAX_DISPLAY_NAME_LENGTH)
      : defaults.displayName

  const schoolLevel = isSchoolLevel(value.schoolLevel)
    ? value.schoolLevel
    : defaults.schoolLevel

  const schoolName =
    typeof value.schoolName === 'string'
      ? value.schoolName.trim().slice(0, MAX_SCHOOL_NAME_LENGTH)
      : defaults.schoolName

  const academicYear =
    typeof value.academicYear === 'string' && value.academicYear.trim()
      ? value.academicYear.trim().slice(0, 20)
      : defaults.academicYear

  const academicTerm =
    typeof value.academicTerm === 'string' && value.academicTerm.trim()
      ? value.academicTerm.trim().slice(0, 40)
      : defaults.academicTerm

  const dateFormat = isDateFormat(value.dateFormat) ? value.dateFormat : defaults.dateFormat

  return { displayName, schoolLevel, schoolName, academicYear, academicTerm, dateFormat }
}

export type ProfileErrors = Partial<Record<keyof StudentProfile, string>>

/**
 * Validate a profile before it is saved. Only the display name is strictly
 * required — school name stays optional.
 */
export function validateProfile(profile: StudentProfile): ProfileErrors {
  const errors: ProfileErrors = {}

  if (profile.displayName.trim().length < 2) {
    errors.displayName = 'Enter a display name of at least 2 characters.'
  }

  if (!isSchoolLevel(profile.schoolLevel)) {
    errors.schoolLevel = 'Choose a school level.'
  }

  if (profile.academicYear.trim().length === 0) {
    errors.academicYear = 'Enter an academic year.'
  } else if (!ACADEMIC_YEAR_PATTERN.test(profile.academicYear.trim())) {
    errors.academicYear = 'Use a year such as 2026-2027 or 2026.'
  }

  if (profile.academicTerm.trim().length === 0) {
    errors.academicTerm = 'Enter a term or semester.'
  }

  if (profile.schoolName.length > MAX_SCHOOL_NAME_LENGTH) {
    errors.schoolName = `Keep the school name under ${MAX_SCHOOL_NAME_LENGTH} characters.`
  }

  return errors
}

const ACADEMIC_YEAR_PATTERN = /^(\d{4}-\d{4}|\d{4})$/

/**
 * Greeting target for the dashboard. Falls back to a neutral phrase so the UI
 * never renders an empty name.
 */
export function displayNameOrFallback(profile: StudentProfile): string {
  const trimmed = profile.displayName.trim()
  return trimmed.length > 0 ? trimmed : 'there'
}
