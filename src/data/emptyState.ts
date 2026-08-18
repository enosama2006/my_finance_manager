import type { FinanceState } from '../domain/types'
import { SELF_ID } from './seed'

export const emptyState: FinanceState = {
  schemaVersion: 5,
  costBasisMethod: 'weighted_average',
  parties: [{ id: SELF_ID, name: 'أنا', type: 'self' }],
  accountGroups: [],
  accounts: [],
  holdings: [],
  portfolios: [],
  portfolioSlices: [],
  expenseCategories: [],
  expenseBeneficiaries: [],
  ledger: [],
  incomeStreams: [],
  liabilities: [],
  claims: [],
  positions: [],
  capitalCycles: [],
}
