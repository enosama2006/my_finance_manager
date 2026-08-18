import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { FinanceState } from '../domain/types'
import type { FinanceRepository } from './repository'
import { createLocalStorageFinanceRepository } from './localStorageRepository'

const IDB_NAME = 'myfinman-sqlite-storage-v1'
const IDB_STORE = 'files'
const SQLITE_FILE_KEY = 'myfinman.sqlite'
const SQLITE_STORAGE_SCHEMA_VERSION = 1

export interface SqliteBinaryStore {
  load(): Promise<Uint8Array | null>
  save(bytes: Uint8Array): Promise<void>
  clear(): Promise<void>
}

export function createIndexedDbSqliteBinaryStore(): SqliteBinaryStore {
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('تعذر فتح IndexedDB'))
  })

  const transact = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore, done: (value: T) => void, fail: (error: unknown) => void) => void) => {
    const db = await open()
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, mode)
        const store = tx.objectStore(IDB_STORE)
        fn(store, resolve, reject)
        tx.onerror = () => reject(tx.error ?? new Error('فشل حفظ قاعدة البيانات'))
      })
    } finally {
      db.close()
    }
  }

  return {
    async load() {
      return transact<Uint8Array | null>('readonly', (store, done, fail) => {
        const request = store.get(SQLITE_FILE_KEY)
        request.onsuccess = () => {
          const value = request.result
          if (!value) { done(null); return }
          if (value instanceof Uint8Array) { done(value); return }
          if (value instanceof ArrayBuffer) { done(new Uint8Array(value)); return }
          fail(new Error('صيغة ملف SQLite المخزنة غير مدعومة'))
        }
        request.onerror = () => fail(request.error)
      })
    },
    async save(bytes) {
      await transact<void>('readwrite', (store, done, fail) => {
        const request = store.put(bytes, SQLITE_FILE_KEY)
        request.onsuccess = () => done()
        request.onerror = () => fail(request.error)
      })
    },
    async clear() {
      await transact<void>('readwrite', (store, done, fail) => {
        const request = store.delete(SQLITE_FILE_KEY)
        request.onsuccess = () => done()
        request.onerror = () => fail(request.error)
      })
    },
  }
}

let sqlPromise: Promise<SqlJsStatic> | null = null
function loadSqlJs() {
  if (!sqlPromise) sqlPromise = initSqlJs({ locateFile: () => wasmUrl })
  return sqlPromise
}

export function ensureSqliteSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS app_state (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      schema_version INTEGER NOT NULL,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS migration_journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_schema_version INTEGER,
      to_schema_version INTEGER NOT NULL,
      source TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS export_checkpoints (
      id TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      state_json TEXT NOT NULL
    );
    PRAGMA user_version = ${SQLITE_STORAGE_SCHEMA_VERSION};
  `)
}

export function readFinanceStateFromSqlite(db: Database): FinanceState | null {
  const statement = db.prepare('SELECT state_json FROM app_state WHERE singleton = 1')
  try {
    if (!statement.step()) return null
    const value = statement.getAsObject().state_json
    if (typeof value !== 'string') return null
    return JSON.parse(value) as FinanceState
  } finally {
    statement.free()
  }
}

export function writeFinanceStateToSqlite(db: Database, state: FinanceState, updatedAt = new Date().toISOString()) {
  db.run(
    `INSERT INTO app_state(singleton, schema_version, state_json, updated_at)
     VALUES(1, ?, ?, ?)
     ON CONFLICT(singleton) DO UPDATE SET
       schema_version = excluded.schema_version,
       state_json = excluded.state_json,
       updated_at = excluded.updated_at`,
    [state.schemaVersion, JSON.stringify(state), updatedAt],
  )
}

function recordMigration(db: Database, fromVersion: number | null, toVersion: number, source: string, note: string) {
  db.run(
    'INSERT INTO migration_journal(from_schema_version, to_schema_version, source, applied_at, note) VALUES(?, ?, ?, ?, ?)',
    [fromVersion, toVersion, source, new Date().toISOString(), note],
  )
}

export function createBrowserSqliteFinanceRepository(
  binaryStore: SqliteBinaryStore = createIndexedDbSqliteBinaryStore(),
  legacyRepository: FinanceRepository = createLocalStorageFinanceRepository(),
): FinanceRepository {
  let writeQueue: Promise<void> = Promise.resolve()

  const withDatabase = async <T>(work: (db: Database) => Promise<T> | T): Promise<T> => {
    const SQL = await loadSqlJs()
    const bytes = await binaryStore.load()
    const db = new SQL.Database(bytes ?? undefined)
    try {
      ensureSqliteSchema(db)
      const result = await work(db)
      await binaryStore.save(db.export())
      return result
    } finally {
      db.close()
    }
  }

  const enqueueWrite = async (work: () => Promise<void>) => {
    const task = writeQueue.then(work)
    writeQueue = task.catch(() => undefined)
    await task
  }

  return {
    async load() {
      await writeQueue
      try {
        return await withDatabase(async (db) => {
          const sqliteState = readFinanceStateFromSqlite(db)
          if (sqliteState) return sqliteState

          const legacyState = await legacyRepository.load()
          if (!legacyState) return null
          writeFinanceStateToSqlite(db, legacyState)
          recordMigration(db, legacyState.schemaVersion, legacyState.schemaVersion, 'localStorage', 'Initial non-destructive import from legacy browser storage into SQLite.')
          return legacyState
        })
      } catch (error) {
        console.warn('SQLite load failed; using legacy browser storage as recovery fallback.', error)
        return legacyRepository.load()
      }
    },

    async save(state) {
      await enqueueWrite(async () => {
        try {
          await withDatabase((db) => writeFinanceStateToSqlite(db, state))
          // Transitional recovery mirror. SQLite is always read first and is the canonical store.
          await legacyRepository.save(state)
        } catch (error) {
          console.warn('SQLite save failed; preserving state in legacy recovery storage.', error)
          await legacyRepository.save(state)
        }
      })
    },

    async clear() {
      await enqueueWrite(async () => {
        await Promise.allSettled([binaryStore.clear(), legacyRepository.clear()])
      })
    },
  }
}
