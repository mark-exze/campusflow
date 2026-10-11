/**
 * Shared type definitions for CampusFlow AI (Phase 1).
 * These are intentionally simple and local — they will evolve with the backend.
 */

export type Subject = {
  id: string
  name: string
  code: string
  color: string
  instructor: string
  semester: string
  credits: number
  grade: number // sample overall grade, 0-100
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