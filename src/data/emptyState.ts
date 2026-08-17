import type { FinanceState } from '../domain/types'
import { SELF_ID } from './seed'

export const emptyState: FinanceState = {
  schemaVersion: 4,
  costBasisMethod: 'weighted_average',
  parties: [{ id: SELF_ID, name: 'أنا', type: 'self' }],
  accounts: [],
  holdings: [],
  portfolios: [],
  portfolioSlices: [],
  expenseCategories: [],
  ledger: [],
  incomeStreams: [],
  liabilities: [],
  claims: [],
  positions: [],
  capitalCycles: [],
}
