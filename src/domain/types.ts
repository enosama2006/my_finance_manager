export type AssetKind = 'cash' | 'metal' | 'collectible' | 'fund' | 'stock' | 'crypto' | 'real_estate' | 'fixed_term' | 'receivable' | 'other'
export type AssetGroup = 'cash_and_equivalents' | 'investments' | 'real_estate' | 'other'
export type AccountKind = 'checking' | 'saving' | 'investment' | 'cash_container' | 'prepaid' | 'custody' | 'fixed_term' | 'credit_card'
export type AccountStatus = 'active' | 'closed' | 'archived'
export type PortfolioStatus = 'active' | 'closed' | 'archived'
export type TransactionStatus = 'draft' | 'posted'
export type TransactionKind = 'opening' | 'income' | 'expense' | 'real_transfer' | 'asset_purchase' | 'asset_sale' | 'conversion' | 'allocation_settlement' | 'ownership_event' | 'liability_creation' | 'liability_payment' | 'reconciliation' | 'refund'
export type IncomeStatus = 'expected' | 'received' | 'late' | 'missed'
export type ValuationMethod = 'nominal' | 'fx' | 'market_quote' | 'manual_appraisal' | 'contractual' | 'cost_fallback' | 'unvalued'

export interface Party {
  id: string
  name: string
  type: 'person' | 'bank' | 'broker' | 'institution' | 'self'
}

export interface Account {
  id: string
  name: string
  kind: AccountKind
  custodianId: string
  institutionId?: string
  currency?: string
  last4?: string
  status: AccountStatus
  openingBalanceSar?: number
  openingAt?: string
  observedBalanceSar?: number
  observedAt?: string
}

export interface OwnershipShare {
  ownerId: string
  quantity: number
}

export interface CostBasisLot {
  id: string
  ownerId: string
  quantity: number
  unitCostSar?: number
  acquiredAt?: string
}

export interface Holding {
  id: string
  symbol: string
  name: string
  kind: AssetKind
  nativeUnit: string
  quantity: number
  marketPriceSar: number
  costLots: CostBasisLot[]
  valuationMethod: ValuationMethod
  valuationSource?: string
  valuedAt?: string
  accountId: string
  custodianId: string
  location?: string
  ownership: OwnershipShare[]
  archived?: boolean
}

export interface Portfolio {
  id: string
  name: string
  parentId?: string
  ownerIds: string[]
  beneficiaryId?: string
  purpose?: string
  targetValueSar?: number
  status: PortfolioStatus
}

export interface PortfolioSlice {
  id: string
  portfolioId: string
  holdingId: string
  ownerId: string
  quantity: number
}

export interface TransactionRevision {
  version: number
  changedAt: string
  reason: string
  snapshot: {
    at: string
    title: string
    amountSar: number
    ownerId: string
    sourceHoldingId?: string
    targetHoldingId?: string
    sourceQuantity?: number
    targetQuantity?: number
    exchangeRate?: number
    feesSar?: number
    realizedGainLossSar?: number | null
    note?: string
  }
}

export interface LedgerTransaction {
  id: string
  version: number
  status: TransactionStatus
  revisions: TransactionRevision[]
  at: string
  kind: TransactionKind
  title: string
  amountSar: number
  ownerId: string
  sourceHoldingId?: string
  targetHoldingId?: string
  sourceQuantity?: number
  targetQuantity?: number
  exchangeRate?: number
  feesSar?: number
  realizedGainLossSar?: number | null
  note?: string
}

export interface IncomeStream {
  id: string
  name: string
  amountSar: number
  dueDay: number
  targetHoldingId: string
  ownerId: string
  status: IncomeStatus
}

export interface Liability {
  id: string
  name: string
  ownerId: string
  accountId?: string
  amountSar: number
  kind: 'credit_card' | 'loan' | 'other'
  status: 'open' | 'closed'
}

export interface Claim {
  id: string
  creditorOwnerId: string
  debtorPartyId: string
  symbol: string
  nativeUnit: string
  quantity: number
  unitValueSar: number
  status: 'open' | 'settled'
}

export interface FinanceState {
  schemaVersion: 4
  costBasisMethod: 'weighted_average'
  parties: Party[]
  accounts: Account[]
  holdings: Holding[]
  portfolios: Portfolio[]
  portfolioSlices: PortfolioSlice[]
  ledger: LedgerTransaction[]
  incomeStreams: IncomeStream[]
  liabilities: Liability[]
  claims: Claim[]
}

export interface ConversionInput {
  sourceHoldingId: string
  sourcePortfolioId?: string
  targetPortfolioId?: string
  targetSymbol: string
  targetName: string
  targetKind: AssetKind
  targetUnit: string
  sourceQuantity: number
  targetQuantity: number
  targetUnitValueSarAtExecution: number
  feesSar: number
  ownerId: string
  targetAccountId: string
  targetCustodianId: string
  targetLocation?: string
}
