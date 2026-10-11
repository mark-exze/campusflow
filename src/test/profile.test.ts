import { describe, expect, it } from 'vitest'

import {
  createDefaultProfile,
  dateFormatLabel,
  defaultAcademicTerm,
  defaultAcademicYear,
  displayNameOrFallback,
  isDateFormat,
  isSchoolLevel,
  normalizeProfile,
  schoolLevelLabel,
  validateProfile,
  type ProfileErrors,
} from '../lib/profile'
import { formatDateWithPreference } from '../lib/date'
import type { StudentProfile } from '../types'

function profile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return { ...createDefaultProfile(), ...overrides }
}

describe('schoolLevel helpers', () => {
  it('recognises valid school levels and rejects anything else', () => {
    expect(isSchoolLevel('college')).toBe(true)
    expect(isSchoolLevel('university')).toBe(true)
    expect(isSchoolLevel('high-school')).toBe(true)
    expect(isSchoolLevel('grad-school')).toBe(false)
    expect(isSchoolLevel(42)).toBe(false)
  })

  it('maps a level to its display label', () => {
    expect(schoolLevelLabel('senior-high-school')).toBe('Senior High School')
    expect(schoolLevelLabel('college')).toBe('College')
  })

  it('recognises valid date formats', () => {
    expect(isDateFormat('dmy')).toBe(true)
    expect(isDateFormat('mdy')).toBe(true)
    expect(isDateFormat('ymd')).toBe(true)
    expect(isDateFormat('iso')).toBe(false)
  })
})

describe('academic year and term defaults', () => {
  it('starts the academic year in August', () => {
    expect(defaultAcademicYear(new Date(2026, 0, 15))).toBe('2025-2026')
    expect(defaultAcademicYear(new Date(2026, 7, 1))).toBe('2026-2027')
    expect(defaultAcademicYear(new Date(2026, 11, 31))).toBe('2026-2027')
  })

  it('picks a term matching the school level', () => {
    expect(defaultAcademicTerm('high-school')).toBe('1st Semester')
    expect(defaultAcademicTerm('college')).toBe('1st Term')
    expect(defaultAcademicTerm('university')).toBe('Fall Term')
  })
})

describe('createDefaultProfile', () => {
  it('leaves the display name blank and picks valid defaults', () => {
    const defaults = createDefaultProfile()

    expect(defaults.displayName).toBe('')
    expect(isSchoolLevel(defaults.schoolLevel)).toBe(true)
    expect(isDateFormat(defaults.dateFormat)).toBe(true)
    expect(defaults.academicYear).toMatch(/^\d{4}-\d{4}$/)
  })
})

describe('normalizeProfile', () => {
  it('fills in every missing field', () => {
    const normalized = normalizeProfile({ displayName: 'Sam' })

    expect(normalized.displayName).toBe('Sam')
    expect(normalized.schoolLevel).toBe('college')
    expect(normalized.academicYear).toBe(createDefaultProfile().academicYear)
    expect(normalized.dateFormat).toBe('dmy')
  })

  it('falls back to defaults for invalid values', () => {
    const normalized = normalizeProfile({
      displayName: 'Sam',
      schoolLevel: 'grad-school',
      academicYear: '',
      academicTerm: '   ',
      dateFormat: 'iso',
    })

    expect(normalized.schoolLevel).toBe('college')
    expect(normalized.academicYear).not.toBe('')
    expect(normalized.academicTerm).not.toBe('')
    expect(normalized.dateFormat).toBe('dmy')
  })

  it('trims and caps names', () => {
    const normalized = normalizeProfile({
      displayName: `  ${'a'.repeat(80)}  `,
      schoolName: `  ${'b'.repeat(200)}  `,
    })

    expect(normalized.displayName).toHaveLength(40)
    expect(normalized.schoolName).toHaveLength(80)
    expect(normalized.displayName).not.toContain(' ')
  })

  it('returns a full profile for garbage input', () => {
    expect(normalizeProfile(null)).toEqual(createDefaultProfile())
    expect(normalizeProfile('nope')).toEqual(createDefaultProfile())
    expect(normalizeProfile(7)).toEqual(createDefaultProfile())
  })
})

describe('validateProfile', () => {
  it('accepts a fully valid profile', () => {
    const errors = validateProfile(
      profile({
        displayName: 'Alex',
        schoolLevel: 'university',
        academicYear: '2026-2027',
        academicTerm: 'Fall Term',
        schoolName: 'State University',
        dateFormat: 'mdy',
      }),
    )

    expect(errors).toEqual({})
  })

  it('requires a display name of at least two characters', () => {
    expect(validateProfile(profile({ displayName: '' })).displayName).toBeDefined()
    expect(validateProfile(profile({ displayName: '  ' })).displayName).toBeDefined()
    expect(validateProfile(profile({ displayName: 'A' })).displayName).toBeDefined()
    expect(validateProfile(profile({ displayName: 'Al' })).displayName).toBeUndefined()
  })

  it('requires a usable academic year', () => {
    expect(validateProfile(profile({ academicYear: '' })).academicYear).toBeDefined()
    expect(validateProfile(profile({ academicYear: '26-27' })).academicYear).toBeDefined()
    expect(validateProfile(profile({ academicYear: 'twenty' })).academicYear).toBeDefined()
    expect(validateProfile(profile({ academicYear: '2026' })).academicYear).toBeUndefined()
  })

  it('requires a term', () => {
    expect(validateProfile(profile({ academicTerm: '  ' })).academicTerm).toBeDefined()
  })

  it('rejects an unknown school level', () => {
    const invalid = profile()
    ;(invalid as { schoolLevel: string }).schoolLevel = 'grad-school'

    const errors: ProfileErrors = validateProfile(invalid)
    expect(errors.schoolLevel).toBeDefined()
  })
})

describe('displayNameOrFallback', () => {
  it('uses the name when set, otherwise a neutral fallback', () => {
    expect(displayNameOrFallback(profile({ displayName: 'Alex' }))).toBe('Alex')
    expect(displayNameOrFallback(profile({ displayName: '   ' }))).toBe('there')
  })
})

describe('dateFormatLabel', () => {
  it('labels every supported format', () => {
    expect(dateFormatLabel('dmy')).toBe('Day / Month / Year')
    expect(dateFormatLabel('mdy')).toBe('Month / Day / Year')
    expect(dateFormatLabel('ymd')).toBe('Year / Month / Day')
  })
})

describe('formatDateWithPreference', () => {
  it('renders the same date in each supported order', () => {
    expect(formatDateWithPreference('2026-10-11', 'dmy')).toBe('11/10/2026')
    expect(formatDateWithPreference('2026-10-11', 'mdy')).toBe('10/11/2026')
    expect(formatDateWithPreference('2026-10-11', 'ymd')).toBe('2026-10-11')
  })

  it('echoes invalid input instead of rendering Invalid Date', () => {
    expect(formatDateWithPreference('not-a-date', 'dmy')).toBe('not-a-date')
  })

  it('does not shift dates across month boundaries', () => {
    expect(formatDateWithPreference('2026-09-30', 'dmy')).toBe('30/09/2026')
    expect(formatDateWithPreference('2027-01-01', 'mdy')).toBe('01/01/2027')
  })
})
