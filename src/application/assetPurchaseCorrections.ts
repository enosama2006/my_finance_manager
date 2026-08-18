import { assetTypeById, type AssetTypeId } from '../domain/assetCatalog'
import { lotCostBasisSar, ownerQuantity, round2 } from '../domain/finance'
import type { CostBasisLot, FinanceState, Holding, LedgerTransaction, TransactionRevision } from '../domain/types'
import type { MarketQuote } from '../data/marketData'
import { purchaseAssetSimplified, type SimplifiedPurchaseInput } from './purchase'

const now = () => new Date().toISOString()
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const EPS = 1e-8
const roundNative = (value: number) => Math.round((value + Number.EPSILON) * 1e12) / 1e12

function snapshot(tx: LedgerTransaction): TransactionRevision['snapshot'] {
  return { at: tx.at, title: tx.title, amountSar: tx.amountSar, costBasisSar: tx.costBasisSar, ownerId: tx.ownerId, sourceHoldingId: tx.sourceHoldingId, targetHoldingId: tx.targetHoldingId, sourceQuantity: tx.sourceQuantity, targetQuantity: tx.targetQuantity, exchangeRate: tx.exchangeRate, feesSar: tx.feesSar, realizedGainLossSar: tx.realizedGainLossSar, note: tx.note, portfolioId: tx.portfolioId, expenseCategoryId: tx.expenseCategoryId, expenseNecessity: tx.expenseNecessity, expenseBeneficiaryId: tx.expenseBeneficiaryId, userInput: tx.userInput }
}

function addOwnerQuantity(holding: Holding, ownerId: string, quantity: number, totalCostBasisSar: number, acquiredAt: string): Holding {
  const unitCostSar = quantity > 0 ? totalCostBasisSar / quantity : undefined
  const ownership = holding.ownership.some(s => s.ownerId === ownerId)
    ? holding.ownership.map(s => s.ownerId === ownerId ? { ...s, quantity: round2(s.quantity + quantity) } : s)
    : [...holding.ownership, { ownerId, quantity: round2(quantity) }]
  return {
    ...holding,
    quantity: round2(holding.quantity + quantity),
    ownership,
    costLots: [...holding.costLots, { id: id('lot'), ownerId, quantity: round2(quantity), unitCostSar, totalCostBasisSar, acquiredAt }],
  }
}

function purchaseLot(target: Holding, tx: LedgerTransaction): CostBasisLot {
  const linked = target.costLots.find(lot => lot.sourceTransactionId === tx.id && lot.ownerId === tx.ownerId)
  if (linked) return linked
  // Compatibility for purchases posted before sourceTransactionId was introduced: only safe when the Asset is still exactly that purchase.
  const ownerLots = target.costLots.filter(lot => lot.ownerId === tx.ownerId)
  if (ownerLots.length === 1 && Math.abs(target.quantity - (tx.targetQuantity ?? 0)) <= EPS && Math.abs(ownerLots[0].quantity - (tx.targetQuantity ?? 0)) <= EPS) return ownerLots[0]
  throw new Error('لا يمكن تحديد Lot الخاص بهذه المشتريات القديمة بأمان؛ لن نخمن أي دفعة يجب عكسها')
}

function assertPurchaseCanBeReprojected(state: FinanceState, tx: LedgerTransaction) {
  if (tx.kind !== 'asset_purchase' || tx.status !== 'posted') throw new Error('الحركة ليست شراء أصل نشطًا')
  if (!tx.sourceHoldingId || !tx.targetHoldingId || !tx.sourceQuantity || !tx.targetQuantity) throw new Error('حركة الشراء القديمة ناقصة ولا يمكن عكسها بأمان')
  const target = state.holdings.find(h => h.id === tx.targetHoldingId && !h.archived)
  if (!target) throw new Error('الأصل الناتج/المزاد بالشراء غير موجود')
  const lot = purchaseLot(target, tx)
  if (Math.abs(lot.quantity - tx.targetQuantity) > EPS) throw new Error('Lot الخاص بالشراء تغير؛ يجب عكس الحركات اللاحقة أولًا')
  if (ownerQuantity(target, tx.ownerId) + EPS < tx.targetQuantity) throw new Error('ملكية الأصل لم تعد تغطي كمية هذا الشراء')

  const laterUnsafeReferences = state.ledger.filter(other => other.id !== tx.id && other.status === 'posted' && (
    other.sourceHoldingId === target.id ||
    (other.targetHoldingId === target.id && other.kind !== 'asset_purchase')
  ))
  if (laterUnsafeReferences.length) throw new Error('لا يمكن تصحيح هذا الشراء مباشرة لأن الحيازة دخلت في حركة لاحقة غير شراء إضافي. اعكس السلسلة اللاحقة أولًا.')

  if (tx.portfolioId) {
    const intent = tx.userInput?.kind === 'asset_purchase' ? tx.userInput : undefined
    if (intent?.sourcePortfolioQuantityConsumed == null) throw new Error('هذا شراء قديم مرتبط بمحفظة ولا يحفظ مقدار تمويل المصدر المستهلك؛ لن نخمن الأثر')
    const targetAllocated = state.portfolioSlices.filter(s => s.portfolioId === tx.portfolioId && s.holdingId === target.id && s.ownerId === tx.ownerId).reduce((sum, s) => sum + s.quantity, 0)
    if (targetAllocated + EPS < tx.targetQuantity) throw new Error('جزء من تخصيص هذه الدفعة استُهلك لاحقًا؛ اعكس الاستهلاك أولًا')
  }

  if (tx.positionId) {
    const position = (state.positions ?? []).find(p => p.id === tx.positionId)
    if (!position || position.status !== 'open' || position.realizedGainLossSar !== 0 || !position.holdingIds.includes(target.id)) throw new Error('المركز المرتبط بالشراء تغير لاحقًا؛ يلزم Replay متسلسل بدل تعديل مباشر')
  }
}

function reduceTargetPortfolioSlice(state: FinanceState, tx: LedgerTransaction): FinanceState['portfolioSlices'] {
  if (!tx.portfolioId || !tx.targetHoldingId || !tx.targetQuantity) return state.portfolioSlices
  let remaining = tx.targetQuantity
  return state.portfolioSlices.map(slice => {
    if (remaining <= EPS || slice.portfolioId !== tx.portfolioId || slice.holdingId !== tx.targetHoldingId || slice.ownerId !== tx.ownerId) return slice
    const used = Math.min(slice.quantity, remaining)
    remaining = roundNative(remaining - used)
    return { ...slice, quantity: roundNative(slice.quantity - used) }
  }).filter(slice => slice.quantity > EPS)
}

function restoreSourcePortfolioSlice(state: FinanceState, tx: LedgerTransaction, slices: FinanceState['portfolioSlices']): FinanceState['portfolioSlices'] {
  if (!tx.portfolioId || !tx.sourceHoldingId) return slices
  const intent = tx.userInput?.kind === 'asset_purchase' ? tx.userInput : undefined
  const quantity = intent?.sourcePortfolioQuantityConsumed ?? 0
  if (quantity <= EPS) return slices
  const existing = slices.find(s => s.portfolioId === tx.portfolioId && s.holdingId === tx.sourceHoldingId && s.ownerId === tx.ownerId)
  if (existing) return slices.map(s => s.id === existing.id ? { ...s, quantity: round2(s.quantity + quantity) } : s)
  return [...slices, { id: id('slice'), portfolioId: tx.portfolioId, holdingId: tx.sourceHoldingId, ownerId: tx.ownerId, quantity: round2(quantity) }]
}

function removePurchaseLot(target: Holding, tx: LedgerTransaction): { target: Holding | null; removedBasisSar: number } {
  const lot = purchaseLot(target, tx)
  const removedBasisSar = lotCostBasisSar(lot) ?? tx.costBasisSar ?? tx.amountSar
  const nextQuantity = roundNative(target.quantity - tx.targetQuantity!)
  const ownership = target.ownership.map(s => s.ownerId === tx.ownerId ? { ...s, quantity: roundNative(s.quantity - tx.targetQuantity!) } : s).filter(s => s.quantity > EPS)
  const costLots = target.costLots.filter(l => l.id !== lot.id)
  if (nextQuantity <= EPS && ownership.length === 0 && costLots.length === 0) return { target: null, removedBasisSar }
  return { target: { ...target, quantity: nextQuantity, ownership, costLots }, removedBasisSar }
}

function reversePurchaseProjection(state: FinanceState, tx: LedgerTransaction): FinanceState {
  assertPurchaseCanBeReprojected(state, tx)
  const source = state.holdings.find(h => h.id === tx.sourceHoldingId && !h.archived)
  const target = state.holdings.find(h => h.id === tx.targetHoldingId && !h.archived)
  if (!source || !target) throw new Error('مصدر الدفع أو الأصل المستهدف غير موجود')

  const sourceQuantity = tx.sourceQuantity!
  const sourceCostBasisSar = (tx.costBasisSar ?? tx.amountSar) - (tx.feesSar ?? 0)
  if (!Number.isFinite(sourceCostBasisSar) || sourceCostBasisSar < -EPS) throw new Error('تعذر استنتاج Cost Basis لمصدر الدفع القديم')
  const restoredSource = addOwnerQuantity(source, tx.ownerId, sourceQuantity, Math.max(0, sourceCostBasisSar), tx.at)
  const removed = removePurchaseLot(target, tx)

  let slices = reduceTargetPortfolioSlice(state, tx)
  slices = restoreSourcePortfolioSlice(state, tx, slices)

  const positions = [...(state.positions ?? [])]
  let nextPositions = positions
  if (tx.positionId) {
    const position = positions.find(p => p.id === tx.positionId)
    if (position) {
      const remainingBasis = round2(Math.max(0, position.initialCostBasisSar - removed.removedBasisSar))
      if (!removed.target && remainingBasis <= EPS) nextPositions = positions.filter(p => p.id !== position.id)
      else nextPositions = positions.map(p => p.id === position.id ? { ...p, initialCostBasisSar: remainingBasis } : p)
    }
  }

  const holdings: Holding[] = []
  for (const holding of state.holdings) {
    if (holding.id === source.id) holdings.push(restoredSource)
    else if (holding.id === target.id) { if (removed.target) holdings.push(removed.target) }
    else holdings.push(holding)
  }

  return { ...state, holdings, portfolioSlices: removed.target ? slices : slices.filter(s => s.holdingId !== target.id), positions: nextPositions, ledger: state.ledger.filter(item => item.id !== tx.id) }
}

export interface CorrectAssetPurchaseInput {
  transactionId: string
  reason: string
  at: string
  title?: string
  note?: string
  sourceHoldingId: string
  ownerId: string
  amountPaid: number
  /** Optional explicit existing destination. If omitted, correction keeps the original Asset when other lots still exist. */
  targetAssetId?: string
  targetGroupId?: string
  targetAccountId?: string
  assetTypeId: AssetTypeId
  name: string
  symbol?: string
  quantity: number
  extraCostsSar?: number
  portfolioId?: string
  location?: string
  marketUnitPriceSar?: number
  marketSource?: string
}

export function correctAssetPurchase(state: FinanceState, input: CorrectAssetPurchaseInput): FinanceState {
  const current = state.ledger.find(tx => tx.id === input.transactionId)
  if (!current) throw new Error('حركة الشراء غير موجودة')
  const reason = input.reason.trim()
  if (!reason) throw new Error('سبب التصحيح مطلوب')
  const at = new Date(input.at)
  if (Number.isNaN(at.getTime())) throw new Error('تاريخ الشراء غير صالح')
  if (!assetTypeById(input.assetTypeId)) throw new Error('نوع الأصل غير معروف')

  const originalTargetId = current.targetHoldingId
  const base = reversePurchaseProjection(state, current)
  const targetStillExists = originalTargetId ? base.holdings.some(h => h.id === originalTargetId && !h.archived) : false
  const targetAssetId = input.targetAssetId ?? (targetStillExists ? originalTargetId : undefined)
  const marketQuote: MarketQuote | null = input.marketUnitPriceSar && input.marketUnitPriceSar > 0
    ? { unitPriceSar: input.marketUnitPriceSar, source: input.marketSource?.trim() || 'user-correction', asOf: at.toISOString(), isLive: false, note: 'قيمة مصححة يدويًا ضمن مراجعة حركة شراء.' }
    : null
  const purchaseInput: SimplifiedPurchaseInput = {
    sourceHoldingId: input.sourceHoldingId, ownerId: input.ownerId, amountPaid: input.amountPaid,
    targetAssetId, targetGroupId: input.targetGroupId, targetAccountId: input.targetAccountId,
    assetTypeId: input.assetTypeId, name: input.name, symbol: input.symbol, quantity: input.quantity,
    extraCostsSar: input.extraCostsSar, portfolioId: input.portfolioId, location: input.location, marketQuote,
  }
  let replayed = purchaseAssetSimplified(base, purchaseInput)
  const generated = replayed.ledger[0]
  if (!generated || generated.kind !== 'asset_purchase' || !generated.targetHoldingId) throw new Error('فشل إعادة إسقاط عملية الشراء')

  const revision: TransactionRevision = { version: current.version, changedAt: now(), reason, snapshot: snapshot(current) }
  const correctedTx: LedgerTransaction = { ...generated, id: current.id, version: current.version + 1, revisions: [...current.revisions, revision], at: at.toISOString(), title: input.title?.trim() || generated.title, note: input.note?.trim() || generated.note }
  const repeated = generated.userInput?.kind === 'asset_purchase' && !!generated.userInput.targetAssetId
  replayed = {
    ...replayed,
    ledger: replayed.ledger.map(tx => tx.id === generated.id ? correctedTx : tx),
    holdings: replayed.holdings.map(h => h.id === generated.targetHoldingId ? {
      ...h,
      costLots: h.costLots.map(lot => lot.sourceTransactionId === generated.id ? { ...lot, sourceTransactionId: current.id, acquiredAt: at.toISOString() } : lot),
      valuedAt: marketQuote?.asOf ?? h.valuedAt,
    } : h),
    positions: (replayed.positions ?? []).map(position => position.id === generated.positionId && !repeated ? { ...position, openedAt: at.toISOString() } : position),
  }
  return replayed
}

export function voidAssetPurchase(state: FinanceState, transactionId: string, reason: string): FinanceState {
  const current = state.ledger.find(tx => tx.id === transactionId)
  if (!current) throw new Error('حركة الشراء غير موجودة')
  const why = reason.trim()
  if (!why) throw new Error('سبب الإلغاء مطلوب')
  const base = reversePurchaseProjection(state, current)
  const revision: TransactionRevision = { version: current.version, changedAt: now(), reason: why, snapshot: snapshot(current) }
  const voided: LedgerTransaction = { ...current, status: 'voided', version: current.version + 1, revisions: [...current.revisions, revision], note: `ملغاة: ${why}` }
  return { ...base, schemaVersion: 5, ledger: [voided, ...base.ledger] }
}
