import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { migrateState, openMyFinManDatabase, readState, storageStatus, writeState } from './database.mjs'

const fixture = {
  schemaVersion: 5,
  costBasisMethod: 'weighted_average',
  parties: [{ id: 'party-self', name: 'أنا', type: 'self' }],
  accountGroups: [],
  accounts: [],
  holdings: [],
  portfolios: [],
  portfolioSlices: [],
  expenseCategories: [],
  expenseBeneficiaries: [],
  ledger: [],
  incomeStreams: [],
  liabilities: [],
  claims: [],
  positions: [],
  capitalCycles: [],
}

test('file-backed SQLite survives close/reopen and records explicit migration', () => {
  const dir = mkdtempSync(join(tmpdir(), 'myfinman-sqlite-'))
  const file = join(dir, 'myfinman.sqlite')
  try {
    let db = openMyFinManDatabase(file)
    assert.equal(storageStatus(db, file).hasState, false)
    migrateState(db, fixture, 'test-fixture', 'test migration')
    assert.deepEqual(readState(db), fixture)
    assert.equal(storageStatus(db, file).migrationCount, 1)
    assert.throws(() => migrateState(db, fixture), /تحتوي بيانات بالفعل/)
    db.close()

    db = openMyFinManDatabase(file)
    assert.deepEqual(readState(db), fixture)
    const updated = { ...fixture, claims: [{ id: 'claim-1' }] }
    writeState(db, updated, '2026-08-18T17:00:00.000Z')
    assert.deepEqual(readState(db), updated)
    db.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
