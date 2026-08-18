import { describe, expect, it } from 'vitest'
import { emptyState } from '../src/data/emptyState'
import { parseLegacyLocalStorageState } from '../src/data/localStorageRepository'
import { createMigrationMarkdown, createSnapshot, parseSnapshot } from '../src/data/snapshot'

describe('schema-safe persistence and migration snapshots', () => {
  it('loads schema v5 from the legacy LocalStorage shape instead of treating it as missing', () => {
    const parsed = parseLegacyLocalStorageState(JSON.stringify(emptyState))
    expect(parsed).not.toBeNull()
    expect(parsed?.schemaVersion).toBe(5)
    expect(parsed?.parties[0]?.id).toBe('party-self')
  })

  it('still accepts schema v4 as a migration source', () => {
    const v4 = { ...emptyState, schemaVersion: 4 as const }
    const parsed = parseLegacyLocalStorageState(JSON.stringify(v4))
    expect(parsed?.schemaVersion).toBe(4)
  })

  it('round-trips the full FinanceState through Markdown without losing structure', () => {
    const exportedAt = '2026-08-18T16:00:00.000Z'
    const markdown = createMigrationMarkdown(emptyState, exportedAt)
    expect(markdown).toContain('myfinmanFormat: myfinman-migration-snapshot')
    expect(markdown).toContain('## Machine-readable snapshot')
    expect(parseSnapshot(markdown)).toEqual(emptyState)
  })

  it('keeps old JSON snapshot imports supported', () => {
    const raw = JSON.stringify(createSnapshot(emptyState, '2026-08-18T16:00:00.000Z'))
    expect(parseSnapshot(raw)).toEqual(emptyState)
  })
})
