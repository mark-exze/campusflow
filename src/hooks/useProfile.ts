import { useCallback, useMemo } from 'react'

import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '../lib/constants'
import {
  createDefaultProfile,
  normalizeProfile,
} from '../lib/profile'
import { isProfileObject } from '../lib/storage'
import type { StudentProfile } from '../types'

export { validateProfile, type ProfileErrors } from '../lib/profile'

/**
 * Student profile state backed by localStorage.
 *
 * Values read from storage are normalized on every render so a partial or
 * outdated record can never produce an incomplete profile in the UI.
 */
export function useProfile() {
  const { value, setValue, reset, persist } = useLocalStorage<StudentProfile>(
    STORAGE_KEYS.profile,
    createDefaultProfile(),
    isProfileObject,
  )

  const profile = useMemo(() => normalizeProfile(value), [value])

  const updateProfile = useCallback(
    (patch: Partial<StudentProfile>): boolean => {
      const next = normalizeProfile({ ...normalizeProfile(value), ...patch })
      setValue(next)
      return persist(next)
    },
    [persist, setValue, value],
  )

  const saveProfile = useCallback(
    (next: StudentProfile): boolean => {
      const normalized = normalizeProfile(next)
      setValue(normalized)
      return persist(normalized)
    },
    [persist, setValue],
  )

  const resetProfile = useCallback(() => {
    reset()
  }, [reset])

  return { profile, updateProfile, saveProfile, resetProfile }
}
