import { availableQuantity, ownerQuantity, ownerWeightedAverageCostSar, round2 } from '../domain/finance'
import type { Account, AccountKind, AssetKind, FinanceState, Holding, LedgerTransaction, PerformanceRole, PortfolioProfile, ValuationMethod } from '../domain/types'

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const now = () => new Date().toISOString()

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} يجب أن يكون أكبر من صفر`)
}

function accountOf(state: FinanceState, accountId: string): Account {
  const account = state.accounts.find(a => a.id === accountId && a.status === 'active')
  if (!account) throw new Error('الحساب غير موجود أو غير نشط')
  return account
}

function baseTx(kind: LedgerTransaction['kind'], title: string, amountSar: number, ownerId: string): LedgerTransaction {
  return { id: id('tx'), version: 1, status: 'posted', revisions: [], at: now(), kind, title, amountSar: round2(amountSar), ownerId }
}

function appendTx(state: FinanceState, tx: LedgerTransaction): FinanceState {
  return { ...state, ledger: [tx, ...state.ledger] }
}

function reduceOwnerLots(holding: Holding, ownerId: string, quantity: number) {
  const lots = holding.costLots.filter(l => l.ownerId === ownerId)
  const total = lots.reduce((sum, lot) => sum + lot.quantity, 0)
  if (quantity > total + 1e-9) throw new Error('تكلفة الاقتناء لا تغطي الكمية المطلوبة')
  const remaining = Math.max(0, total - quantity)
  if (remaining <= 1e-9) return holding.costLots.filter(l => l.ownerId !== ownerId)
  let assigned = 0
  let seen = 0
  return holding.costLots.map(lot => {
    if (lot.ownerId !== ownerId) return lot
    seen += 1
    const nextQuantity = seen === lots.length ? round2(remaining - assigned) : round2((lot.quantity / total) * remaining)
    assigned = round2(assigned + nextQuantity)
    return { ...lot, quantity: nextQuantity }
  }).filter(lot => lot.quantity > 0)
}

function debitOwnerHolding(holding: Holding, ownerId: string, quantity: number): Holding {
  const owned = ownerQuantity(holding, ownerId)
  if (quantity > owned + 1e-9) throw new Error('الكمية المطلوبة أكبر من ملكية المالك في هذا الأصل')
  return {
    ...holding,
    quantity: round2(holding.quantity - quantity),
    ownership: holding.ownership.map(s => s.ownerId === ownerId ? { ...s, quantity: round2(s.quantity - quantity) } : s).filter(s => s.quantity > 0),
    costLots: reduceOwnerLots(holding, ownerId, quantity),
  }
}

function cashValuation(symbol: string): ValuationMethod {
  return symbol.toUpperCase() === 'SAR' ? 'nominal' : 'fx'
}

function creditCash(
  state: FinanceState,
  params: { accountId: string; ownerId: string; symbol: string; name: string; nativeUnit: string; quantity: number; unitCostSar: number; marketPriceSar: number; performanceRole?: PerformanceRole },
): { state: FinanceState; holdingId: string } {
  const account = accountOf(state, params.accountId)
  const existing = state.holdings.find(h => !h.archived && h.kind === 'cash' && h.accountId === params.accountId && h.symbol.toUpperCase() === params.symbol.toUpperCase())
  if (existing) {
    const hasOwner = existing.ownership.some(s => s.ownerId === params.ownerId)
    const updated: Holding = {
      ...existing,
      quantity: round2(existing.quantity + params.quantity),
      marketPriceSar: params.marketPriceSar,
      valuedAt: now(),
      valuationSource: 'user-entry',
      performanceRole: params.performanceRole ?? existing.performanceRole ?? 'transactional_cash',
      ownership: hasOwner
        ? existing.ownership.map(s => s.ownerId === params.ownerId ? { ...s, quantity: round2(s.quantity + params.quantity) } : s)
        : [...existing.ownership, { ownerId: params.ownerId, quantity: params.quantity }],
      costLots: [...existing.costLots, { id: id('lot'), ownerId: params.ownerId, quantity: params.quantity, unitCostSar: params.unitCostSar, acquiredAt: now() }],
    }
    return { state: { ...state, holdings: state.holdings.map(h => h.id === existing.id ? updated : h) }, holdingId: existing.id }
  }

  const holdingId = id('holding')
  const holding: Holding = {
    id: holdingId,
    symbol: params.symbol.toUpperCase(),
    name: params.name,
    kind: 'cash',
    nativeUnit: params.nativeUnit,
    quantity: params.quantity,
    marketPriceSar: params.marketPriceSar,
    costLots: [{ id: id('lot'), ownerId: params.ownerId, quantity: params.quantity, unitCostSar: params.unitCostSar, acquiredAt: now() }],
    valuationMethod: cashValuation(params.symbol),
    valuationSource: 'user-entry',
    valuedAt: now(),
    accountId: account.id,
    custodianId: account.custodianId,
    ownership: [{ ownerId: params.ownerId, quantity: params.quantity }],
    performanceRole: params.performanceRole ?? 'transactional_cash',
  }
  return { state: { ...state, holdings: [...state.holdings, holding] }, holdingId }
}

function addSlice(state: FinanceState, portfolioId: string | undefined, holdingId: string, ownerId: string, quantity: number): FinanceState {
  if (!portfolioId) return state
  const portfolio = state.portfolios.find(p => p.id === portfolioId && p.status === 'active')
  if (!portfolio) throw new Error('المحفظة غير موجودة أو مغلقة')
  const existing = state.portfolioSlices.find(s => s.portfolioId === portfolioId && s.holdingId === holdingId && s.ownerId === ownerId)
  if (existing) {
    return { ...state, portfolioSlices: state.portfolioSlices.map(s => s.id === existing.id ? { ...s, quantity: round2(s.quantity + quantity) } : s) }
  }
  return { ...state, portfolioSlices: [...state.portfolioSlices, { id: id('slice'), portfolioId, holdingId, ownerId, quantity }] }
}

export interface AddAccountInput {
  name: string
  kind: AccountKind
  custodianId: string
  currency?: string
  last4?: string
}

export function addAccount(state: FinanceState, input: AddAccountInput): FinanceState {
  if (!input.name.trim()) throw new Error('اسم الحساب مطلوب')
  if (!state.parties.some(p => p.id === input.custodianId)) throw new Error('الحافظ/المؤسسة غير موجود')
  const account: Account = {
    id: id('acc'), name: input.name.trim(), kind: input.kind, custodianId: input.custodianId,
    currency: input.currency?.trim().toUpperCase() || undefined, last4: input.last4?.trim() || undefined, status: 'active',
  }
  return { ...state, accounts: [...state.accounts, account] }
}

export interface AddFundsInput {
  accountId: string
  ownerId: string
  symbol: string
  nativeUnit: string
  quantity: number
  unitCostSar: number
  marketPriceSar: number
  classification: 'opening' | 'income'
  title?: string
  portfolioId?: string
}

export function addFunds(state: FinanceState, input: AddFundsInput): FinanceState {
  positive(input.quantity, 'الكمية')
  positive(input.unitCostSar, 'تكلفة الوحدة')
  positive(input.marketPriceSar, 'القيمة الحالية للوحدة')
  const credited = creditCash(state, {
    accountId: input.accountId, ownerId: input.ownerId, symbol: input.symbol, name: `رصيد ${input.symbol.toUpperCase()}`,
    nativeUnit: input.nativeUnit, quantity: input.quantity, unitCostSar: input.unitCostSar, marketPriceSar: input.marketPriceSar,
  })
  let next = addSlice(credited.state, input.portfolioId, credited.holdingId, input.ownerId, input.quantity)
  const amountSar = input.quantity * input.unitCostSar
  next = appendTx(next, { ...baseTx(input.classification, input.title?.trim() || (input.classification === 'income' ? 'إضافة دخل' : 'إضافة رصيد افتتاحي'), amountSar, input.ownerId), targetHoldingId: credited.holdingId, targetQuantity: input.quantity, portfolioId: input.portfolioId, note: input.classification === 'opening' ? 'رصيد قائم/افتتاحي؛ لا يُعد دخلاً.' : 'تدفق دخل فعلي.' })
  return next
}

export interface ExistingAssetInput {
  ownerId: string
  accountId: string
  name: string
  symbol: string
  kind: AssetKind
  nativeUnit: string
  quantity: number
  costBasisSar?: number
  marketPriceSar: number
  performanceRole: PerformanceRole
  portfolioId?: string
  location?: string
}

export function addExistingAsset(state: FinanceState, input: ExistingAssetInput): FinanceState {
  positive(input.quantity, 'الكمية')
  positive(input.marketPriceSar, 'القيمة السوقية للوحدة')
  if (!input.name.trim()) throw new Error('اسم الأصل مطلوب')
  const account = accountOf(state, input.accountId)
  if (input.costBasisSar != null && input.costBasisSar < 0) throw new Error('التكلفة لا يمكن أن تكون سالبة')
  const holdingId = id('holding')
  const positionId = input.costBasisSar != null ? id('pos') : undefined
  const unitCost = input.costBasisSar == null ? undefined : round2(input.costBasisSar / input.quantity)
  const holding: Holding = {
    id: holdingId, symbol: input.symbol.trim().toUpperCase() || input.name.slice(0, 4), name: input.name.trim(), kind: input.kind,
    nativeUnit: input.nativeUnit.trim() || 'وحدة', quantity: input.quantity, marketPriceSar: input.marketPriceSar,
    costLots: [{ id: id('lot'), ownerId: input.ownerId, quantity: input.quantity, unitCostSar: unitCost, acquiredAt: now() }],
    valuationMethod: input.kind === 'cash' ? cashValuation(input.symbol) : 'manual_appraisal', valuationSource: 'user-entry', valuedAt: now(),
    accountId: account.id, custodianId: account.custodianId, location: input.location?.trim() || undefined,
    ownership: [{ ownerId: input.ownerId, quantity: input.quantity }], performanceRole: input.performanceRole, positionId,
    acquisitionJourney: ['أصل قائم قبل التسجيل', input.name.trim()],
  }
  let next: FinanceState = { ...state, holdings: [...state.holdings, holding] }
  if (positionId && input.costBasisSar != null) {
    next = { ...next, positions: [...(next.positions ?? []), { id: positionId, name: input.name.trim(), ownerId: input.ownerId, portfolioId: input.portfolioId, holdingIds: [holdingId], openedAt: now(), status: 'open', performanceRole: input.performanceRole, initialCostBasisSar: input.costBasisSar, realizedGainLossSar: 0, note: 'تم تسجيله كأصل قائم؛ لم تُنشأ حركة شراء أو خصم مصرفي وهمي.' }] }
  }
  next = addSlice(next, input.portfolioId, holdingId, input.ownerId, input.quantity)
  next = appendTx(next, { ...baseTx('opening', `تسجيل أصل قائم: ${input.name.trim()}`, input.costBasisSar ?? input.quantity * input.marketPriceSar, input.ownerId), targetHoldingId: holdingId, targetQuantity: input.quantity, positionId, portfolioId: input.portfolioId, note: input.costBasisSar == null ? 'التكلفة التاريخية غير معروفة وتبقى غير معروفة.' : 'تسجيل أصل قائم بلا حركة دفع حالية.' })
  return next
}

export interface PurchaseAssetInput {
  sourceHoldingId: string
  ownerId: string
  sourceQuantity: number
  targetAccountId: string
  name: string
  symbol: string
  kind: AssetKind
  nativeUnit: string
  quantity: number
  marketPriceSar: number
  extraCostsSar?: number
  performanceRole: PerformanceRole
  portfolioId?: string
  location?: string
}

function consumeFundingSlice(state: FinanceState, input: PurchaseAssetInput): FinanceState {
  if (!input.portfolioId) {
    if (input.sourceQuantity > availableQuantity(state, input.sourceHoldingId, input.ownerId) + 1e-9) throw new Error('المبلغ الحر غير كافٍ؛ جزء من الرصيد مخصص لمحافظ أخرى')
    return state
  }
  const portfolioQty = state.portfolioSlices.filter(s => s.portfolioId === input.portfolioId && s.holdingId === input.sourceHoldingId && s.ownerId === input.ownerId).reduce((sum, s) => sum + s.quantity, 0)
  const freeQty = availableQuantity(state, input.sourceHoldingId, input.ownerId)
  if (input.sourceQuantity > portfolioQty + freeQty + 1e-9) throw new Error('مصدر التمويل لا يغطي الشراء ضمن هذه المحفظة')
  let remaining = Math.min(input.sourceQuantity, portfolioQty)
  return {
    ...state,
    portfolioSlices: state.portfolioSlices.map(slice => {
      if (remaining <= 0 || slice.portfolioId !== input.portfolioId || slice.holdingId !== input.sourceHoldingId || slice.ownerId !== input.ownerId) return slice
      const used = Math.min(slice.quantity, remaining)
      remaining = round2(remaining - used)
      return { ...slice, quantity: round2(slice.quantity - used) }
    }).filter(slice => slice.quantity > 0),
  }
}

export function purchaseAsset(state: FinanceState, input: PurchaseAssetInput): FinanceState {
  positive(input.sourceQuantity, 'الكمية المدفوعة')
  positive(input.quantity, 'كمية الأصل')
  positive(input.marketPriceSar, 'القيمة السوقية للوحدة')
  if (!input.name.trim()) throw new Error('اسم الأصل مطلوب')
  const source = state.holdings.find(h => h.id === input.sourceHoldingId && !h.archived)
  if (!source) throw new Error('مصدر الدفع غير موجود')
  if (source.kind !== 'cash') throw new Error('الشراء في هذه اللبنة يبدأ من أصل نقدي/عملة')
  const unitCost = ownerWeightedAverageCostSar(source, input.ownerId)
  if (unitCost == null) throw new Error('تكلفة مصدر الدفع غير معروفة؛ لا يمكن ترحيل Cost Basis بدقة')
  if (input.sourceQuantity > ownerQuantity(source, input.ownerId) + 1e-9) throw new Error('الرصيد غير كافٍ')
  const extraCostsSar = round2(Math.max(0, input.extraCostsSar ?? 0))
  const sourceBasisSar = round2(input.sourceQuantity * unitCost)
  const targetBasisSar = round2(sourceBasisSar + extraCostsSar)
  const account = accountOf(state, input.targetAccountId)

  let next = consumeFundingSlice(state, input)
  const updatedSource = debitOwnerHolding(source, input.ownerId, input.sourceQuantity)
  next = { ...next, holdings: next.holdings.map(h => h.id === source.id ? updatedSource : h) }

  const holdingId = id('holding')
  const positionId = id('pos')
  const holding: Holding = {
    id: holdingId, symbol: input.symbol.trim().toUpperCase() || input.name.slice(0, 4), name: input.name.trim(), kind: input.kind,
    nativeUnit: input.nativeUnit.trim() || 'وحدة', quantity: input.quantity, marketPriceSar: input.marketPriceSar,
    costLots: [{ id: id('lot'), ownerId: input.ownerId, quantity: input.quantity, unitCostSar: round2(targetBasisSar / input.quantity), acquiredAt: now() }],
    valuationMethod: input.kind === 'cash' ? cashValuation(input.symbol) : 'market_quote', valuationSource: 'user-entry', valuedAt: now(),
    accountId: account.id, custodianId: account.custodianId, location: input.location?.trim() || undefined,
    ownership: [{ ownerId: input.ownerId, quantity: input.quantity }], performanceRole: input.performanceRole, positionId,
    acquisitionJourney: [`${source.symbol} ${input.sourceQuantity}`, input.name.trim()],
  }
  next = { ...next, holdings: [...next.holdings, holding], positions: [...(next.positions ?? []), { id: positionId, name: input.name.trim(), ownerId: input.ownerId, portfolioId: input.portfolioId, holdingIds: [holdingId], openedAt: now(), status: 'open', performanceRole: input.performanceRole, initialCostBasisSar: targetBasisSar, realizedGainLossSar: 0, note: `Cost Basis المحمول من ${source.symbol}: ${sourceBasisSar} ر.س${extraCostsSar ? ` + تكاليف إضافية ${extraCostsSar} ر.س` : ''}.` }] }
  next = addSlice(next, input.portfolioId, holdingId, input.ownerId, input.quantity)
  next = appendTx(next, { ...baseTx('asset_purchase', `شراء ${input.name.trim()}`, targetBasisSar, input.ownerId), sourceHoldingId: source.id, targetHoldingId: holdingId, sourceQuantity: input.sourceQuantity, targetQuantity: input.quantity, feesSar: extraCostsSar || undefined, positionId, portfolioId: input.portfolioId, note: 'تحول رأس مال حقيقي؛ تكلفة المصدر تُرحّل إلى الأصل النهائي ولا تُفقد.' })
  return next
}

export interface TransferFundsInput {
  sourceHoldingId: string
  ownerId: string
  quantity: number
  targetAccountId: string
}

export function transferFunds(state: FinanceState, input: TransferFundsInput): FinanceState {
  positive(input.quantity, 'الكمية')
  const source = state.holdings.find(h => h.id === input.sourceHoldingId && !h.archived)
  if (!source || source.kind !== 'cash') throw new Error('مصدر النقل يجب أن يكون نقدًا/عملة')
  if (input.quantity > ownerQuantity(source, input.ownerId) + 1e-9) throw new Error('الرصيد غير كافٍ')
  const targetAccount = accountOf(state, input.targetAccountId)
  if (source.accountId === targetAccount.id) throw new Error('اختر حسابًا مختلفًا')
  const unitCost = ownerWeightedAverageCostSar(source, input.ownerId)
  if (unitCost == null) throw new Error('تكلفة العملة غير معروفة؛ تعذر نقل Cost Basis')
  const beforeOwnerQty = ownerQuantity(source, input.ownerId)
  const fraction = input.quantity / beforeOwnerQty
  const updatedSource = debitOwnerHolding(source, input.ownerId, input.quantity)
  let next: FinanceState = { ...state, holdings: state.holdings.map(h => h.id === source.id ? updatedSource : h) }
  const credited = creditCash(next, { accountId: targetAccount.id, ownerId: input.ownerId, symbol: source.symbol, name: source.name, nativeUnit: source.nativeUnit, quantity: input.quantity, unitCostSar: unitCost, marketPriceSar: source.marketPriceSar, performanceRole: source.performanceRole })
  next = credited.state

  const movedSlices: FinanceState['portfolioSlices'] = []
  const remainingSlices = next.portfolioSlices.map(slice => {
    if (slice.holdingId !== source.id || slice.ownerId !== input.ownerId) return slice
    const moved = round2(slice.quantity * fraction)
    if (moved > 0) movedSlices.push({ id: id('slice'), portfolioId: slice.portfolioId, holdingId: credited.holdingId, ownerId: input.ownerId, quantity: moved })
    return { ...slice, quantity: round2(slice.quantity - moved) }
  }).filter(slice => slice.quantity > 0)
  next = { ...next, portfolioSlices: [...remainingSlices, ...movedSlices] }
  next = appendTx(next, { ...baseTx('real_transfer', `نقل ${source.symbol} بين الحسابات`, input.quantity * source.marketPriceSar, input.ownerId), sourceHoldingId: source.id, targetHoldingId: credited.holdingId, sourceQuantity: input.quantity, targetQuantity: input.quantity, note: 'Real Transfer لنفس الأصل؛ لا دخل ولا مصروف ولا ربح/خسارة محققة. الغرض/التخصيص محفوظ.' })
  return next
}

export interface CreatePortfolioInput {
  name: string
  ownerId: string
  parentId?: string
  profile: PortfolioProfile
  purpose?: string
  targetValueSar?: number
  beneficiaryId?: string
  dueDate?: string
  settlementAssetSymbol?: string
  protectionMode?: 'flexible' | 'designated' | 'hard_reserved' | 'instrument_bound'
}

export function createPortfolio(state: FinanceState, input: CreatePortfolioInput): FinanceState {
  if (!input.name.trim()) throw new Error('اسم المحفظة مطلوب')
  if (input.targetValueSar != null && input.targetValueSar < 0) throw new Error('الهدف لا يمكن أن يكون سالبًا')
  if (input.parentId && !state.portfolios.some(p => p.id === input.parentId && p.status === 'active')) throw new Error('المحفظة الأم غير موجودة')
  return {
    ...state,
    portfolios: [...state.portfolios, {
      id: id('p'), name: input.name.trim(), parentId: input.parentId || undefined, ownerIds: [input.ownerId], beneficiaryId: input.beneficiaryId || undefined,
      purpose: input.purpose?.trim() || undefined, targetValueSar: input.targetValueSar, status: 'active', profile: input.profile,
      dueDate: input.dueDate || undefined, settlementAssetSymbol: input.settlementAssetSymbol?.trim().toUpperCase() || undefined,
      protectionMode: input.protectionMode ?? 'flexible',
    }],
  }
}

export interface AllocateToPortfolioInput {
  holdingId: string
  ownerId: string
  portfolioId: string
  quantity: number
}

export function allocateToPortfolio(state: FinanceState, input: AllocateToPortfolioInput): FinanceState {
  positive(input.quantity, 'الكمية')
  const holding = state.holdings.find(h => h.id === input.holdingId && !h.archived)
  if (!holding) throw new Error('الأصل غير موجود')
  if (input.quantity > availableQuantity(state, input.holdingId, input.ownerId) + 1e-9) throw new Error('الكمية الحرة غير كافية للتخصيص')
  let next = addSlice(state, input.portfolioId, input.holdingId, input.ownerId, input.quantity)
  next = appendTx(next, { ...baseTx('allocation_settlement', `تخصيص ${holding.name} لمحفظة`, input.quantity * holding.marketPriceSar, input.ownerId), targetHoldingId: input.holdingId, targetQuantity: input.quantity, portfolioId: input.portfolioId, note: 'تغير الغرض الاقتصادي فقط؛ لا توجد حركة مصرفية.' })
  return next
}
