/**
 * Shape guards for localStorage payloads.
 *
 * `JSON.parse` happily returns `null`, a string, or an object where an array
 * is expected. Feeding those straight into a `.map()` crashes the page, so each
 * store validates the parsed shape before using it.
 */

import type { Assignment, OnboardingState, StudentProfile, Subject } from '../types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isSubjectArray(value: unknown): value is Subject[] {
  return Array.isArray(value) && value.every(isPlainObject)
}

export function isAssignmentArray(value: unknown): value is Assignment[] {
  return Array.isArray(value) && value.every(isPlainObject)
}

export function isProfileObject(value: unknown): value is StudentProfile {
  return isPlainObject(value)
}

export function isOnboardingState(value: unknown): value is OnboardingState {
  return isPlainObject(value)
}
