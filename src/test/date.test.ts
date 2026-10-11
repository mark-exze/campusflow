import { describe, expect, it } from 'vitest'

import {
  addDays,
  daysUntil,
  formatDurationHours,
  formatShortDate,
  formatTime,
  getRelativeDayLabel,
  getTodayDateString,
  getWeekDates,
  isOverdue,
  isToday,
  isTomorrow,
  startOfWeek,
  timeToMinutes,
} from '../lib/date'

describe('date helpers', () => {
  it('formats 24-hour times as 12-hour times', () => {
    expect(formatTime('09:30')).toBe('9:30 AM')
    expect(formatTime('11:05')).toBe('11:05 AM')
    expect(formatTime('13:05')).toBe('1:05 PM')
    expect(formatTime('12:00')).toBe('12:00 PM')
    expect(formatTime('00:15')).toBe('12:15 AM')
  })

  it('converts times to minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it('formats durations in hours and minutes', () => {
    expect(formatDurationHours(2)).toBe('2h')
    expect(formatDurationHours(0.5)).toBe('30m')
    expect(formatDurationHours(2.5)).toBe('2h 30m')
    expect(formatDurationHours(3.25)).toBe('3h 15m')
  })

  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-11', 6)).toBe('2026-10-17')
  })

  it('finds the start of the week (Sunday)', () => {
    // 2026-10-11 is a Sunday, so it is already the start of its week.
    expect(startOfWeek('2026-10-11')).toBe('2026-10-11')
    // Monday rolls back to Sunday.
    expect(startOfWeek('2026-10-12')).toBe('2026-10-11')
    // Saturday rolls back six days.
    expect(startOfWeek('2026-10-17')).toBe('2026-10-11')
  })

  it('lists seven consecutive dates for a week', () => {
    expect(getWeekDates('2026-10-11')).toEqual([
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
    ])
  })

  it('classifies dates relative to today', () => {
    const today = getTodayDateString()
    const tomorrow = addDays(today, 1)
    const yesterday = addDays(today, -1)

    expect(daysUntil(today)).toBe(0)
    expect(daysUntil(tomorrow)).toBe(1)
    expect(daysUntil(yesterday)).toBe(-1)

    expect(isToday(today)).toBe(true)
    expect(isToday(tomorrow)).toBe(false)

    expect(isTomorrow(tomorrow)).toBe(true)
    expect(isTomorrow(yesterday)).toBe(false)

    expect(isOverdue(yesterday)).toBe(true)
    expect(isOverdue(today)).toBe(false)
    expect(isOverdue(tomorrow)).toBe(false)
  })

  it('produces relative day labels', () => {
    const today = getTodayDateString()

    expect(getRelativeDayLabel(today)).toBe('Today')
    expect(getRelativeDayLabel(addDays(today, 1))).toBe('Tomorrow')
    expect(getRelativeDayLabel(addDays(today, -1))).toBe('Yesterday')
    expect(getRelativeDayLabel(addDays(today, 3))).toBe('in 3 days')
    expect(getRelativeDayLabel(addDays(today, -2))).toBe('2 days overdue')
    // Beyond a week it falls back to an absolute short date.
    expect(getRelativeDayLabel(addDays(today, 30))).toBe(formatShortDate(addDays(today, 30)))
  })

  it('short formats a date without crashing on invalid input', () => {
    expect(formatShortDate('2026-10-11')).toMatch(/Oct/)
    expect(formatShortDate('not-a-date')).toBe('not-a-date')
  })
})
