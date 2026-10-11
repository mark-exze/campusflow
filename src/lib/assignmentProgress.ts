/**
 * Assignment progress rules.
 *
 * Progress is derived from, and kept consistent with, status:
 *   - completed  -> always 100
 *   - pending    -> 0 by default
 *   - in-progress-> 0-99
 *
 * Pure functions so the rules can be enforced in one place, at both the form
 * and the store layer.
 */

import type { Assignment, AssignmentStatus } from '../types'

export const MAX_PROGRESS = 100
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * The canonical progress for a status, ignoring an inconsistent stored value.
 * Records written by older builds simply have no progress and resolve to 0.
 */
export function reconcileProgress(
  status: AssignmentStatus,
  progress: number | undefined,
): number {
  if (status === 'completed') return 100

  if (typeof progress !== 'number' || !Number.isFinite(progress)) return 0

  // Anything incomplete is capped below completion so a record can never read
  // as 100% while still open.
  return clamp(Math.round(progress), 0, 99)
}

/** Effective progress percentage for an assignment. */
export function getAssignmentProgress(assignment: Assignment): number {
  return reconcileProgress(assignment.status, assignment.progress)
}

/**
 * Validate a progress value coming from a form. Returns an error message, or
 * null when the value is acceptable for the given status.
 */
export function validateProgress(
  status: AssignmentStatus,
  progress: number,
): string | null {
  if (!Number.isFinite(progress)) {
    return 'Enter a whole number between 0 and 100.'
  }

  if (status === 'completed') return null

  if (progress < 0 || progress > 99) {
    return 'Open assignments must be between 0% and 99%.'
  }

  return null
}

/** Human label for a progress value, used in card copy. */
export function progressLabel(value: number): string {
  if (value >= 100) return 'Complete'
  if (value <= 0) return 'Not started'
  return `${value}%`
}

/**
 * Coerce a stored record into a consistent assignment. Progress is re-derived
 * from the status so legacy records without one still resolve correctly, and
 * a completed record can never report less than 100%.
 */
export function normalizeAssignment(raw: Assignment): Assignment {
  return {
    ...raw,
    progress: reconcileProgress(raw.status, raw.progress),
  }
}