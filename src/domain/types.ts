export type AssetKind = 'cash' | 'metal' | 'collectible' | 'fund' | 'stock' | 'crypto' | 'real_estate' | 'vehicle' | 'fixed_term' | 'receivable' | 'other'
export type AssetGroup = 'cash_and_equivalents' | 'investments' | 'real_estate' | 'other'
export type AccountKind = 'checking' | 'saving' | 'investment' | 'cash_container' | 'prepaid' | 'custody' | 'fixed_term' | 'credit_card'
export type AccountStatus = 'active' | 'closed' | 'archived'
export type AccountGroupStatus = 'active' | 'archived'
export type PortfolioStatus = 'active' | 'closed' | 'archived'
export type PortfolioProfile = 'spending_budget' | 'commitment' | 'savings_goal' | 'reserve' | 'investment' | 'deal'
export type TransactionStatus = 'draft' | 'posted' | 'voided'
export type TransactionKind = 'opening' | 'income' | 'expense' | 'real_transfer' | 'asset_purchase' | 'asset_sale' | 'conversion' | 'allocation_settlement' | 'ownership_event' | 'liability_creation' | 'liability_payment' | 'reconciliation' | 'refund'
export type IncomeStatus = 'expected' | 'received' | 'late' | 'missed'
export type ValuationMethod = 'nominal' | 'fx' | 'market_quote' | 'manual_appraisal' | 'contractual' | 'cost_fallback' | 'unvalued'
export type PerformanceRole = 'transactional_cash' | 'bridge' | 'investment' | 'store_of_value'
export type PositionStatus = 'open' | 'partially_disposed' | 'closed'
export type CapitalCycleStatus = 'open' | 'partially_settled' | 'ready_to_close' | 'closed' | 'cancelled'
export type CapitalCycleKind = 'investment_round' | 'commercial_operation' | 'commitment_period' | 'savings_period' | 'fixed_term_round'
export type ExpenseCategoryStatus = 'active' | 'archived'
export type ExpenseNecessity = 'obligation' | 'essential' | 'flexible' | 'discretionary'
export type ExpenseBeneficiaryStatus = 'active' | 'archived'
export type ExpenseBeneficiaryKind = 'person' | 'group'

export interface Party {
  id: string
  name: string
  type: 'person' | 'bank' | 'broker' | 'institution' | 'home' | 'place' | 'self'
}

/** The only hierarchy/container in the wealth tree. */
export interface AccountGroup {
  id: string
  name: string
  parentId?: string
  status: AccountGroupStatus
  description?: string
  createdAt: string
}
export type WealthGroup = AccountGroup

/** LEGACY schema-v4 entity. New user flows do not create or require Account. */
export interface Account {
  id: string
  name: string
  kind: AccountKind
  groupId?: string
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

export interface OwnershipShare { id?: string; ownerId: string; quantity: number }
/**
 * Quantity + totalCostBasisSar are the canonical financial facts for a known-basis lot.
 * unitCostSar is retained for backwards compatibility and UI convenience, but must not be
 * rounded before persistence. Old snapshots without totalCostBasisSar remain readable.
 */
export interface CostBasisLot {
  id: string
  ownerId: string
  quantity: number
  unitCostSar?: number
  totalCostBasisSar?: number
  sourceTransactionId?: string
  acquiredAt?: string
}

/** Canonical financial entity. It never contains another Asset; only Groups contain Assets. */
export interface Holding {
  id: string
  symbol: string
  name: string
  kind: AssetKind
  assetTypeId?: string
  nativeUnit: string
  quantity: number
  marketPriceSar: number
  costLots: CostBasisLot[]
  valuationMethod: ValuationMethod
  valuationSource?: string
  valuedAt?: string
  groupId?: string
  accountId?: string
  custodianId?: string
  accountKind?: AccountKind
  currency?: string
  last4?: string
  institutionName?: string
  description?: string
  location?: string
  ownership: OwnershipShare[]
  archived?: boolean
  performanceRole?: PerformanceRole
  positionId?: string
  acquisitionJourney?: string[]
}
export type Asset = Holding

export interface Portfolio {
  id: string
  name: string
  parentId?: string
  ownerIds: string[]
  beneficiaryId?: string
  purpose?: string
  targetValueSar?: number
  status: PortfolioStatus
  profile?: PortfolioProfile
  dueDate?: string
  settlementAssetSymbol?: string
  protectionMode?: 'flexible' | 'designated' | 'hard_reserved' | 'instrument_bound'
}

export interface PortfolioSlice { id: string; portfolioId: string; holdingId: string; ownerId: string; quantity: number }

export interface ExpenseCategory {
  id: string
  name: string
  parentId?: string
  status: ExpenseCategoryStatus
  description?: string
  defaultNecessity?: ExpenseNecessity
  createdAt: string
}

export interface ExpenseBeneficiary {
  id: string
  name: string
  kind: ExpenseBeneficiaryKind
  status: ExpenseBeneficiaryStatus
  description?: string
  createdAt: string
}

export interface Position {
  id: string
  name: string
  ownerId: string
  portfolioId?: string
  cycleId?: string
  holdingIds: string[]
  openedAt: string
  closedAt?: string
  status: PositionStatus
  performanceRole: PerformanceRole
  initialCostBasisSar: number
  realizedGainLossSar: number
  note?: string
}

export interface CapitalCycle {
  id: string
  name: string
  ownerId: string
  portfolioId?: string
  kind: CapitalCycleKind
  status: CapitalCycleStatus
  openedAt: string
  closedAt?: string
  capitalInputSar: number
  realizedGainsSar: number
  realizedLossesSar: number
  directCostsSar: number
  openObligationSar: number
  transactionIds: string[]
  positionIds: string[]
  nativeResultAmount?: number
  nativeResultCurrency?: string
  reportingResultSar?: number
  note?: string
}

/** Exact user-entered purchase intent used by correction/reprojection. */
export interface AssetPurchaseUserInput {
  kind: 'asset_purchase'
  sourceHoldingId: string
  sourceAccountId?: string
  ownerId: string
  amountPaid: number
  /** Explicit existing Asset selected for DCA/repeated purchase. Absent means create a new Asset. */
  targetAssetId?: string
  targetGroupId?: string
  targetAccountId?: string
  assetTypeId: string
  name: string
  symbol?: string
  quantity: number
  extraCostsSar?: number
  portfolioId?: string
  /** Exact native source quantity restored to the source Portfolio when this purchase is reversed. */
  sourcePortfolioQuantityConsumed?: number
  location?: string
  marketUnitPriceSar?: number
  marketSource?: string
}

/** Exact user-entered conversion intent. Needed to reverse/replay portfolio funding correctly. */
export interface ConversionUserInput {
  kind: 'conversion'
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
  targetGroupId?: string
  targetLocation?: string
}

export type TransactionUserInput = AssetPurchaseUserInput | ConversionUserInput

export interface TransactionRevision {
  version: number
  changedAt: string
  reason: string
  snapshot: {
    at: string
    title: string
    amountSar: number
    /** Historical/acquisition basis when known; null means explicitly unknown. */
    costBasisSar?: number | null
    ownerId: string
    sourceHoldingId?: string
    targetHoldingId?: string
    sourceQuantity?: number
    targetQuantity?: number
    exchangeRate?: number
    feesSar?: number
    realizedGainLossSar?: number | null
    note?: string
    portfolioId?: string
    expenseCategoryId?: string
    expenseNecessity?: ExpenseNecessity
    expenseBeneficiaryId?: string
    userInput?: TransactionUserInput
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
  /** Reporting/event value in SAR. It is not implicitly the historical basis. */
  amountSar: number
  /** Historical/acquisition basis when the event defines one; null = explicitly unknown. */
  costBasisSar?: number | null
  ownerId: string
  sourceHoldingId?: string
  targetHoldingId?: string
  sourceQuantity?: number
  targetQuantity?: number
  exchangeRate?: number
  feesSar?: number
  realizedGainLossSar?: number | null
  note?: string
  portfolioId?: string
  expenseCategoryId?: string
  expenseNecessity?: ExpenseNecessity
  expenseBeneficiaryId?: string
  cycleId?: string
  positionId?: string
  userInput?: TransactionUserInput
}

export interface IncomeStream { id: string; name: string; amountSar: number; dueDay: number; targetHoldingId: string; ownerId: string; status: IncomeStatus }
export interface Liability { id: string; name: string; ownerId: string; accountId?: string; amountSar: number; kind: 'credit_card' | 'loan' | 'other'; status: 'open' | 'closed' }
export interface Claim { id: string; creditorOwnerId: string; debtorPartyId: string; symbol: string; nativeUnit: string; quantity: number; unitValueSar: number; status: 'open' | 'settled' }

export interface FinanceState {
  schemaVersion: 4 | 5
  costBasisMethod: 'weighted_average'
  parties: Party[]
  /** Wealth groups. Historical property name retained for import compatibility. */
  accountGroups?: AccountGroup[]
  /** Legacy only. New assets are not required to belong to accounts. */
  accounts: Account[]
  /** Canonical assets. Historical property name retained for compatibility. */
  holdings: Holding[]
  portfolios: Portfolio[]
  portfolioSlices: PortfolioSlice[]
  expenseCategories?: ExpenseCategory[]
  expenseBeneficiaries?: ExpenseBeneficiary[]
  ledger: LedgerTransaction[]
  incomeStreams: IncomeStream[]
  liabilities: Liability[]
  claims: Claim[]
  positions?: Position[]
  capitalCycles?: CapitalCycle[]
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
  targetGroupId?: string
  targetAccountId?: string
  targetCustodianId?: string
  targetLocation?: string
}
