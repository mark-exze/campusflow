/**
 * Grade calculator helpers for the gradebook feature.
 * Pure, testable functions operating on typed records.
 */

import type { GradeRecord } from '../types'

export type GradeInput = {
  earned: number
  total: number
  weight?: number
}

export type GradeResult = {
  percentage: number
  weightedContribution: number
  totalWeight: number
}

/**
 * Calculate a single grade percentage from earned / total points.
 * Returns 0 when total is 0 or non-finite to avoid division-by-zero.
 */
export function calculatePercentage(earned: number, total: number): number {
  if (!Number.isFinite(earned) || !Number.isFinite(total) || total <= 0) return 0
  return (earned / total) * 100
}

/**
 * Compute an overall weighted grade from a list of grade records.
 * Records without a weight are treated as weight 1.
 */
export function calculateWeightedAverage(records: GradeRecord[]): number {
  let weightedSum = 0
  let totalWeight = 0

  for (const record of records) {
    const weight = record.weight !== undefined && record.weight > 0 ? record.weight : 1
    const percentage = calculatePercentage(record.earned, record.total)
    weightedSum += percentage * weight
    totalWeight += weight
  }

  if (totalWeight <= 0) return 0
  return weightedSum / totalWeight
}

/**
 * Project a final grade given current average and remaining weight.
 * `remainingAssignments` is the number of remaining items (each weight 1).
 * `targetFinal` is the desired final percentage.
 * Returns the average percentage the remaining items must achieve.
 */
export function projectRemainingAverage(
  currentAverage: number,
  completedWeight: number,
  remainingAssignments: number,
  targetFinal: number,
): number {
  const remainingWeight = remainingAssignments
  if (remainingWeight <= 0) return 0
  const totalWeight = completedWeight + remainingWeight
  if (totalWeight <= 0) return 0
  const needed = targetFinal * totalWeight - currentAverage * completedWeight
  return needed / remainingWeight
}

/**
 * Convert a list of GradeInput objects to GradeResult objects.
 */
export function computeGrades(inputs: GradeInput[]): GradeResult[] {
  return inputs.map((input) => {
    const weight = input.weight && input.weight > 0 ? input.weight : 1
    return {
      percentage: calculatePercentage(input.earned, input.total),
      weightedContribution: calculatePercentage(input.earned, input.total) * weight,
      totalWeight: weight,
    }
  })
}