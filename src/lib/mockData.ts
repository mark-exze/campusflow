/**
 * Typed local mock data for Phase 1.
 *
 * This is SAMPLE data only — there is no backend and no AI service behind it.
 * Subjects, assignments and the student profile are all seeded from here and
 * then persisted in localStorage by their own stores.
 */

import { addDays, getTodayDateString } from './date'
import { ROUTES } from './constants'
import { createDefaultProfile } from './profile'
import type { Assignment, QuickAction, Subject } from '../types'

const today = getTodayDateString()
const createdAt = '2026-09-01T09:00:00.000Z'
const updatedAt = '2026-10-01T09:00:00.000Z'

/**
 * Sample subjects are labelled with the default academic year and term rather
 * than a hardcoded string, so the demo data never contradicts the profile.
 */
const defaultProfile = createDefaultProfile()
export const MOCK_SEMESTER = `${defaultProfile.academicTerm} ${defaultProfile.academicYear}`

/**
 * Initial demo subjects. Each carries its own weekly schedule, which the store
 * flattens into class sessions for the calendar.
 */
export const MOCK_SUBJECTS: readonly Subject[] = [
  {
    id: 'sub-calc',
    name: 'Calculus II',
    code: 'MATH 201',
    color: 'bg-sky-500',
    instructor: 'Dr. Amara Patel',
    semester: MOCK_SEMESTER,
    credits: 4,
    grade: 88,
    location: 'Room 204',
    archived: false,
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:15' },
      { dayOfWeek: 3, startTime: '12:00', endTime: '12:50' },
    ],
  },
  {
    id: 'sub-lit',
    name: 'English Literature',
    code: 'ENG 210',
    color: 'bg-emerald-500',
    instructor: 'Prof. Luis Gomez',
    semester: MOCK_SEMESTER,
    credits: 3,
    grade: 91,
    location: 'Room 312',
    archived: false,
    schedule: [
      { dayOfWeek: 0, startTime: '14:00', endTime: '16:00' },
      { dayOfWeek: 1, startTime: '11:00', endTime: '11:50' },
      { dayOfWeek: 3, startTime: '14:00', endTime: '14:50' },
    ],
  },
  {
    id: 'sub-phys',
    name: 'Physics with Lab',
    code: 'PHY 102',
    color: 'bg-amber-500',
    instructor: 'Dr. Kevin Nguyen',
    semester: MOCK_SEMESTER,
    credits: 4,
    grade: 76,
    location: 'Science Bldg 12',
    archived: false,
    schedule: [
      { dayOfWeek: 1, startTime: '14:00', endTime: '16:00' },
      { dayOfWeek: 4, startTime: '13:00', endTime: '14:15' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '12:00' },
    ],
  },
  {
    id: 'sub-ds',
    name: 'Data Structures',
    code: 'CS 250',
    color: 'bg-violet-500',
    instructor: 'Prof. Maya Stone',
    semester: MOCK_SEMESTER,
    credits: 4,
    grade: 84,
    location: 'CS Lab 2',
    archived: false,
    schedule: [
      { dayOfWeek: 2, startTime: '10:00', endTime: '11:15' },
      { dayOfWeek: 4, startTime: '10:00', endTime: '11:15' },
    ],
  },
  {
    id: 'sub-hist',
    name: 'World History',
    code: 'HIS 150',
    color: 'bg-rose-500',
    instructor: 'Dr. Rachel Brooks',
    semester: MOCK_SEMESTER,
    credits: 3,
    grade: 79,
    location: 'Room 110',
    archived: false,
    schedule: [
      { dayOfWeek: 3, startTime: '09:00', endTime: '10:15' },
      { dayOfWeek: 5, startTime: '11:00', endTime: '12:15' },
    ],
  },
  {
    id: 'sub-chem',
    name: 'Organic Chemistry',
    code: 'CHEM 110',
    color: 'bg-teal-500',
    instructor: 'Prof. Tomas Alvarez',
    semester: MOCK_SEMESTER,
    credits: 5,
    grade: 82,
    location: 'Chem Bldg 8',
    archived: false,
    schedule: [
      { dayOfWeek: 2, startTime: '13:00', endTime: '14:50' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '10:50' },
    ],
  },
]

/** Seed assignments, referenced to the subjects above by id. */
export const MOCK_ASSIGNMENTS: readonly Assignment[] = [
  {
    id: 'asg-1',
    title: 'Problem Set 5 — Integration',
    subjectId: 'sub-calc',
    type: 'homework',
    priority: 'high',
    status: 'in-progress',
    dueDate: addDays(today, 1),
    estimatedHours: 3,
    description: 'Chapter 7 problems 1-28. Show all steps for substitution.',
    createdAt,
    updatedAt,
  },
  {
    id: 'asg-2',
    title: 'Lab Report: Momentum',
    subjectId: 'sub-phys',
    type: 'report',
    priority: 'medium',
    status: 'pending',
    dueDate: addDays(today, 2),
    estimatedHours: 4,
    description: 'Report on the collision lab. Include error analysis.',
    createdAt,
    updatedAt,
  },
  {
    id: 'asg-3',
    title: 'Quiz: Sort Algorithms',
    subjectId: 'sub-ds',
    type: 'quiz',
    priority: 'medium',
    status: 'pending',
    dueDate: addDays(today, 3),
    estimatedHours: 1,
    description: 'Sorting complexity and stability questions.',
    createdAt,
    updatedAt,
  },
  {
    id: 'asg-4',
    title: 'Essay: Modernist Themes',
    subjectId: 'sub-lit',
    type: 'essay',
    priority: 'high',
    status: 'pending',
    dueDate: addDays(today, 5),
    estimatedHours: 6,
    description: '1200 words on modernist themes in two studied texts.',
    createdAt,
    updatedAt,
  },
  {
    id: 'asg-5',
    title: 'Reading: Chapter 12',
    subjectId: 'sub-hist',
    type: 'reading',
    priority: 'low',
    status: 'pending',
    dueDate: addDays(today, 4),
    estimatedHours: 2,
    description: 'Post-war reconstruction. Prepare discussion notes.',
    createdAt,
    updatedAt,
  },
  {
    id: 'asg-6',
    title: 'Worksheet: Reaction Mechanisms',
    subjectId: 'sub-chem',
    type: 'report',
    priority: 'medium',
    status: 'pending',
    dueDate: addDays(today, 0),
    estimatedHours: 1.5,
    description: 'Nucleophilic substitution mechanism practice.',
    createdAt,
    updatedAt,
  },
  {
    id: 'asg-7',
    title: 'Problem Set 4 — Limits',
    subjectId: 'sub-calc',
    type: 'homework',
    priority: 'medium',
    status: 'completed',
    dueDate: addDays(today, -3),
    estimatedHours: 2,
    description: 'Chapter 6 problems. Submitted on time.',
    createdAt,
    updatedAt,
  },
  {
    id: 'asg-8',
    title: 'Essay: Colonial Trade',
    subjectId: 'sub-hist',
    type: 'essay',
    priority: 'high',
    status: 'pending',
    dueDate: addDays(today, -1),
    estimatedHours: 4,
    description: 'Trade routes and colonial economies.',
    createdAt,
    updatedAt,
  },
]

/**
 * Quick actions point at pages that exist in this phase, so every control
 * on screen does something real.
 */
export const MOCK_QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: 'qa-assignment',
    label: 'Add assignment',
    description: 'Track a new deadline',
    to: ROUTES.assignments,
    icon: 'PlusCircle',
  },
  {
    id: 'qa-subjects',
    label: 'View subjects',
    description: 'Your courses and grades',
    to: ROUTES.subjects,
    icon: 'BookOpen',
  },
  {
    id: 'qa-calendar',
    label: 'Open calendar',
    description: 'Weekly class schedule',
    to: ROUTES.calendar,
    icon: 'CalendarDays',
  },
  {
    id: 'qa-settings',
    label: 'Appearance',
    description: 'Theme and preferences',
    to: ROUTES.settings,
    icon: 'Settings',
  },
]
