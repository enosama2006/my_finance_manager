import { assetTypeById, type AssetTypeId } from '../domain/assetCatalog'
import { ownerQuantity, round2 } from '../domain/finance'
import type { FinanceState, Holding, LedgerTransaction, TransactionRevision } from '../domain/types'
import type { MarketQuote } from '../data/marketData'
import { purchaseAssetSimplified, type SimplifiedPurchaseInput } from './purchase'

const now = () => new Date().toISOString()
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

function snapshot(tx: LedgerTransaction): TransactionRevision['snapshot'] {
  return { at: tx.at, title: tx.title, amountSar: tx.amountSar, ownerId: tx.ownerId, sourceHoldingId: tx.sourceHoldingId, targetHoldingId: tx.targetHoldingId, sourceQuantity: tx.sourceQuantity, targetQuantity: tx.targetQuantity, exchangeRate: tx.exchangeRate, feesSar: tx.feesSar, realizedGainLossSar: tx.realizedGainLossSar, note: tx.note, portfolioId: tx.portfolioId, expenseCategoryId: tx.expenseCategoryId, expenseNecessity: tx.expenseNecessity, expenseBeneficiaryId: tx.expenseBeneficiaryId, userInput: tx.userInput }
}

function addOwnerQuantity(holding: Holding, ownerId: string, quantity: number, unitCostSar: number, acquiredAt: string): Holding {
  const ownership = holding.ownership.some(s => s.ownerId === ownerId) ? holding.ownership.map(s => s.ownerId === ownerId ? { ...s, quantity: round2(s.quantity + quantity) } : s) : [...holding.ownership, { ownerId, quantity }]
  return { ...holding, quantity: round2(holding.quantity + quantity), ownership, costLots: [...holding.costLots, { id: id('lot'), ownerId, quantity, unitCostSar, acquiredAt }] }
}

function assertPurchaseCanBeReprojected(state: FinanceState, tx: LedgerTransaction) {
  if (tx.kind !== 'asset_purchase' || tx.status !== 'posted') throw new Error('الحركة ليست شراء أصل نشطًا')
  if (!tx.sourceHoldingId || !tx.targetHoldingId || !tx.sourceQuantity || !tx.targetQuantity) throw new Error('حركة الشراء القديمة ناقصة ولا يمكن عكسها بأمان')
  const target = state.holdings.find(h => h.id === tx.targetHoldingId && !h.archived)
  if (!target) throw new Error('الأصل الناتج عن الشراء غير موجود')
  const laterReferences = state.ledger.filter(other => other.id !== tx.id && other.status === 'posted' && (other.sourceHoldingId === target.id || other.targetHoldingId === target.id))
  if (laterReferences.length) throw new Error('لا يمكن تصحيح هذا الشراء مباشرة لأن الأصل دخل في حركة لاحقة. يجب إعادة تشغيل السلسلة من هذه النقطة.')
  const targetOwned = ownerQuantity(target, tx.ownerId)
  const otherOwners = target.ownership.filter(s => s.ownerId !== tx.ownerId && s.quantity > 1e-9)
  if (Math.abs(target.quantity - tx.targetQuantity) > 0.000001 || Math.abs(targetOwned - tx.targetQuantity) > 0.000001 || otherOwners.length) throw new Error('لا يمكن تصحيح الشراء مباشرة لأن كمية/ملكية الأصل تغيرت لاحقًا')
  if (tx.portfolioId) throw new Error('تصحيح شراء مرتبط بمحفظة يحتاج Replay تفصيلي لاستعادة تمويل المحفظة بدقة')
  if (tx.positionId) {
    const position = (state.positions ?? []).find(p => p.id === tx.positionId)
    if (!position || position.status !== 'open' || position.realizedGainLossSar !== 0 || position.holdingIds.length !== 1 || position.holdingIds[0] !== target.id) throw new Error('المركز المرتبط بالشراء تغير لاحقًا؛ يلزم Replay متسلسل بدل تعديل مباشر')
  }
}

function reversePurchaseProjection(state: FinanceState, tx: LedgerTransaction): FinanceState {
  assertPurchaseCanBeReprojected(state, tx)
  const source = state.holdings.find(h => h.id === tx.sourceHoldingId && !h.archived)
  if (!source) throw new Error('مصدر الدفع القديم غير موجود')
  const sourceQuantity = tx.sourceQuantity!
  const sourceCostSar = round2(tx.amountSar - (tx.feesSar ?? 0))
  const sourceUnitCostSar = sourceQuantity > 0 ? sourceCostSar / sourceQuantity : 0
  if (!Number.isFinite(sourceUnitCostSar) || sourceUnitCostSar < 0) throw new Error('تعذر استنتاج Cost Basis لمصدر الدفع القديم')
  const restoredSource = addOwnerQuantity(source, tx.ownerId, sourceQuantity, sourceUnitCostSar, tx.at)
  const targetId = tx.targetHoldingId!
  const positionId = tx.positionId
  return { ...state, holdings: state.holdings.filter(h => h.id !== targetId).map(h => h.id === source.id ? restoredSource : h), portfolioSlices: state.portfolioSlices.filter(s => s.holdingId !== targetId), positions: (state.positions ?? []).filter(p => !positionId || p.id !== positionId), ledger: state.ledger.filter(item => item.id !== tx.id) }
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
  targetGroupId?: string
  targetAccountId?: string
  assetTypeId: AssetTypeId
  name: string
  symbol?: string
  quantity: number
  extraCostsSar?: number
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
  const base = reversePurchaseProjection(state, current)
  const marketQuote: MarketQuote | null = input.marketUnitPriceSar && input.marketUnitPriceSar > 0 ? { unitPriceSar: input.marketUnitPriceSar, source: input.marketSource?.trim() || 'user-correction', asOf: at.toISOString(), isLive: false, note: 'قيمة مصححة يدويًا ضمن مراجعة حركة شراء.' } : null
  const purchaseInput: SimplifiedPurchaseInput = { sourceHoldingId: input.sourceHoldingId, ownerId: input.ownerId, amountPaid: input.amountPaid, targetGroupId: input.targetGroupId, targetAccountId: input.targetAccountId, assetTypeId: input.assetTypeId, name: input.name, symbol: input.symbol, quantity: input.quantity, extraCostsSar: input.extraCostsSar, location: input.location, marketQuote }
  let replayed = purchaseAssetSimplified(base, purchaseInput)
  const generated = replayed.ledger[0]
  if (!generated || generated.kind !== 'asset_purchase' || !generated.targetHoldingId) throw new Error('فشل إعادة إسقاط عملية الشراء')
  const revision: TransactionRevision = { version: current.version, changedAt: now(), reason, snapshot: snapshot(current) }
  const correctedTx: LedgerTransaction = { ...generated, id: current.id, version: current.version + 1, revisions: [...current.revisions, revision], at: at.toISOString(), title: input.title?.trim() || `شراء ${input.name.trim()}`, note: input.note?.trim() || generated.note }
  replayed = { ...replayed, ledger: replayed.ledger.map(tx => tx.id === generated.id ? correctedTx : tx), holdings: replayed.holdings.map(h => h.id === generated.targetHoldingId ? { ...h, costLots: h.costLots.map(lot => ({ ...lot, acquiredAt: at.toISOString() })), valuedAt: marketQuote?.asOf ?? h.valuedAt } : h), positions: (replayed.positions ?? []).map(position => position.id === generated.positionId ? { ...position, openedAt: at.toISOString() } : position) }
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
