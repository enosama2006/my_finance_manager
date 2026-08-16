import type { FinanceState } from '../domain/types'

export interface FinanceRepository {
  load(): FinanceState | null
  save(state: FinanceState): void
  clear(): void
}
