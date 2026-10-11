/**
 * Small UI helpers: class name merging and shared formatting.
 */

import { formatDurationHours } from './date'

type ClassValue = string | false | null | undefined | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = []

  for (const input of inputs) {
    if (!input) continue
    if (typeof input === 'string') {
      classes.push(input)
    } else if (Array.isArray(input)) {
      classes.push(cn(...input))
    }
  }

  return classes.join(' ').trim()
}

export function formatEstimatedHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0h'
  return formatDurationHours(hours)
}

export function getGradeBandLabel(percentage: number): string {
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

export function getGradeColor(percentage: number): string {
  if (percentage >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (percentage >= 80) return 'text-sky-600 dark:text-sky-400'
  if (percentage >= 70) return 'text-amber-600 dark:text-amber-400'
  if (percentage >= 60) return 'text-orange-600 dark:text-orange-400'
  return 'text-rose-600 dark:text-rose-400'
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} – ${endTime}`
}