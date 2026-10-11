import { useCallback, useEffect, useState } from 'react'

/**
 * Persist a piece of state to localStorage.
 *
 * The value is written back on every change, so student edits survive a
 * page reload. Storage errors (private mode, quota) are swallowed so the app
 * keeps working in memory instead of crashing.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readStoredValue(key, initialValue))

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  }, [key, value])

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    setValue(initialValue)
  }, [key, initialValue])

  const reset = useCallback(() => {
    setValue(initialValue)
  }, [initialValue])

  return { value, setValue, remove, reset }
}

function readStoredValue<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') return initialValue
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return initialValue
    return JSON.parse(raw) as T
  } catch {
    return initialValue
  }
}