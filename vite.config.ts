import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.test.{ts,tsx}'],
    globals: true,
    // Vitest defaults to one worker per CPU. Each worker runs a full jsdom
    // environment, and on a memory-constrained machine (as little as ~1 GB
    // free with 8 cores) the workers starve each other: individual tests
    // stretch past the 5s default and the suite fails intermittently.
    // Capping workers keeps a worker per file stable and reproducible.
    maxWorkers: 2,
  },
})