export type AssetKind = 'cash' | 'currency' | 'metal' | 'fund' | 'stock' | 'real_estate' | 'other'
export type TransactionKind = 'income' | 'expense' | 'real_transfer' | 'reallocation' | 'conversion' | 'reconciliation'
export type IncomeStatus = 'expected' | 'received' | 'late' | 'missed'

export interface Party {
  id: string
  name: string
  type: 'person' | 'bank' | 'broker' | 'institution' | 'self'
}

export interface OwnershipShare {
  ownerId: string
  quantity: number
}

export interface Holding {
  id: string
  symbol: string
  name: string
  kind: AssetKind
  nativeUnit: string
  quantity: number
  marketPriceSar: number
  averageCostSar: number
  container: string
  custodianId: string
  location: string
  ownership: OwnershipShare[]
  archived?: boolean
}

export interface Allocation {
  id: string
  name: string
  amountSar: number
  fundedSar: number
  ownerId: string
  sourceHoldingIds: string[]
  group: 'essential' | 'monthly' | 'emergency' | 'saving' | 'investment'
}

export interface LedgerTransaction {
  id: string
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
  realizedGainLossSar?: number
  note?: string
}

export interface IncomeStream {
  id: string
  name: string
  amountSar: number
  dueDay: number
  targetHoldingId: string
  status: IncomeStatus
}

export interface FinanceState {
  parties: Party[]
  holdings: Holding[]
  allocations: Allocation[]
  ledger: LedgerTransaction[]
  incomeStreams: IncomeStream[]
}

export interface ConversionInput {
  sourceHoldingId: string
  targetSymbol: string
  targetName: string
  targetKind: AssetKind
  targetUnit: string
  sourceQuantity: number
  targetQuantity: number
  targetUnitValueSarAtExecution: number
  feesSar: number
  ownerId: string
  targetContainer: string
  targetCustodianId: string
  targetLocation: string
}
