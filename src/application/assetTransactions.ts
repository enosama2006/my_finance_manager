import { ownerQuantity, ownerWeightedAverageCostSar, round2 } from '../domain/finance'
import type { FinanceState, Holding, LedgerTransaction, TransactionRevision } from '../domain/types'
import { createAsset, type CreateAssetInput } from './assets'

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const now = () => new Date().toISOString()

function activeAsset(state: FinanceState, assetId: string) {
  const asset = state.holdings.find(h => h.id === assetId && !h.archived)
  if (!asset) throw new Error('الأصل غير موجود أو محذوف')
  return asset
}
function ownerExists(state: FinanceState, ownerId: string) { if (!state.parties.some(p => p.id === ownerId)) throw new Error('المالك غير موجود') }
function snapshot(tx: LedgerTransaction): TransactionRevision['snapshot'] { return { at: tx.at, title: tx.title, amountSar: tx.amountSar, ownerId: tx.ownerId, sourceHoldingId: tx.sourceHoldingId, targetHoldingId: tx.targetHoldingId, sourceQuantity: tx.sourceQuantity, targetQuantity: tx.targetQuantity, exchangeRate: tx.exchangeRate, feesSar: tx.feesSar, realizedGainLossSar: tx.realizedGainLossSar, note: tx.note, portfolioId: tx.portfolioId, expenseCategoryId: tx.expenseCategoryId, expenseNecessity: tx.expenseNecessity, expenseBeneficiaryId: tx.expenseBeneficiaryId, userInput: tx.userInput } }
function setOwnerQuantity(asset: Holding, ownerId: string, desired: number, unitCostSar: number) {
  const current = ownerQuantity(asset, ownerId)
  const delta = round2(desired - current)
  if (asset.quantity + delta < -1e-9) throw new Error('التصحيح سيجعل الأصل سالبًا')
  let costLots = [...asset.costLots]
  if (delta > 0) costLots.push({ id: id('lot'), ownerId, quantity: delta, unitCostSar, acquiredAt: now() })
  if (delta < 0) {
    let remaining = Math.abs(delta)
    costLots = costLots.map(lot => {
      if (lot.ownerId !== ownerId || remaining <= 1e-9) return lot
      const used = Math.min(lot.quantity, remaining); remaining = round2(remaining - used)
      return { ...lot, quantity: round2(lot.quantity - used) }
    }).filter(lot => lot.quantity > 1e-9)
    if (remaining > 1e-9) throw new Error('تعذر عكس Cost Basis بدقة')
  }
  const ownership = asset.ownership.filter(x => x.ownerId !== ownerId)
  if (desired > 1e-9) ownership.push({ ownerId, quantity: round2(desired) })
  return { ...asset, quantity: round2(asset.quantity + delta), ownership, costLots }
}

export interface SetAssetOpeningBalanceInput { assetId: string; ownerId: string; quantity: number; unitCostSar?: number; title?: string; reason?: string }

/** One posted opening balance per Asset + Owner. Re-saving corrects the same logical opening event. */
export function setAssetOpeningBalance(state: FinanceState, input: SetAssetOpeningBalanceInput): FinanceState {
  if (!Number.isFinite(input.quantity) || input.quantity < 0) throw new Error('الرصيد الافتتاحي لا يمكن أن يكون سالبًا')
  ownerExists(state, input.ownerId)
  const asset = activeAsset(state, input.assetId)
  const existing = state.ledger.filter(tx => tx.kind === 'opening' && tx.status === 'posted' && tx.targetHoldingId === asset.id && tx.ownerId === input.ownerId)
  const currentOpening = round2(existing.reduce((sum, tx) => sum + (tx.targetQuantity ?? 0), 0))
  const currentOwner = ownerQuantity(asset, input.ownerId)
  const nonOpening = round2(currentOwner - currentOpening)
  const desiredOwner = round2(nonOpening + input.quantity)
  if (desiredOwner < -1e-9) throw new Error('لا يمكن ضبط الرصيد الافتتاحي بهذه القيمة بسبب حركات لاحقة')
  const unitCost = input.unitCostSar ?? ownerWeightedAverageCostSar(asset, input.ownerId) ?? asset.marketPriceSar
  const updatedAsset = setOwnerQuantity(asset, input.ownerId, desiredOwner, unitCost)

  if (existing.length === 0) {
    const tx: LedgerTransaction = { id: id('tx'), version: 1, status: 'posted', revisions: [], at: now(), kind: 'opening', title: input.title?.trim() || `رصيد افتتاحي: ${asset.name}`, amountSar: round2(input.quantity * unitCost), ownerId: input.ownerId, targetHoldingId: asset.id, targetQuantity: round2(input.quantity), note: 'حالة افتتاحية واحدة لهذا الأصل؛ يمكن تصحيحها لاحقًا.' }
    return { ...state, schemaVersion: 5, holdings: state.holdings.map(h => h.id === asset.id ? updatedAsset : h), ledger: [tx, ...state.ledger] }
  }

  const canonical = existing[existing.length - 1]
  const reason = input.reason?.trim() || 'تصحيح الرصيد الافتتاحي'
  const redundant = new Set(existing.filter(tx => tx.id !== canonical.id).map(tx => tx.id))
  const updatedTx: LedgerTransaction = { ...canonical, version: canonical.version + 1, revisions: [...canonical.revisions, { version: canonical.version, changedAt: now(), reason, snapshot: snapshot(canonical) }], title: input.title?.trim() || canonical.title, amountSar: round2(input.quantity * unitCost), targetQuantity: round2(input.quantity), note: existing.length > 1 ? `تم توحيد ${existing.length} حالات افتتاحية في سجل واحد.` : `تم التصحيح: ${reason}` }
  return { ...state, schemaVersion: 5, holdings: state.holdings.map(h => h.id === asset.id ? updatedAsset : h), ledger: state.ledger.map(tx => tx.id === canonical.id ? updatedTx : redundant.has(tx.id) ? { ...tx, status: 'voided', version: tx.version + 1, revisions: [...tx.revisions, { version: tx.version, changedAt: now(), reason: 'حالة افتتاحية مكررة', snapshot: snapshot(tx) }], note: 'ملغاة أثناء توحيد الحالة الافتتاحية.' } : tx) }
}

/** Creates metadata first, then records the initial quantity as an opening event. */
export function createAssetWithOpening(state: FinanceState, input: CreateAssetInput): FinanceState {
  const quantity = input.quantity ?? 0
  const created = createAsset(state, { ...input, quantity: 0, costBasisSar: undefined })
  const asset = created.holdings[created.holdings.length - 1]
  if (!asset || quantity <= 0) return created
  const unitCost = input.costBasisSar != null ? input.costBasisSar / quantity : asset.marketPriceSar
  return setAssetOpeningBalance(created, { assetId: asset.id, ownerId: input.ownerId, quantity, unitCostSar: unitCost, title: `حالة افتتاحية: ${asset.name}` })
}

export interface AddAssetIncomeInput { assetId: string; ownerId: string; quantity: number; title?: string; note?: string }
export function addIncomeToAsset(state: FinanceState, input: AddAssetIncomeInput): FinanceState {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error('قيمة الدخل يجب أن تكون أكبر من صفر')
  ownerExists(state, input.ownerId)
  const asset = activeAsset(state, input.assetId)
  if (asset.kind !== 'cash') throw new Error('الدخل المباشر يضاف إلى أصل نقدي')
  const current = ownerQuantity(asset, input.ownerId)
  const unitCost = asset.marketPriceSar
  const updated = setOwnerQuantity(asset, input.ownerId, round2(current + input.quantity), unitCost)
  const tx: LedgerTransaction = { id: id('tx'), version: 1, status: 'posted', revisions: [], at: now(), kind: 'income', title: input.title?.trim() || `دخل إلى ${asset.name}`, amountSar: round2(input.quantity * unitCost), ownerId: input.ownerId, targetHoldingId: asset.id, targetQuantity: round2(input.quantity), note: input.note?.trim() || 'دخل أضافه المستخدم إلى الأصل النقدي.' }
  return { ...state, schemaVersion: 5, holdings: state.holdings.map(h => h.id === asset.id ? updated : h), ledger: [tx, ...state.ledger] }
}

export interface TransferBetweenAssetsInput { sourceAssetId: string; targetAssetId: string; ownerId: string; quantity: number; note?: string }
export function transferBetweenAssets(state: FinanceState, input: TransferBetweenAssetsInput): FinanceState {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر')
  if (input.sourceAssetId === input.targetAssetId) throw new Error('اختر أصلين مختلفين')
  const source = activeAsset(state, input.sourceAssetId); const target = activeAsset(state, input.targetAssetId)
  if (source.kind !== 'cash' || target.kind !== 'cash') throw new Error('النقل النقدي يتطلب أصلين نقديين')
  if (source.symbol.toUpperCase() !== target.symbol.toUpperCase()) throw new Error('النقل المباشر يتطلب نفس العملة؛ استخدم التحويل لتغيير العملة')
  const sourceOwned = ownerQuantity(source, input.ownerId)
  if (input.quantity > sourceOwned + 1e-9) throw new Error('الرصيد غير كافٍ')
  const sourceCost = ownerWeightedAverageCostSar(source, input.ownerId) ?? source.marketPriceSar
  const nextSource = setOwnerQuantity(source, input.ownerId, round2(sourceOwned - input.quantity), sourceCost)
  const targetOwned = ownerQuantity(target, input.ownerId)
  const nextTarget = setOwnerQuantity(target, input.ownerId, round2(targetOwned + input.quantity), sourceCost)
  const tx: LedgerTransaction = { id: id('tx'), version: 1, status: 'posted', revisions: [], at: now(), kind: 'real_transfer', title: `نقل ${source.symbol}: ${source.name} ← ${target.name}`, amountSar: round2(input.quantity * sourceCost), ownerId: input.ownerId, sourceHoldingId: source.id, targetHoldingId: target.id, sourceQuantity: round2(input.quantity), targetQuantity: round2(input.quantity), note: input.note?.trim() || 'نقل بين أصلين نقديين بنفس العملة؛ لا يحقق ربحًا أو خسارة.' }
  return { ...state, schemaVersion: 5, holdings: state.holdings.map(h => h.id === source.id ? nextSource : h.id === target.id ? nextTarget : h), ledger: [tx, ...state.ledger] }
}
