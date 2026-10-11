/**
 * Distinguishing seeded demonstration records from student-created ones.
 *
 * The app starts with sample subjects and assignments so a new student can see
 * how everything works. Those records are stored in exactly the same shape as
 * real ones, so they are identified by id set rather than by a flag that could
 * drift out of sync.
 *
 * A seeded record the student edits keeps its id — ids are stable, so
 * assignments that reference a subject never break. It is reported as
 * "customised" rather than dropped back into "untouched sample", so the UI can
 * acknowledge the work the student did.
 */

import { MOCK_ASSIGNMENTS, MOCK_SUBJECTS } from './mockData'
import { normalizeAssignment } from './assignmentProgress'
import type { Assignment, Subject } from '../types'

/** Ids the app seeds as demonstration data. */
export const SEED_SUBJECT_IDS: ReadonlySet<string> = new Set(
  MOCK_SUBJECTS.map((subject) => subject.id),
)

/** Ids the app seeds as demonstration data. */
export const SEED_ASSIGNMENT_IDS: ReadonlySet<string> = new Set(
  MOCK_ASSIGNMENTS.map((assignment) => assignment.id),
)

/**
 * The seed records by id, so an edited copy can be compared with its original.
 *
 * Seeds are stored in their NORMALIZED form: the store fills in a derived
 * `progress` value when it saves, so comparing raw seeds would flag every
 * seeded assignment as edited. These are read-only reference copies; nothing
 * is written back to them.
 */
const SEED_SUBJECTS_BY_ID: ReadonlyMap<string, Subject> = new Map(
  MOCK_SUBJECTS.map((subject) => [subject.id, subject]),
)

const SEED_ASSIGNMENTS_BY_ID: ReadonlyMap<string, Assignment> = new Map(
  MOCK_ASSIGNMENTS.map((assignment) => [
    assignment.id,
    normalizeAssignment(assignment),
  ]),
)

/** Origin of a stored record. */
export type RecordOrigin = 'sample' | 'customised' | 'user'

/**
 * Subject fields that count as content. `archived` is deliberately excluded:
 * archiving is a state change, not customising, so hiding a sample subject does
 * not turn it into the student's own work.
 */
const SUBJECT_CONTENT_KEYS = [
  'name',
  'code',
  'instructor',
  'color',
  'credits',
  'location',
  'grade',
  'schedule',
] as const satisfies readonly (keyof Subject)[]

/** Assignment fields that count as content. */
const ASSIGNMENT_CONTENT_KEYS = [
  'title',
  'subjectId',
  'type',
  'priority',
  'status',
  'dueDate',
  'estimatedHours',
  'description',
  'progress',
] as const satisfies readonly (keyof Assignment)[]

function fingerprint<T extends object>(record: T, keys: readonly (keyof T)[]): string {
  return JSON.stringify(keys.map((key) => record[key]))
}

export function isSeededSubject(subject: Subject): boolean {
  return SEED_SUBJECT_IDS.has(subject.id)
}

export function isSeededAssignment(assignment: Assignment): boolean {
  return SEED_ASSIGNMENT_IDS.has(assignment.id)
}

/**
 * A seeded subject whose content differs from the copy the app shipped with.
 * The id is never changed, so assignment references stay intact.
 */
export function isCustomisedSubject(subject: Subject): boolean {
  const original = SEED_SUBJECTS_BY_ID.get(subject.id)
  if (!original) return false
  return fingerprint(subject, SUBJECT_CONTENT_KEYS) !== fingerprint(original, SUBJECT_CONTENT_KEYS)
}

export function isCustomisedAssignment(assignment: Assignment): boolean {
  const original = SEED_ASSIGNMENTS_BY_ID.get(assignment.id)
  if (!original) return false
  // Compare the normalized form, so a derived progress value added on save is
  // not mistaken for an edit.
  const stored = normalizeAssignment(assignment)
  return (
    fingerprint(stored, ASSIGNMENT_CONTENT_KEYS) !==
    fingerprint(original, ASSIGNMENT_CONTENT_KEYS)
  )
}

export function getSubjectOrigin(subject: Subject): RecordOrigin {
  if (!isSeededSubject(subject)) return 'user'
  return isCustomisedSubject(subject) ? 'customised' : 'sample'
}

export function getAssignmentOrigin(assignment: Assignment): RecordOrigin {
  if (!isSeededAssignment(assignment)) return 'user'
  return isCustomisedAssignment(assignment) ? 'customised' : 'sample'
}

export type RecordSummary = {
  /** Seeded subjects still untouched. */
  sampleSubjects: number
  /** Seeded subjects the student has edited. */
  customisedSubjects: number
  /** Subjects the student created from scratch. */
  userSubjects: number
  /** Active (non-archived) subjects, of any origin. */
  activeSubjects: number
  /** Archived subjects, of any origin. */
  archivedSubjects: number

  sampleAssignments: number
  customisedAssignments: number
  userAssignments: number
}

/**
 * Split both datasets by origin, with the archive split for subjects.
 *
 * `sample + customised + user` always equals the stored length, and
 * `active + archived` equals it too, so no record can be double counted.
 */
export function summarizeRecords(
  subjects: readonly Subject[],
  assignments: readonly Assignment[],
): RecordSummary {
  let sampleSubjects = 0
  let customisedSubjects = 0
  let userSubjects = 0
  let activeSubjects = 0
  let archivedSubjects = 0

  for (const subject of subjects) {
    const origin = getSubjectOrigin(subject)
    if (origin === 'user') userSubjects += 1
    else if (origin === 'customised') customisedSubjects += 1
    else sampleSubjects += 1

    if (subject.archived) {
      archivedSubjects += 1
    } else {
      activeSubjects += 1
    }
  }

  let sampleAssignments = 0
  let customisedAssignments = 0
  let userAssignments = 0
  for (const assignment of assignments) {
    const origin = getAssignmentOrigin(assignment)
    if (origin === 'user') userAssignments += 1
    else if (origin === 'customised') customisedAssignments += 1
    else sampleAssignments += 1
  }

  return {
    sampleSubjects,
    customisedSubjects,
    userSubjects,
    activeSubjects,
    archivedSubjects,
    sampleAssignments,
    customisedAssignments,
    userAssignments,
  }
}

/**
 * True when the student has made a subject their own, either by creating one
 * or by customising a seeded record. Untouched sample records do not count, so
 * onboarding progress is never overstated.
 */
export function hasStudentSubject(subjects: readonly Subject[]): boolean {
  return subjects.some((subject) => getSubjectOrigin(subject) !== 'sample')
}

/** True when the student has made an assignment their own. */
export function hasStudentAssignment(assignments: readonly Assignment[]): boolean {
  return assignments.some((assignment) => getAssignmentOrigin(assignment) !== 'sample')
}

/** Subjects the student created from scratch, in list order. */
export function getUserSubjects(subjects: readonly Subject[]): Subject[] {
  return subjects.filter((subject) => getSubjectOrigin(subject) === 'user')
}

/** Subjects the student has made their own: created or customised. */
export function getStudentSubjects(subjects: readonly Subject[]): Subject[] {
  return subjects.filter((subject) => getSubjectOrigin(subject) !== 'sample')
}
