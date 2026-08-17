import type { Account, FinanceState, Holding } from '../domain/types'
import type { FinanceRepository } from './repository'

// New user-data namespace: intentionally does not reuse the old demo-seeded storage key.
const STORAGE_KEY = 'myfinman-user-foundation-v1'

type LegacyFinanceStateV4 = Omit<FinanceState, 'accounts' | 'holdings'> & {
  accounts: Array<Omit<Account, 'kind'> & { kind: Account['kind'] | 'cash' }>
  holdings: Array<Omit<Holding, 'kind'> & { kind: Holding['kind'] | 'currency' }>
}

function migrateCashModel(parsed: LegacyFinanceStateV4): FinanceState {
  const accounts: Account[] = parsed.accounts.map((account) => ({
    ...account,
    kind: account.kind === 'cash' ? 'cash_container' : account.kind,
  }))
  const holdings: Holding[] = parsed.holdings.map((holding) => ({
    ...holding,
    kind: holding.kind === 'currency' ? 'cash' : holding.kind,
  }))

  return { ...parsed, accounts, holdings, expenseCategories: parsed.expenseCategories ?? [] }
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
