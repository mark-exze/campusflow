import { useCallback } from 'react'

import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '../lib/constants'
import { isOnboardingState } from '../lib/storage'
import type { OnboardingState } from '../types'

/** Fresh students see the guide; nothing is dismissed and nothing is visited. */
const DEFAULT_STATE: OnboardingState = {
  dismissed: false,
  visitedCalendar: false,
}

/**
 * Onboarding visibility, persisted locally.
 *
 * Only two things are stored: whether the student hid the guide, and whether
 * they have opened the calendar. Everything else about progress is derived
 * from real records, so it cannot fall out of sync with what the student has
 * actually done.
 */
export function useOnboarding() {
  const { value, setValue, reset } = useLocalStorage<OnboardingState>(
    STORAGE_KEYS.onboarding,
    DEFAULT_STATE,
    isOnboardingState,
  )

  // Callbacks are stable: they use functional updates so their identity does
  // not change on every render. Keeping them stable means an effect that calls
  // them (the calendar visit marker) runs once rather than on every render.
  const dismiss = useCallback(() => {
    setValue((current) => ({ ...current, dismissed: true }))
  }, [setValue])

  const restore = useCallback(() => {
    setValue((current) => ({ ...current, dismissed: false }))
  }, [setValue])

  const markCalendarVisited = useCallback(() => {
    setValue((current) =>
      current.visitedCalendar ? current : { ...current, visitedCalendar: true },
    )
  }, [setValue])

  const resetOnboarding = useCallback((): boolean => reset(), [reset])

  return {
    ...value,
    dismiss,
    restore,
    markCalendarVisited,
    resetOnboarding,
  }
}
