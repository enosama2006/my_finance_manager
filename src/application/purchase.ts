import { assetTypeById, type AssetTypeId } from '../domain/assetCatalog'
import { availableQuantity, ownerQuantity, ownerWeightedAverageCostSar, resizeCostBasisLot, round2 } from '../domain/finance'
import type { FinanceState, Holding, LedgerTransaction, Position, ValuationMethod } from '../domain/types'
import type { MarketQuote } from '../data/marketData'

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const now = () => new Date().toISOString()

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} يجب أن يكون أكبر من صفر`)
}
function assertGroup(state: FinanceState, groupId?: string) {
  if (groupId && !(state.accountGroups ?? []).some(g => g.id === groupId && g.status === 'active')) throw new Error('مجموعة الأصل غير موجودة أو مؤرشفة')
}
function reduceOwnerLots(holding: Holding, ownerId: string, quantity: number) {
  const lots = holding.costLots.filter(l => l.ownerId === ownerId)
  const total = lots.reduce((sum, lot) => sum + lot.quantity, 0)
  if (quantity > total + 1e-9) throw new Error('تكلفة الاقتناء لا تغطي الكمية المطلوبة')
  const remaining = Math.max(0, total - quantity)
  if (remaining <= 1e-9) return holding.costLots.filter(l => l.ownerId !== ownerId)
  let assigned = 0, seen = 0
  return holding.costLots.map(lot => {
    if (lot.ownerId !== ownerId) return lot
    seen += 1
    const nextQuantity = seen === lots.length ? round2(remaining - assigned) : round2((lot.quantity / total) * remaining)
    assigned = round2(assigned + nextQuantity)
    return resizeCostBasisLot(lot, nextQuantity)
  }).filter(lot => lot.quantity > 1e-9)
}
function debitOwnerHolding(holding: Holding, ownerId: string, quantity: number): Holding {
  if (quantity > ownerQuantity(holding, ownerId) + 1e-9) throw new Error('الرصيد غير كافٍ')
  return {
    ...holding,
    quantity: round2(holding.quantity - quantity),
    ownership: holding.ownership.map(s => s.ownerId === ownerId ? { ...s, quantity: round2(s.quantity - quantity) } : s).filter(s => s.quantity > 1e-9),
    costLots: reduceOwnerLots(holding, ownerId, quantity),
  }
}

interface FundingConsumption {
  state: FinanceState
  sourcePortfolioQuantityConsumed: number
}
function consumePortfolioFunding(state: FinanceState, input: SimplifiedPurchaseInput): FundingConsumption {
  if (!input.portfolioId) {
    if (input.amountPaid > availableQuantity(state, input.sourceHoldingId, input.ownerId) + 1e-9) throw new Error('المبلغ الحر غير كافٍ؛ جزء من هذا الرصيد محجوز لمحافظ أخرى')
    return { state, sourcePortfolioQuantityConsumed: 0 }
  }
  const allocated = round2(state.portfolioSlices.filter(s => s.portfolioId === input.portfolioId && s.holdingId === input.sourceHoldingId && s.ownerId === input.ownerId).reduce((sum, s) => sum + s.quantity, 0))
  const free = availableQuantity(state, input.sourceHoldingId, input.ownerId)
  if (input.amountPaid > allocated + free + 1e-9) throw new Error('مصدر الدفع لا يغطي هذا الشراء ضمن المحفظة المختارة')
  const consumed = round2(Math.min(input.amountPaid, allocated))
  let remaining = consumed
  const portfolioSlices = state.portfolioSlices.map(slice => {
    if (remaining <= 0 || slice.portfolioId !== input.portfolioId || slice.holdingId !== input.sourceHoldingId || slice.ownerId !== input.ownerId) return slice
    const used = Math.min(slice.quantity, remaining)
    remaining = round2(remaining - used)
    return { ...slice, quantity: round2(slice.quantity - used) }
  }).filter(slice => slice.quantity > 1e-9)
  return { state: { ...state, portfolioSlices }, sourcePortfolioQuantityConsumed: consumed }
}
function addPortfolioQuantity(state: FinanceState, portfolioId: string, holdingId: string, ownerId: string, quantity: number): FinanceState {
  const existing = state.portfolioSlices.find(s => s.portfolioId === portfolioId && s.holdingId === holdingId && s.ownerId === ownerId)
  const portfolioSlices = existing
    ? state.portfolioSlices.map(s => s.id === existing.id ? { ...s, quantity: s.quantity + quantity } : s)
    : [...state.portfolioSlices, { id: id('slice'), portfolioId, holdingId, ownerId, quantity }]
  return { ...state, portfolioSlices }
}
function valuationMethodForFallback(assetTypeId: AssetTypeId): ValuationMethod {
  const def = assetTypeById(assetTypeId)
  if (!def) return 'cost_fallback'
  if (def.quoteStrategy === 'contractual') return 'contractual'
  return 'cost_fallback'
}

export interface SimplifiedPurchaseInput {
  sourceHoldingId: string
  ownerId: string
  amountPaid: number
  /** Explicitly choose this Asset to append a new purchase lot. No automatic name/symbol merge. */
  targetAssetId?: string
  targetGroupId?: string
  /** legacy correction/import compatibility */
  targetAccountId?: string
  assetTypeId: AssetTypeId
  name: string
  symbol?: string
  quantity: number
  extraCostsSar?: number
  portfolioId?: string
  location?: string
  marketQuote?: MarketQuote | null
}
export interface PurchasePreview {
  sourceUnit: string
  sourceCostBasisSar: number
  extraCostsSar: number
  totalCostBasisSar: number
  effectiveUnitCostSar: number
  marketUnitPriceSar: number | null
  unrealizedAtPurchaseSar: number | null
}
export function previewSimplifiedPurchase(state: FinanceState, input: SimplifiedPurchaseInput): PurchasePreview {
  positive(input.amountPaid, 'المبلغ المدفوع'); positive(input.quantity, 'الكمية المشتراة')
  const source = state.holdings.find(h => h.id === input.sourceHoldingId && !h.archived)
  if (!source || source.kind !== 'cash') throw new Error('اختر أصلًا نقديًا صالحًا للدفع')
  const unitCost = ownerWeightedAverageCostSar(source, input.ownerId)
  if (unitCost == null) throw new Error('تكلفة أصل الدفع غير معروفة')
  const sourceCostBasisSar = round2(input.amountPaid * unitCost)
  const extraCostsSar = round2(Math.max(0, input.extraCostsSar ?? 0))
  const totalCostBasisSar = round2(sourceCostBasisSar + extraCostsSar)
  const effectiveUnitCostSar = totalCostBasisSar / input.quantity
  const marketUnitPriceSar = input.marketQuote?.unitPriceSar ?? null
  const unrealizedAtPurchaseSar = marketUnitPriceSar == null ? null : round2(input.quantity * marketUnitPriceSar - totalCostBasisSar)
  return { sourceUnit: source.nativeUnit, sourceCostBasisSar, extraCostsSar, totalCostBasisSar, effectiveUnitCostSar, marketUnitPriceSar, unrealizedAtPurchaseSar }
}

function existingTargetForPurchase(state: FinanceState, input: SimplifiedPurchaseInput, def: NonNullable<ReturnType<typeof assetTypeById>>): Holding | undefined {
  if (!input.targetAssetId) return undefined
  const target = state.holdings.find(h => h.id === input.targetAssetId && !h.archived)
  if (!target) throw new Error('الأصل المراد زيادته غير موجود أو مؤرشف')
  if (target.id === input.sourceHoldingId) throw new Error('لا يمكن أن يكون أصل الدفع هو أصل الشراء نفسه')
  if (target.kind !== def.kind) throw new Error('نوع الأصل الموجود لا يطابق نوع الشراء')
  if (target.assetTypeId && target.assetTypeId !== def.id) throw new Error('تصنيف الأصل الموجود لا يطابق الأداة المشتراة')
  const otherOwners = target.ownership.some(s => s.ownerId !== input.ownerId && s.quantity > 1e-9)
  if (otherOwners) throw new Error('زيادة حيازة متعددة الملاك تحتاج توزيع ملكية صريح؛ اختر حيازة خاصة بالمالك أو أنشئ حيازة جديدة')
  return target
}
function appendPurchaseLot(target: Holding, input: SimplifiedPurchaseInput, preview: PurchasePreview, transactionId: string, at: string): Holding {
  const ownership = target.ownership.some(s => s.ownerId === input.ownerId)
    ? target.ownership.map(s => s.ownerId === input.ownerId ? { ...s, quantity: s.quantity + input.quantity } : s)
    : [...target.ownership, { ownerId: input.ownerId, quantity: input.quantity }]
  return {
    ...target,
    quantity: target.quantity + input.quantity,
    ownership,
    costLots: [...target.costLots, { id: id('lot'), ownerId: input.ownerId, quantity: input.quantity, unitCostSar: preview.effectiveUnitCostSar, totalCostBasisSar: preview.totalCostBasisSar, sourceTransactionId: transactionId, acquiredAt: at }],
    marketPriceSar: input.marketQuote?.unitPriceSar ?? target.marketPriceSar,
    valuationMethod: input.marketQuote ? 'market_quote' : target.valuationMethod,
    valuationSource: input.marketQuote?.source ?? target.valuationSource,
    valuedAt: input.marketQuote?.asOf ?? target.valuedAt,
    acquisitionJourney: [...(target.acquisitionJourney ?? []), `شراء إضافي ${input.quantity} ${target.nativeUnit}`],
  }
}
function updateOrCreatePosition(state: FinanceState, target: Holding, input: SimplifiedPurchaseInput, preview: PurchasePreview, at: string): { positions: Position[]; positionId: string } {
  const positions = [...(state.positions ?? [])]
  if (target.positionId) {
    const index = positions.findIndex(p => p.id === target.positionId)
    const position = index >= 0 ? positions[index] : undefined
    if (position) {
      if (position.ownerId !== input.ownerId || position.status !== 'open' || position.realizedGainLossSar !== 0) throw new Error('المركز المرتبط بالأصل لا يقبل شراءً إضافيًا آليًا؛ افتح حيازة مستقلة')
      positions[index] = { ...position, initialCostBasisSar: round2(position.initialCostBasisSar + preview.totalCostBasisSar), portfolioId: position.portfolioId ?? input.portfolioId }
      return { positions, positionId: position.id }
    }
  }
  const positionId = id('pos')
  positions.push({ id: positionId, name: target.name, ownerId: input.ownerId, portfolioId: input.portfolioId, holdingIds: [target.id], openedAt: at, status: 'open', performanceRole: target.performanceRole ?? 'investment', initialCostBasisSar: preview.totalCostBasisSar, realizedGainLossSar: 0, note: 'مركز واحد يمكن أن يحتوي عدة عمليات شراء/Lots لنفس الحيازة.' })
  return { positions, positionId }
}

export function purchaseAssetSimplified(state: FinanceState, input: SimplifiedPurchaseInput): FinanceState {
  const def = assetTypeById(input.assetTypeId)
  if (!def) throw new Error('نوع الأصل غير معروف في دليل الأصول')
  if (!input.targetAssetId && !input.name.trim()) throw new Error('اسم الأصل مطلوب')
  const existingTarget = existingTargetForPurchase(state, input, def)
  const legacyTargetAccount = input.targetAccountId ? state.accounts.find(a => a.id === input.targetAccountId) : undefined
  let groupId = input.targetGroupId
  if (!groupId && legacyTargetAccount) groupId = legacyTargetAccount.groupId
  if (!existingTarget) assertGroup(state, groupId)

  const preview = previewSimplifiedPurchase(state, input)
  const source = state.holdings.find(h => h.id === input.sourceHoldingId && !h.archived)!
  if (input.amountPaid > ownerQuantity(source, input.ownerId) + 1e-9) throw new Error('الرصيد غير كافٍ')
  const funding = consumePortfolioFunding(state, input)
  let next = funding.state
  const updatedSource = debitOwnerHolding(source, input.ownerId, input.amountPaid)
  next = { ...next, schemaVersion: 5, holdings: next.holdings.map(h => h.id === source.id ? updatedSource : h) }

  const transactionId = id('tx')
  const at = now()
  let target: Holding
  let positionId: string
  let createdTarget = false

  if (existingTarget) {
    target = appendPurchaseLot(existingTarget, input, preview, transactionId, at)
    const pos = updateOrCreatePosition(next, target, input, preview, at)
    positionId = pos.positionId
    target = { ...target, positionId }
    next = { ...next, holdings: next.holdings.map(h => h.id === target.id ? target : h), positions: pos.positions }
  } else {
    createdTarget = true
    const holdingId = id('holding')
    positionId = id('pos')
    const symbol = (input.symbol?.trim() || def.defaultSymbol || input.name.slice(0, 5)).toUpperCase()
    const marketPriceSar = input.marketQuote?.unitPriceSar ?? preview.effectiveUnitCostSar
    target = {
      id: holdingId, symbol, name: input.name.trim(), kind: def.kind, assetTypeId: def.id, nativeUnit: def.defaultUnit,
      quantity: input.quantity, marketPriceSar,
      costLots: [{ id: id('lot'), ownerId: input.ownerId, quantity: input.quantity, unitCostSar: preview.effectiveUnitCostSar, totalCostBasisSar: preview.totalCostBasisSar, sourceTransactionId: transactionId, acquiredAt: at }],
      valuationMethod: input.marketQuote ? 'market_quote' : valuationMethodForFallback(def.id), valuationSource: input.marketQuote?.source ?? 'acquisition-cost-fallback', valuedAt: input.marketQuote?.asOf ?? at,
      groupId: groupId || undefined, accountId: legacyTargetAccount?.id, custodianId: legacyTargetAccount?.custodianId, location: input.location?.trim() || undefined,
      ownership: [{ ownerId: input.ownerId, quantity: input.quantity }], performanceRole: def.defaultPerformanceRole, positionId,
      acquisitionJourney: [`دفع ${input.amountPaid} ${source.nativeUnit} من ${source.name}`, input.name.trim()],
    }
    next = {
      ...next,
      holdings: [...next.holdings, target],
      positions: [...(next.positions ?? []), { id: positionId, name: input.name.trim(), ownerId: input.ownerId, portfolioId: input.portfolioId, holdingIds: [holdingId], openedAt: at, status: 'open', performanceRole: def.defaultPerformanceRole, initialCostBasisSar: preview.totalCostBasisSar, realizedGainLossSar: 0, note: 'التكلفة محفوظة تاريخيًا بدقة على مستوى الدفعة. المركز قد يستقبل مشتريات إضافية لاحقًا.' }],
    }
  }

  if (input.portfolioId) next = addPortfolioQuantity(next, input.portfolioId, target.id, input.ownerId, input.quantity)
  const tx: LedgerTransaction = {
    id: transactionId, version: 1, status: 'posted', revisions: [], at, kind: 'asset_purchase',
    title: existingTarget ? `شراء إضافي: ${target.name}` : `شراء ${target.name}`,
    amountSar: preview.totalCostBasisSar, costBasisSar: preview.totalCostBasisSar, ownerId: input.ownerId,
    sourceHoldingId: source.id, targetHoldingId: target.id, sourceQuantity: input.amountPaid, targetQuantity: input.quantity,
    feesSar: preview.extraCostsSar || undefined, positionId, portfolioId: input.portfolioId,
    userInput: {
      kind: 'asset_purchase', sourceAccountId: source.accountId, sourceHoldingId: source.id, ownerId: input.ownerId, amountPaid: input.amountPaid,
      targetAssetId: existingTarget ? target.id : undefined, targetGroupId: createdTarget ? (groupId || undefined) : target.groupId,
      targetAccountId: input.targetAccountId, assetTypeId: def.id, name: target.name, symbol: target.symbol, quantity: input.quantity,
      extraCostsSar: preview.extraCostsSar || undefined, portfolioId: input.portfolioId,
      sourcePortfolioQuantityConsumed: funding.sourcePortfolioQuantityConsumed || undefined,
      location: target.location, marketUnitPriceSar: target.marketPriceSar, marketSource: input.marketQuote?.source ?? target.valuationSource,
    },
    note: existingTarget
      ? 'أضيفت دفعة شراء مستقلة إلى الحيازة الموجودة؛ متوسط التكلفة مشتق من جميع الـLots الفعالة.'
      : input.marketQuote ? `التقييم السوقي جُلب من ${input.marketQuote.source}. الربح/الخسارة الحالية غير محققة.` : 'لم يتوفر Quote سوقي لحظة الشراء؛ بدأ التقييم مؤقتًا من تكلفة الاقتناء وسيُحدّث عند توفر مزود سعر.',
  }
  return { ...next, ledger: [tx, ...next.ledger] }
}

export function applyHoldingMarketQuote(state: FinanceState, holdingId: string, quote: MarketQuote): FinanceState {
  if (!Number.isFinite(quote.unitPriceSar) || quote.unitPriceSar <= 0) throw new Error('سعر السوق غير صالح')
  const holding = state.holdings.find(h => h.id === holdingId && !h.archived)
  if (!holding) throw new Error('الأصل غير موجود')
  return { ...state, holdings: state.holdings.map(h => h.id === holdingId ? { ...h, marketPriceSar: quote.unitPriceSar, valuationMethod: 'market_quote', valuationSource: quote.source, valuedAt: quote.asOf } : h) }
}
