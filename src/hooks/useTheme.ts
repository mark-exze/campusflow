import { useCallback, useEffect, useState } from 'react'

import { DEFAULT_THEME, STORAGE_KEYS } from '../lib/constants'
import type { Theme } from '../types'

export type ResolvedTheme = 'light' | 'dark'

/** Cycle order used by the "next theme" control. */
export const THEME_ORDER: readonly Theme[] = ['light', 'dark', 'system']

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.theme)
    return isTheme(raw) ? raw : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  const query = window.matchMedia?.('(prefers-color-scheme: dark)')
  return query?.matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

/**
 * Theme state with light / dark / system modes.
 *
 * The resolved theme is applied to <html> as the `dark` class, which Tailwind
 * uses for all dark: variants, and mirrored into `color-scheme` so native
 * form controls and scrollbars match.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  // The resolved theme is derived during render rather than stored, so the
  // effect only touches the DOM and never triggers a cascading re-render.
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  // Follow OS changes while in "system" mode.
  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(query.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (resolveTheme(current) === 'dark' ? 'light' : 'dark'))
  }, [])

  const cycleTheme = useCallback(() => {
    setTheme((current) => {
      const index = THEME_ORDER.indexOf(current)
      return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? 'system'
    })
  }, [])

  return { theme, resolvedTheme, setTheme, toggleTheme, cycleTheme }
}