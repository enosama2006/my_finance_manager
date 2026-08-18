import type { FinanceState } from '../domain/types'

/**
 * Persistence is asynchronous because the primary browser store is SQLite persisted through IndexedDB.
 * Domain/application commands remain synchronous and pure; only durable I/O is async.
 */
export interface FinanceRepository {
  load(): Promise<FinanceState | null>
  save(state: FinanceState): Promise<void>
  clear(): Promise<void>
}
