/**
 * Vitest setup: DOM matchers and theme cleanup.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import { resetStorageErrors } from '../hooks/useLocalStorage'

afterEach(() => {
  cleanup()
  localStorage.clear()
  // Storage failures are aggregated in module state, so a spec that simulates a
  // quota error must not leak into the next one.
  resetStorageErrors()
})

// jsdom does not implement matchMedia; stub it so theme code does not crash.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})