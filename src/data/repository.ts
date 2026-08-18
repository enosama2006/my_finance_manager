import type { FinanceState } from '../domain/types'

/**
 * Durable persistence is asynchronous because the browser talks to a local MyFinMan API,
 * which owns the real file-backed SQLite database on disk.
 * Domain/application commands remain synchronous and pure; only durable I/O is async.
 */
export interface FinanceRepository {
  load(): Promise<FinanceState | null>
  save(state: FinanceState): Promise<void>
  clear(): Promise<void>
}
