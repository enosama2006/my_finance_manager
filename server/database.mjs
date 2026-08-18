import { DatabaseSync } from 'node:sqlite'
import { dirname, relative, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

export const STORAGE_SCHEMA_VERSION = 1
export const DEFAULT_DATABASE_PATH = resolve(process.env.MYFINMAN_DB_PATH || 'data/myfinman.sqlite')

function assertFinanceState(state) {
  if (!state || typeof state !== 'object') throw new Error('FinanceState مفقودة')
  if (![4, 5].includes(state.schemaVersion)) throw new Error(`schemaVersion ${state.schemaVersion} غير مدعوم`)
  for (const key of ['parties', 'accounts', 'holdings', 'portfolios', 'portfolioSlices', 'ledger']) {
    if (!Array.isArray(state[key])) throw new Error(`FinanceState ناقصة: ${key}`)
  }
}

export function ensureDatabaseSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      schema_version INTEGER NOT NULL,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS migration_journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_schema_version INTEGER,
      to_schema_version INTEGER NOT NULL,
      source TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      note TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS export_checkpoints (
      id TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      state_json TEXT NOT NULL
    ) STRICT;

    PRAGMA user_version = ${STORAGE_SCHEMA_VERSION};
  `)
}

export function openMyFinManDatabase(databasePath = DEFAULT_DATABASE_PATH) {
  mkdirSync(dirname(databasePath), { recursive: true })
  const db = new DatabaseSync(databasePath, { timeout: 5000 })
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;')
  ensureDatabaseSchema(db)
  return db
}

export function readState(db) {
  const row = db.prepare('SELECT state_json FROM app_state WHERE singleton = 1').get()
  if (!row) return null
  return JSON.parse(row.state_json)
}

export function storageStatus(db, databasePath = DEFAULT_DATABASE_PATH) {
  const row = db.prepare('SELECT schema_version, updated_at FROM app_state WHERE singleton = 1').get()
  const journal = db.prepare('SELECT COUNT(*) AS count FROM migration_journal').get()
  return {
    engine: 'sqlite-file',
    databaseFile: relative(process.cwd(), databasePath).replaceAll('\\', '/'),
    storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    hasState: Boolean(row),
    financeSchemaVersion: row?.schema_version ?? null,
    updatedAt: row?.updated_at ?? null,
    migrationCount: Number(journal?.count ?? 0),
  }
}

export function writeState(db, state, updatedAt = new Date().toISOString()) {
  assertFinanceState(state)
  const statement = db.prepare(`
    INSERT INTO app_state(singleton, schema_version, state_json, updated_at)
    VALUES(1, ?, ?, ?)
    ON CONFLICT(singleton) DO UPDATE SET
      schema_version = excluded.schema_version,
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `)
  statement.run(state.schemaVersion, JSON.stringify(state), updatedAt)
}

export function migrateState(db, state, source = 'legacy-browser', note = 'Explicit user migration to file-backed SQLite.') {
  assertFinanceState(state)
  if (readState(db)) {
    const error = new Error('قاعدة SQLite تحتوي بيانات بالفعل؛ تم رفض الترحيل لمنع الاستبدال غير المقصود.')
    error.code = 'SQLITE_ALREADY_INITIALIZED'
    throw error
  }

  db.exec('BEGIN IMMEDIATE')
  try {
    writeState(db, state)
    db.prepare(`
      INSERT INTO migration_journal(from_schema_version, to_schema_version, source, applied_at, note)
      VALUES(?, ?, ?, ?, ?)
    `).run(state.schemaVersion, state.schemaVersion, source, new Date().toISOString(), note)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function createExportCheckpoint(db, id, state, createdAt = new Date().toISOString()) {
  assertFinanceState(state)
  db.prepare(`
    INSERT OR REPLACE INTO export_checkpoints(id, schema_version, created_at, state_json)
    VALUES(?, ?, ?, ?)
  `).run(id, state.schemaVersion, createdAt, JSON.stringify(state))
}

export function clearState(db) {
  db.exec('BEGIN IMMEDIATE')
  try {
    db.exec('DELETE FROM app_state;')
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
