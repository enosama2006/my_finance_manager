/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
  test: {
    // The invariant gate is a separate signal from the prototype's behavioural tests.
    // It runs via `npm run test:invariants`. See docs/spec/quality/invariant-gate.md
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/invariants/**'],
  },
})
