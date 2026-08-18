import type { AssetKind, ExpenseNecessity, FinanceState, LedgerTransaction, TransactionRevision } from '../domain/types'
import { allocateToPortfolio } from './commands'
import { applyManagedConversion } from './conversionPolicy'
import { spendExpense } from './expenses'
import { addIncomeToAsset, setAssetOpeningBalance, transferBetweenAssets } from './assetTransactions'
import { voidTransaction } from './transactionVoids'

const now = () => new Date().toISOString()
function snapshot(tx: LedgerTransaction): TransactionRevision['snapshot'] { return { at: tx.at, title: tx.title, amountSar: tx.amountSar, ownerId: tx.ownerId, sourceHoldingId: tx.sourceHoldingId, targetHoldingId: tx.targetHoldingId, sourceQuantity: tx.sourceQuantity, targetQuantity: tx.targetQuantity, exchangeRate: tx.exchangeRate, feesSar: tx.feesSar, realizedGainLossSar: tx.realizedGainLossSar, note: tx.note, portfolioId: tx.portfolioId, expenseCategoryId: tx.expenseCategoryId, expenseNecessity: tx.expenseNecessity, expenseBeneficiaryId: tx.expenseBeneficiaryId, userInput: tx.userInput } }
function prepare(state: FinanceState, tx: LedgerTransaction, reason: string) { const reversed = voidTransaction(state, tx.id, reason); return { ...reversed, ledger: reversed.ledger.filter(x => x.id !== tx.id) } }
function preserve(state: FinanceState, current: LedgerTransaction, generated: LedgerTransaction, reason: string, at: string, title?: string, note?: string) { const revision: TransactionRevision = { version: current.version, changedAt: now(), reason, snapshot: snapshot(current) }; const corrected: LedgerTransaction = { ...generated, id: current.id, version: current.version + 1, revisions: [...current.revisions, revision], at, title: title?.trim() || generated.title, note: note?.trim() || generated.note }; return { ...state, ledger: state.ledger.map(tx => tx.id === generated.id ? corrected : tx) } }
function validAt(at: string) { const d = new Date(at); if (Number.isNaN(d.getTime())) throw new Error('التاريخ غير صالح'); return d.toISOString() }

export interface CorrectOpeningInput { transactionId: string; reason: string; at: string; assetId: string; ownerId: string; quantity: number; title?: string; note?: string }
export function correctOpening(state: FinanceState, input: CorrectOpeningInput) {
  const current = state.ledger.find(x => x.id === input.transactionId)
  if (!current || current.kind !== 'opening' || current.status !== 'posted') throw new Error('الحالة الافتتاحية غير موجودة أو غير نشطة')
  if (!input.reason.trim()) throw new Error('سبب التصحيح مطلوب')
  const at = validAt(input.at)
  const sameProjection = current.targetHoldingId === input.assetId && current.ownerId === input.ownerId

  // Opening is a correctable historical fact. If the correction stays on the same
  // Asset + Owner, do NOT void the old opening and replay later transactions.
  // setAssetOpeningBalance derives the non-opening movement already embedded in the
  // current materialized projection, replaces only the opening fact, and adjusts the
  // projected quantity by the opening delta. Later Ledger transactions stay untouched.
  if (sameProjection) {
    const target = state.holdings.find(h => h.id === input.assetId && !h.archived)
    if (!target) throw new Error('الأصل الهدف غير موجود')
    let next = setAssetOpeningBalance(state, {
      assetId: input.assetId,
      ownerId: input.ownerId,
      quantity: input.quantity,
      unitCostSar: target.marketPriceSar,
      title: input.title,
      reason: input.reason,
    })
    const corrected = next.ledger.find(x => x.id === current.id)
    if (!corrected) throw new Error('فشل تحديث الحالة الافتتاحية')
    next = {
      ...next,
      ledger: next.ledger.map(tx => tx.id === current.id ? {
        ...tx,
        at,
        title: input.title?.trim() || tx.title,
        note: input.note?.trim() || tx.note,
      } : tx),
    }
    return next
  }

  // Moving an opening fact to another Asset/Owner changes two projections. Keep the
  // existing conservative reverse/replay path until cross-projection dependency replay
  // is generalized; never fabricate a balancing transaction.
  const conflicting = state.ledger.find(x => x.id !== current.id && x.kind === 'opening' && x.status === 'posted' && x.targetHoldingId === input.assetId && x.ownerId === input.ownerId)
  if (conflicting && input.assetId !== current.targetHoldingId) throw new Error('للأصل الهدف حالة افتتاحية أخرى؛ صححها أو احذفها أولًا')
  let next = prepare(state, current, input.reason)
  const target = next.holdings.find(h => h.id === input.assetId && !h.archived)
  if (!target) throw new Error('الأصل الهدف غير موجود')
  next = setAssetOpeningBalance(next, { assetId: input.assetId, ownerId: input.ownerId, quantity: input.quantity, unitCostSar: target.marketPriceSar, title: input.title, reason: input.reason })
  const generated = next.ledger.find(x => x.status === 'posted' && x.kind === 'opening' && x.targetHoldingId === input.assetId && x.ownerId === input.ownerId)
  if (!generated) throw new Error('فشل إعادة إنشاء الحالة الافتتاحية')
  return preserve(next, current, generated, input.reason, at, input.title, input.note)
}

export interface CorrectIncomeInput { transactionId: string; reason: string; at: string; assetId: string; ownerId: string; quantity: number; title?: string; note?: string }
export function correctIncome(state: FinanceState, input: CorrectIncomeInput) {
  const current = state.ledger.find(x => x.id === input.transactionId)
  if (!current || current.kind !== 'income' || current.status !== 'posted') throw new Error('حركة الدخل غير موجودة أو غير نشطة')
  if (!input.reason.trim()) throw new Error('سبب التصحيح مطلوب')
  let next = prepare(state, current, input.reason)
  next = addIncomeToAsset(next, { assetId: input.assetId, ownerId: input.ownerId, quantity: input.quantity, title: input.title, note: input.note })
  return preserve(next, current, next.ledger[0], input.reason, validAt(input.at), input.title, input.note)
}

export interface CorrectTransferInput {
  transactionId: string
  reason: string
  at: string
  sourceAssetId: string
  targetAssetId: string
  ownerId: string
  quantity: number
  targetQuantity?: number
  exchangeRate?: number
  title?: string
  note?: string
}
export function correctTransfer(state: FinanceState, input: CorrectTransferInput) {
  const current = state.ledger.find(x => x.id === input.transactionId)
  if (!current || current.kind !== 'real_transfer' || current.status !== 'posted') throw new Error('حركة النقل غير موجودة أو غير نشطة')
  if (!input.reason.trim()) throw new Error('سبب التصحيح مطلوب')
  let next = prepare(state, current, input.reason)
  const replayTarget = input.targetQuantity
  const replayRate = input.exchangeRate ?? (replayTarget == null ? current.exchangeRate : undefined)
  next = transferBetweenAssets(next, {
    sourceAssetId: input.sourceAssetId,
    targetAssetId: input.targetAssetId,
    ownerId: input.ownerId,
    quantity: input.quantity,
    targetQuantity: replayTarget,
    exchangeRate: replayRate,
    note: input.note,
  })
  return preserve(next, current, next.ledger[0], input.reason, validAt(input.at), input.title, input.note)
}

export interface CorrectExpenseInput { transactionId: string; reason: string; at: string; sourceAssetId: string; ownerId: string; quantity: number; expenseCategoryId: string; portfolioId?: string; expenseNecessity?: ExpenseNecessity; expenseBeneficiaryId?: string; title?: string; note?: string }
export function correctExpense(state: FinanceState, input: CorrectExpenseInput) {
  const current = state.ledger.find(x => x.id === input.transactionId)
  if (!current || current.kind !== 'expense' || current.status !== 'posted') throw new Error('حركة المصروف غير موجودة أو غير نشطة')
  if (!input.reason.trim()) throw new Error('سبب التصحيح مطلوب')
  let next = prepare(state, current, input.reason)
  next = spendExpense(next, { sourceHoldingId: input.sourceAssetId, ownerId: input.ownerId, quantity: input.quantity, expenseCategoryId: input.expenseCategoryId, portfolioId: input.portfolioId, expenseNecessity: input.expenseNecessity, expenseBeneficiaryId: input.expenseBeneficiaryId, title: input.title, note: input.note })
  return preserve(next, current, next.ledger[0], input.reason, validAt(input.at), input.title, input.note)
}

export interface CorrectAllocationInput { transactionId: string; reason: string; at: string; assetId: string; ownerId: string; portfolioId: string; quantity: number; title?: string; note?: string }
export function correctAllocation(state: FinanceState, input: CorrectAllocationInput) {
  const current = state.ledger.find(x => x.id === input.transactionId)
  if (!current || current.kind !== 'allocation_settlement' || current.status !== 'posted') throw new Error('حركة التخصيص غير موجودة أو غير نشطة')
  if (!input.reason.trim()) throw new Error('سبب التصحيح مطلوب')
  let next = prepare(state, current, input.reason)
  next = allocateToPortfolio(next, { holdingId: input.assetId, ownerId: input.ownerId, portfolioId: input.portfolioId, quantity: input.quantity })
  return preserve(next, current, next.ledger[0], input.reason, validAt(input.at), input.title, input.note)
}

export interface CorrectConversionInput {
  transactionId: string
  reason: string
  at: string
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
  title?: string
  note?: string
}

export function correctConversion(state: FinanceState, input: CorrectConversionInput) {
  const current = state.ledger.find(x => x.id === input.transactionId)
  if (!current || current.kind !== 'conversion' || current.status !== 'posted') throw new Error('حركة التحويل غير موجودة أو غير نشطة')
  if (!input.reason.trim()) throw new Error('سبب التصحيح مطلوب')
  const at = validAt(input.at)
  let next = prepare(state, current, input.reason)
  next = applyManagedConversion(next, {
    sourceHoldingId: input.sourceHoldingId,
    sourcePortfolioId: input.sourcePortfolioId,
    targetPortfolioId: input.targetPortfolioId,
    targetSymbol: input.targetSymbol,
    targetName: input.targetName,
    targetKind: input.targetKind,
    targetUnit: input.targetUnit,
    sourceQuantity: input.sourceQuantity,
    targetQuantity: input.targetQuantity,
    targetUnitValueSarAtExecution: input.targetUnitValueSarAtExecution,
    feesSar: input.feesSar,
    ownerId: input.ownerId,
    targetGroupId: input.targetGroupId,
    targetLocation: input.targetLocation,
  }, at)
  return preserve(next, current, next.ledger[0], input.reason, at, input.title, input.note)
}
