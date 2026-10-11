/**
 * Date and time helpers used across the UI.
 *
 * All dates are handled as timezone-less `yyyy-mm-dd` strings. They are built
 * from LOCAL date components rather than `toISOString()`, because in any
 * timezone ahead of UTC `toISOString()` rolls the date back a day and every
 * deadline would appear a day early.
 */

import type { DateFormatPreference } from '../types'

/** Format a Date as a local `yyyy-mm-dd` string. */
function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse a `yyyy-mm-dd` string into a Date at local midnight. */
function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`)
}

export function getTodayDateString(): string {
  return toIsoDate(new Date())
}

export function formatShortDate(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function formatLongDate(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDayHeader(isoDate: string, dateFormat: DateFormatPreference): string {
  const date = parseIsoDate(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' })
  return `${weekday}, ${formatDateWithPreference(isoDate, dateFormat)}`
}

export function daysUntil(isoDate: string): number {
  const target = parseIsoDate(isoDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function isOverdue(isoDate: string): boolean {
  return daysUntil(isoDate) < 0
}

export function isToday(isoDate: string): boolean {
  return isoDate === getTodayDateString()
}

export function isTomorrow(isoDate: string): boolean {
  return daysUntil(isoDate) === 1
}

export function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export function startOfWeek(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  return toIsoDate(date)
}

export function getWeekDates(startIso: string): string[] {
  const start = parseIsoDate(startIso)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return toIsoDate(date)
  })
}

/**
 * Render a `yyyy-mm-dd` value using the student's stored preference. Invalid
 * input is echoed back unchanged instead of rendering "Invalid Date".
 */
export function formatDateWithPreference(
  isoDate: string,
  format: DateFormatPreference,
): string {
  const date = parseIsoDate(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  switch (format) {
    case 'dmy':
      return `${day}/${month}/${year}`
    case 'mdy':
      return `${month}/${day}/${year}`
    case 'ymd':
      return `${year}-${month}-${day}`
    default:
      return isoDate
  }
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return time
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

export function formatDurationHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (Number.isInteger(hours)) return `${hours}h`
  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60)
  return minutes > 0 ? `${whole}h ${minutes}m` : `${whole}h`
}

export function getRelativeDayLabel(isoDate: string): string {
  if (isToday(isoDate)) return 'Today'
  if (isTomorrow(isoDate)) return 'Tomorrow'
  if (daysUntil(isoDate) === -1) return 'Yesterday'
  if (daysUntil(isoDate) > 0 && daysUntil(isoDate) <= 7) {
    return `in ${daysUntil(isoDate)} days`
  }
  if (daysUntil(isoDate) < 0 && daysUntil(isoDate) >= -7) {
    return `${Math.abs(daysUntil(isoDate))} days overdue`
  }
  return formatShortDate(isoDate)
}