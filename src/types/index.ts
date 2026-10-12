/**
 * Shared type definitions for CampusFlow.
 * These are intentionally simple and local — they will evolve with the backend.
 */

/**
 * A single recurring weekly class slot. One subject can have several, which is
 * how the calendar is derived (see `deriveClassSessions`).
 */
export type SubjectSchedule = {
  dayOfWeek: number // 0 = Sunday
  startTime: string // HH:MM
  endTime: string // HH:MM
}

export type Subject = {
  id: string
  name: string
  code: string
  color: string // Tailwind background class, e.g. 'bg-sky-500'
  instructor: string // optional
  semester: string
  credits: number
  grade: number // sample overall grade, 0-100
  location: string // optional classroom
  schedule: SubjectSchedule[]
  archived: boolean
}

export type SchoolLevel = 'high-school' | 'senior-high-school' | 'college' | 'university'

export type DateFormatPreference = 'dmy' | 'mdy' | 'ymd'

/**
 * Student-owned profile. Everything here is editable and persisted locally.
 */
export type StudentProfile = {
  displayName: string
  schoolLevel: SchoolLevel
  schoolName: string // optional
  academicYear: string
  academicTerm: string
  dateFormat: DateFormatPreference
}

export type AssignmentType =
  | 'quiz'
  | 'homework'
  | 'exam'
  | 'project'
  | 'reading'
  | 'essay'
  | 'report'
  | 'lab'
  | 'other'

export type AssignmentPriority = 'low' | 'medium' | 'high'

export type AssignmentStatus = 'pending' | 'in-progress' | 'completed'

export type Assignment = {
  id: string
  title: string
  subjectId: string
  type: AssignmentType
  priority: AssignmentPriority
  status: AssignmentStatus
  dueDate: string // ISO date (yyyy-mm-dd)
  estimatedHours: number
  description: string
  /**
   * Completion percentage, 0-100. Optional so records written by earlier
   * builds still load; the effective value is always derived from the status
   * via `getAssignmentProgress`.
   */
  progress?: number | undefined
  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
}

export type ClassSession = {
  id: string
  subjectId: string
  name: string
  dayOfWeek: number // 0 = Sunday
  startTime: string // HH:MM
  endTime: string // HH:MM
  location: string
}

export type GradeBand = {
  label: string
  min: number
  max: number
  color: string
}

/**
 * Local onboarding payload. Only visibility is stored here — step progress is
 * derived from real records, so it can never contradict what the student did.
 */
export type OnboardingState = {
  /** The student hid the getting-started guide. */
  dismissed: boolean
  /** The student has opened the calendar at least once. */
  visitedCalendar: boolean
}

export type GradeRecord = {
  id: string
  subjectId: string
  assignmentId: string | null
  name: string
  earned: number
  total: number
  weight?: number
  date: string // ISO date (yyyy-mm-dd)
}

export type Theme = 'light' | 'dark' | 'system'

export type NavigationItem = {
  to: string
  label: string
  icon: string // lucide icon name
}

export type QuickAction = {
  id: string
  label: string
  description: string
  to: string
  icon: string // lucide icon name
}
