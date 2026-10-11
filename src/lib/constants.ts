/**
 * Application-wide constants and helpers.
 */

export const APP_NAME = 'CampusFlow AI' as const

export const STORAGE_KEYS = {
  assignments: 'campusflow.assignments.v1',
  theme: 'campusflow.theme.v1',
} as const

export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  subjects: '/subjects',
  assignments: '/assignments',
  calendar: '/calendar',
  settings: '/settings',
} as const

export const DEFAULT_THEME = 'system' as const

export const GRADE_BANDS: readonly {
  label: string
  min: number
  max: number
  color: string
}[] = [
  { label: 'A', min: 90, max: 100, color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'B', min: 80, max: 89, color: 'text-sky-600 dark:text-sky-400' },
  { label: 'C', min: 70, max: 79, color: 'text-amber-600 dark:text-amber-400' },
  { label: 'D', min: 60, max: 69, color: 'text-orange-600 dark:text-orange-400' },
  { label: 'F', min: 0, max: 59, color: 'text-rose-600 dark:text-rose-400' },
]

export const ASSIGNMENT_TYPES: readonly {
  value: 'quiz' | 'homework' | 'exam' | 'project' | 'reading' | 'essay' | 'report' | 'lab' | 'other'
  label: string
}[] = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'homework', label: 'Homework' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'reading', label: 'Reading' },
  { value: 'essay', label: 'Essay' },
  { value: 'report', label: 'Report' },
  { value: 'lab', label: 'Lab' },
  { value: 'other', label: 'Other' },
]

export const PRIORITY_OPTIONS: readonly {
  value: 'low' | 'medium' | 'high'
  label: string
  color: string
}[] = [
  { value: 'low', label: 'Low', color: 'text-slate-500' },
  { value: 'medium', label: 'Medium', color: 'text-amber-500' },
  { value: 'high', label: 'High', color: 'text-rose-500' },
]

export const STATUS_OPTIONS: readonly {
  value: 'pending' | 'in-progress' | 'completed'
  label: string
}[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

export const NAV_ITEMS: readonly {
  to: string
  label: string
  icon: string
}[] = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: ROUTES.subjects, label: 'Subjects', icon: 'BookOpen' },
  { to: ROUTES.assignments, label: 'Assignments', icon: 'ClipboardList' },
  { to: ROUTES.calendar, label: 'Calendar', icon: 'CalendarDays' },
  { to: ROUTES.settings, label: 'Settings', icon: 'Settings' },
]