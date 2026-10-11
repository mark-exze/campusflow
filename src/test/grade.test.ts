import { describe, expect, it } from 'vitest'

import {
  calculatePercentage,
  calculateWeightedAverage,
  computeGrades,
  projectRemainingAverage,
} from '../lib/grade'
import { getGradeBandLabel, getGradeColor, formatEstimatedHours, cn } from '../lib/utils'
import type { GradeRecord } from '../types'

function record(overrides: Partial<GradeRecord> = {}): GradeRecord {
  return {
    id: 'g-1',
    subjectId: 'sub-1',
    assignmentId: null,
    name: 'Quiz',
    earned: 90,
    total: 100,
    date: '2026-10-01',
    ...overrides,
  }
}

describe('calculatePercentage', () => {
  it('returns the percentage of earned over total', () => {
    expect(calculatePercentage(90, 100)).toBe(90)
    expect(calculatePercentage(45, 60)).toBe(75)
    expect(calculatePercentage(1, 3)).toBeCloseTo(33.333, 3)
  })

  it('returns 0 instead of dividing by zero', () => {
    expect(calculatePercentage(50, 0)).toBe(0)
    expect(calculatePercentage(50, -10)).toBe(0)
  })
})

describe('calculateWeightedAverage', () => {
  it('weights records when a weight is provided', () => {
    const result = calculateWeightedAverage([
      record({ id: 'a', earned: 100, total: 100, weight: 2 }),
      record({ id: 'b', earned: 50, total: 100, weight: 1 }),
    ])
    // (100 * 2 + 50 * 1) / 3
    expect(result).toBeCloseTo(83.333, 3)
  })

  it('treats records without a weight as weight 1', () => {
    const result = calculateWeightedAverage([
      record({ id: 'a', earned: 80, total: 100 }),
      record({ id: 'b', earned: 90, total: 100 }),
    ])
    expect(result).toBeCloseTo(85, 5)
  })

  it('returns 0 for an empty set', () => {
    expect(calculateWeightedAverage([])).toBe(0)
  })
})

describe('projectRemainingAverage', () => {
  it('computes the average needed on remaining work', () => {
    // Current 80 over weight 2, 2 remaining items, target 90.
    // (90 * 4 - 80 * 2) / 2 = 100
    expect(projectRemainingAverage(80, 2, 2, 90)).toBe(100)
  })

  it('returns 0 when there is nothing left to grade', () => {
    expect(projectRemainingAverage(80, 2, 0, 90)).toBe(0)
  })
})

describe('computeGrades', () => {
  it('maps inputs to percentages and weights', () => {
    const [first, second] = computeGrades([
      { earned: 18, total: 20, weight: 2 },
      { earned: 5, total: 5 },
    ])

    expect(first).toEqual({ percentage: 90, weightedContribution: 180, totalWeight: 2 })
    expect(second).toEqual({ percentage: 100, weightedContribution: 100, totalWeight: 1 })
  })
})

describe('grade band helpers', () => {
  it('maps percentages to bands', () => {
    expect(getGradeBandLabel(100)).toBe('A')
    expect(getGradeBandLabel(90)).toBe('A')
    expect(getGradeBandLabel(89)).toBe('B')
    expect(getGradeBandLabel(70)).toBe('C')
    expect(getGradeBandLabel(60)).toBe('D')
    expect(getGradeBandLabel(59)).toBe('F')
  })

  it('returns a distinct colour per band', () => {
    expect(getGradeColor(95)).not.toBe(getGradeColor(85))
    expect(getGradeColor(75)).not.toBe(getGradeColor(65))
    expect(getGradeColor(55)).toContain('rose')
  })
})

describe('formatEstimatedHours', () => {
  it('formats hours and rejects invalid values', () => {
    expect(formatEstimatedHours(0)).toBe('0h')
    expect(formatEstimatedHours(-3)).toBe('0h')
    expect(formatEstimatedHours(1.5)).toBe('1h 30m')
  })
})

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('a', undefined, 'b', false, null, 'c')).toBe('a b c')
    expect(cn(['x', ['y', undefined]])).toBe('x y')
  })
})
