/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'

/**
 * Invariant gate configuration.
 *
 * Kept separate from vite.config.ts so the two signals never blend:
 *   npm test              -> behavioural suite of the disposable prototype
 *   npm run test:invariants -> specification invariants that must survive the rebuild
 *
 * See docs/spec/quality/invariant-gate.md
 */
export default defineConfig({
  test: {
    include: ['tests/invariants/**/*.test.ts'],
  },
})
