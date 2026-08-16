import type { FinanceState } from '../domain/types'
import type { FinanceRepository } from './repository'

const STORAGE_KEY = 'myfinman-foundation-v4'

export function createLocalStorageFinanceRepository(storage: Storage = window.localStorage): FinanceRepository {
  return {
    load() {
      try {
        const raw = storage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<FinanceState>
        return parsed.schemaVersion === 4 ? parsed as FinanceState : null
      } catch {
        return null
      }
    },
    save(state) {
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
    clear() {
      storage.removeItem(STORAGE_KEY)
    },
  }
}
