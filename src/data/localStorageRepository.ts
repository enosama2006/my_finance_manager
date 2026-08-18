import type { Account, FinanceState, Holding } from '../domain/types'
import type { FinanceRepository } from './repository'

// Legacy browser namespace retained as a non-destructive migration source.
export const LEGACY_STORAGE_KEY = 'myfinman-user-foundation-v1'

type LegacyFinanceState = Omit<FinanceState, 'accounts' | 'holdings'> & {
  accounts: Array<Omit<Account, 'kind'> & { kind: Account['kind'] | 'cash' }>
  holdings: Array<Omit<Holding, 'kind'> & { kind: Holding['kind'] | 'currency' }>
}

function migrateCashModel(parsed: LegacyFinanceState): FinanceState {
  const accounts: Account[] = parsed.accounts.map((account) => ({ ...account, kind: account.kind === 'cash' ? 'cash_container' : account.kind }))
  const holdings: Holding[] = parsed.holdings.map((holding) => ({ ...holding, kind: holding.kind === 'currency' ? 'cash' : holding.kind }))
  return { ...parsed, accounts, holdings, expenseCategories: parsed.expenseCategories ?? [], expenseBeneficiaries: parsed.expenseBeneficiaries ?? [], positions: parsed.positions ?? [], capitalCycles: parsed.capitalCycles ?? [] }
}

export function parseLegacyLocalStorageState(raw: string): FinanceState | null {
  try {
    const parsed = JSON.parse(raw) as LegacyFinanceState
    if (parsed.schemaVersion !== 4 && parsed.schemaVersion !== 5) return null
    if (!Array.isArray(parsed.parties) || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.holdings) || !Array.isArray(parsed.ledger)) return null
    return migrateCashModel(parsed)
  } catch {
    return null
  }
}

export function createLocalStorageFinanceRepository(storage: Storage = window.localStorage): FinanceRepository {
  return {
    async load() {
      const raw = storage.getItem(LEGACY_STORAGE_KEY)
      return raw ? parseLegacyLocalStorageState(raw) : null
    },
    async save(state) { storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state)) },
    async clear() { storage.removeItem(LEGACY_STORAGE_KEY) },
  }
}
