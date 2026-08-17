import type { FinanceState } from '../domain/types'
import type { FinanceRepository } from './repository'

const STORAGE_KEY = 'myfinman-foundation-v4'

type LegacyFinanceStateV4 = Omit<FinanceState, 'accounts' | 'holdings'> & {
  accounts: Array<Omit<FinanceState['accounts'][number], 'kind'> & { kind: FinanceState['accounts'][number]['kind'] | 'cash' }>
  holdings: Array<Omit<FinanceState['holdings'][number], 'kind'> & { kind: FinanceState['holdings'][number]['kind'] | 'currency' }>
}

function migrateCashModel(parsed: LegacyFinanceStateV4): FinanceState {
  return {
    ...parsed,
    accounts: parsed.accounts.map(account => account.kind === 'cash' ? { ...account, kind: 'cash_container' as const } : account),
    holdings: parsed.holdings.map(holding => holding.kind === 'currency' ? { ...holding, kind: 'cash' as const } : holding),
  }
}

export function createLocalStorageFinanceRepository(storage: Storage = window.localStorage): FinanceRepository {
  return {
    load() {
      try {
        const raw = storage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as LegacyFinanceStateV4
        if (parsed.schemaVersion !== 4) return null
        const migrated = migrateCashModel(parsed)
        storage.setItem(STORAGE_KEY, JSON.stringify(migrated))
        return migrated
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
