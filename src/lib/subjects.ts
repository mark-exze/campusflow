/**
 * Subject logic: ID generation, normalization, validation and referential
 * integrity. Pure functions only — no React, no storage.
 */

import { SUBJECT_COLORS } from './constants'
import { timeToMinutes } from './date'
import type { Assignment, ClassSession, Subject, SubjectSchedule } from '../types'

export const MAX_SUBJECT_NAME_LENGTH = 60
export const MAX_SUBJECT_CODE_LENGTH = 20

export type SubjectDraft = {
  name: string
  code: string
  instructor: string
  color: string
  credits: number
  grade: number
  location: string
  schedule: SubjectSchedule[]
}

export type SubjectErrors = Partial<
  Record<'name' | 'code' | 'color' | 'schedule' | 'credits' | 'grade', string>
>

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .\-_]*$/

let idCounter = 0

/**
 * Prefixed ids keep localStorage records stable and unique across reloads.
 * Uses crypto.randomUUID when available, with a fallback for older runtimes.
 */
export function createSubjectId(): string {
  const cryptoRef = globalThis.crypto
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return `sub-${cryptoRef.randomUUID()}`
  }
  idCounter += 1
  return `sub-${Date.now().toString(36)}-${idCounter}`
}

export function emptySchedule(): SubjectSchedule {
  return { dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }
}

export function createSubject(draft: SubjectDraft, semester: string): Subject {
  return {
    id: createSubjectId(),
    name: draft.name.trim(),
    code: draft.code.trim().toUpperCase(),
    color: draft.color,
    instructor: draft.instructor.trim(),
    semester,
    credits: draft.credits,
    grade: draft.grade,
    location: draft.location.trim(),
    schedule: draft.schedule.map((slot) => ({ ...slot })),
    archived: false,
  }
}

/**
 * Coerce unknown storage data into a valid Subject. Returns null when the
 * record is too broken to salvage, so callers can drop it rather than crash.
 */
export function normalizeSubject(raw: unknown): Subject | null {
  if (typeof raw !== 'object' || raw === null) return null
  const value = raw as Partial<Record<keyof Subject, unknown>>

  if (typeof value.id !== 'string' || value.id.length === 0) return null
  if (typeof value.name !== 'string' || value.name.trim().length === 0) return null

  const schedule = Array.isArray(value.schedule)
    ? value.schedule
        .map((slot) => normalizeScheduleSlot(slot))
        .filter((slot): slot is SubjectSchedule => slot !== null)
    : []

  const credits = typeof value.credits === 'number' && value.credits >= 0 ? value.credits : 0
  const grade = typeof value.grade === 'number' ? clamp(value.grade, 0, 100) : 0

  return {
    id: value.id,
    name: value.name.trim().slice(0, MAX_SUBJECT_NAME_LENGTH),
    code: typeof value.code === 'string' ? value.code.trim().toUpperCase() : '',
    color: isValidColor(value.color) ? (value.color as string) : SUBJECT_COLORS[0]!.value,
    instructor: typeof value.instructor === 'string' ? value.instructor.trim() : '',
    semester: typeof value.semester === 'string' ? value.semester : '',
    credits,
    grade,
    location: typeof value.location === 'string' ? value.location.trim() : '',
    schedule,
    archived: value.archived === true,
  }
}

/** Case-insensitive code match so "math 201" and "MATH 201" collide. */
export function findDuplicateCode(
  subjects: readonly Subject[],
  code: string,
  excludeId?: string,
): Subject | undefined {
  const needle = code.trim().toUpperCase()
  return subjects.find(
    (subject) => subject.id !== excludeId && subject.code.toUpperCase() === needle,
  )
}

export function validateSubject(
  draft: SubjectDraft,
  options: { subjects: readonly Subject[]; currentId?: string | undefined },
): SubjectErrors {
  const errors: SubjectErrors = {}

  const name = draft.name.trim()
  if (name.length < 2) {
    errors.name = 'Subject name must be at least 2 characters.'
  } else if (name.length > MAX_SUBJECT_NAME_LENGTH) {
    errors.name = `Subject name must be under ${MAX_SUBJECT_NAME_LENGTH} characters.`
  }

  const code = draft.code.trim()
  if (code.length === 0) {
    errors.code = 'A subject code is required.'
  } else if (code.length > MAX_SUBJECT_CODE_LENGTH) {
    errors.code = `Subject code must be under ${MAX_SUBJECT_CODE_LENGTH} characters.`
  } else if (!CODE_PATTERN.test(code)) {
    errors.code = 'Use letters, numbers, spaces, dashes or dots.'
  } else if (findDuplicateCode(options.subjects, code, options.currentId)) {
    errors.code = 'Another subject already uses this code.'
  }

  if (!isValidColor(draft.color)) {
    errors.color = 'Choose a colour.'
  }

  if (!Number.isFinite(draft.credits) || draft.credits < 0 || draft.credits > 30) {
    errors.credits = 'Credits must be between 0 and 30.'
  }

  if (!Number.isFinite(draft.grade) || draft.grade < 0 || draft.grade > 100) {
    errors.grade = 'Grade must be between 0 and 100.'
  }

  const scheduleError = validateSchedule(draft.schedule)
  if (scheduleError) {
    errors.schedule = scheduleError
  }

  return errors
}

function validateSchedule(schedule: SubjectSchedule[]): string | null {
  if (schedule.length === 0) {
    return 'Add at least one class slot.'
  }

  for (const [index, slot] of schedule.entries()) {
    const label = `Slot ${index + 1}`
    if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
      return `${label}: choose a day of the week.`
    }
    if (!TIME_PATTERN.test(slot.startTime) || !TIME_PATTERN.test(slot.endTime)) {
      return `${label}: enter a valid start and end time.`
    }
    if (timeToMinutes(slot.endTime) <= timeToMinutes(slot.startTime)) {
      return `${label}: the end time must be after the start time.`
    }
  }

  return null
}

/**
 * Flatten subject schedules into individual class sessions for the calendar.
 * Archived subjects are skipped: their course is finished, so their meetings
 * are no longer part of the current week.
 */
export function deriveClassSessions(subjects: readonly Subject[]): ClassSession[] {
  const sessions: ClassSession[] = []

  for (const subject of subjects) {
    if (subject.archived) continue

    for (const slot of subject.schedule) {
      sessions.push({
        id: `ses-${subject.id}-${slot.dayOfWeek}-${slot.startTime.replace(':', '')}`,
        subjectId: subject.id,
        name: subject.name,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: subject.location,
      })
    }
  }

  return sessions
}

export type SubjectAssignmentCounts = {
  active: number
  completed: number
  total: number
}

export function countAssignmentsBySubject(assignments: readonly Assignment[]) {
  const counts = new Map<string, SubjectAssignmentCounts>()

  for (const assignment of assignments) {
    const current = counts.get(assignment.subjectId) ?? { active: 0, completed: 0, total: 0 }
    current.total += 1
    if (assignment.status === 'completed') {
      current.completed += 1
    } else {
      current.active += 1
    }
    counts.set(assignment.subjectId, current)
  }

  return counts
}

export type DeleteSubjectResult =
  | {
      status: 'deleted'
      subjects: Subject[]
      assignments: Assignment[]
      removedAssignmentIds: string[]
    }
  | { status: 'blocked'; subjectId: string; assignmentCount: number }

/**
 * Delete a subject, refusing while it still has assignments. This guard keeps
 * every assignment pointing at a subject that exists, and pushes the decision
 * up to the UI, which can offer an archive instead.
 */
export function deleteSubject(
  subjects: readonly Subject[],
  assignments: readonly Assignment[],
  subjectId: string,
): DeleteSubjectResult {
  const subject = subjects.find((candidate) => candidate.id === subjectId)
  if (!subject) {
    return { status: 'blocked', subjectId, assignmentCount: 0 }
  }

  const dependent = assignments.filter((assignment) => assignment.subjectId === subjectId)
  if (dependent.length > 0) {
    return { status: 'blocked', subjectId, assignmentCount: dependent.length }
  }

  return {
    status: 'deleted',
    subjects: subjects.filter((candidate) => candidate.id !== subjectId),
    assignments: [...assignments],
    removedAssignmentIds: [],
  }
}

/**
 * Explicit override, used only after the student confirms: removes the subject
 * together with its dependent assignments so no orphaned record is left.
 */
export function deleteSubjectWithAssignments(
  subjects: readonly Subject[],
  assignments: readonly Assignment[],
  subjectId: string,
): DeleteSubjectResult {
  const subject = subjects.find((candidate) => candidate.id === subjectId)
  if (!subject) {
    return { status: 'blocked', subjectId, assignmentCount: 0 }
  }

  return {
    status: 'deleted',
    subjects: subjects.filter((candidate) => candidate.id !== subjectId),
    assignments: assignments.filter((assignment) => assignment.subjectId !== subjectId),
    removedAssignmentIds: assignments
      .filter((assignment) => assignment.subjectId === subjectId)
      .map((assignment) => assignment.id),
  }
}

/** True when a subject can be deleted outright with no side effects. */
export function canDeleteSafely(
  assignments: readonly Assignment[],
  subjectId: string,
): boolean {
  return !assignments.some((assignment) => assignment.subjectId === subjectId)
}

function normalizeScheduleSlot(raw: unknown): SubjectSchedule | null {
  if (typeof raw !== 'object' || raw === null) return null
  const slot = raw as Partial<Record<keyof SubjectSchedule, unknown>>

  if (typeof slot.dayOfWeek !== 'number') return null
  if (typeof slot.startTime !== 'string' || typeof slot.endTime !== 'string') return null

  return {
    dayOfWeek: clamp(Math.round(slot.dayOfWeek), 0, 6),
    startTime: slot.startTime,
    endTime: slot.endTime,
  }
}

function isValidColor(value: unknown): boolean {
  return typeof value === 'string' && SUBJECT_COLORS.some((color) => color.value === value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
