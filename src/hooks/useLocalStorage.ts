import { useCallback, useEffect, useState } from 'react'
import type { SetStateAction } from 'react'

/** Raised when stored bytes could not be read as a usable value. */
export class StorageReadError extends Error {
  readonly key: string

  constructor(key: string) {
    super(`Could not read saved data for "${key}".`)
    this.name = 'StorageReadError'
    this.key = key
  }
}

/** Raised when a write to localStorage fails, e.g. quota or private mode. */
export class StorageWriteError extends Error {
  readonly key: string

  constructor(key: string, cause: unknown) {
    super(`Could not save changes for "${key}".`)
    this.name = 'StorageWriteError'
    this.key = key
    this.cause = cause
  }
}

type StorageErrorListener = (errors: ReadonlyMap<string, Error>) => void

/**
 * Per-key failure state, aggregated.
 *
 * A single "last error" is the wrong model here: one key's successful write
 * must not erase another key's outstanding read failure, which would hide the
 * notice until the next failure.
 */
const failureByKey = new Map<string, Error>()
const errorListeners = new Set<StorageErrorListener>()

function reportFailure(key: string, error: Error | null): void {
  if (error === null) {
    failureByKey.delete(key)
  } else {
    failureByKey.set(key, error)
  }

  const snapshot = new Map(failureByKey)
  for (const listener of errorListeners) listener(snapshot)
}

/** Subscribe to storage read/write problems so the UI can surface them. */
export function subscribeToStorageError(listener: StorageErrorListener): () => void {
  errorListeners.add(listener)
  return () => {
    errorListeners.delete(listener)
  }
}

/**
 * The current storage problem, or null once every key recovers.
 *
 * When several keys are affected the first one is reported, so the message is
 * deterministic.
 */
export function useStorageError(): Error | null {
  const [errors, setErrors] = useState<ReadonlyMap<string, Error>>(
    () => new Map(failureByKey),
  )

  useEffect(() => subscribeToStorageError(setErrors), [])

  return errors.size === 0 ? null : ([...errors.values()][0] ?? null)
}

/** Test seam: clears aggregated failures so each spec starts from a clean slate. */
export function resetStorageErrors(): void {
  failureByKey.clear()
}

export type StorageRead<T> = {
  value: T
  /** True when the stored bytes were unreadable or the wrong shape. */
  hadReadError: boolean
}

/**
 * Persist a piece of state to localStorage.
 *
 * Three guarantees:
 *  - The stored value is shape-checked before use, so a hand-edited or
 *    corrupted record can never crash the page.
 *  - Unreadable bytes are left in place. The mount that followed an unreadable
 *    read does not write over them, so the student can still recover the data;
 *    a later edit does write, which is then an intentional change.
 *  - No-op writes are skipped, so a stale hook instance can never clobber a
 *    newer one. Write failures are published rather than swallowed, so calling
 *    code never reports a save that did not happen.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate?: (value: unknown) => boolean,
) {
  const [{ value, hadReadError }, setState] = useState<StorageRead<T>>(() =>
    readStoredValue(key, initialValue, validate),
  )

  const setValue = useCallback((next: SetStateAction<T>) => {
    setState((current) => ({
      value: typeof next === 'function' ? (next as (previous: T) => T)(current.value) : next,
      // An edit establishes new data, so any earlier read problem is resolved
      // from this component's point of view.
      hadReadError: false,
    }))
  }, [])

  useEffect(() => {
    // Never overwrite bytes that could not be read: doing so would destroy the
    // only copy of the student's data. An explicit edit clears `hadReadError`
    // in state, which re-enables writing. Gating on state rather than a
    // one-shot ref keeps this correct under StrictMode's double-invoked
    // effects.
    if (hadReadError) return

    try {
      const serialized = JSON.stringify(value)
      // Skip no-op writes. Several hooks can read the same key (for example
      // subjects from two pages), and rewriting an identical payload would let
      // a stale instance clobber a newer one.
      if (window.localStorage.getItem(key) === serialized) return
      window.localStorage.setItem(key, serialized)
      reportFailure(key, null)
    } catch (cause) {
      reportFailure(key, new StorageWriteError(key, cause))
    }
  }, [key, value, hadReadError])

  /**
   * Write now and report whether it actually landed.
   *
   * Mutations must not claim success before this resolves: the effect above
   * runs after commit, which is too late to report honestly. Callers compute
   * the next value from `readLive()` so a mutation never overwrites a newer
   * write with a stale snapshot, then the effect's no-op check skips the
   * redundant second write.
   */
  const persist = useCallback(
    (next: T): boolean => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
        reportFailure(key, null)
        return true
      } catch (cause) {
        reportFailure(key, new StorageWriteError(key, cause))
        return false
      }
    },
    [key],
  )

  /**
   * The authoritative current value, read straight from storage. Preferred over
   * the rendered snapshot when computing the next value for a mutation.
   *
   * Deliberately not memoised: `initialValue` is usually a fresh literal each
   * render, so a stable identity would require a ref write during render.
   */
  const readLive = (): T => readStoredValue(key, initialValue, validate).value

  // A read problem is surfaced too, so the student is told rather than being
  // quietly shown sample data.
  useEffect(() => {
    if (hadReadError) reportFailure(key, new StorageReadError(key))
  }, [hadReadError, key])

  const reset = useCallback((): boolean => {
    // Reset restores the seeded sample data, so it must also report whether
    // the replacement actually landed.
    const next = initialValue
    setState({ value: next, hadReadError: false })
    return persist(next)
  }, [persist, initialValue])

  return { value, setValue, reset, persist, readLive }
}

function readStoredValue<T>(
  key: string,
  initialValue: T,
  validate?: (value: unknown) => boolean,
): StorageRead<T> {
  if (typeof window === 'undefined') return { value: initialValue, hadReadError: false }

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(key)
  } catch {
    return { value: initialValue, hadReadError: false }
  }

  if (raw === null) return { value: initialValue, hadReadError: false }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { value: initialValue, hadReadError: true }
  }

  // A value that parses but is the wrong shape is just as unusable.
  if (validate && !validate(parsed)) {
    return { value: initialValue, hadReadError: true }
  }

  return { value: parsed as T, hadReadError: false }
}
