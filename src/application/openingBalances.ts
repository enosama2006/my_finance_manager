import { round2 } from '../domain/finance'
import type { FinanceState, Holding, LedgerTransaction, TransactionRevision } from '../domain/types'
import { addFunds, type AddFundsInput } from './commands'

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const now = () => new Date().toISOString()

function snapshot(tx: LedgerTransaction): TransactionRevision['snapshot'] {
  return {
    at: tx.at,
    title: tx.title,
    amountSar: tx.amountSar,
    ownerId: tx.ownerId,
    sourceHoldingId: tx.sourceHoldingId,
    targetHoldingId: tx.targetHoldingId,
    sourceQuantity: tx.sourceQuantity,
    targetQuantity: tx.targetQuantity,
    exchangeRate: tx.exchangeRate,
    feesSar: tx.feesSar,
    realizedGainLossSar: tx.realizedGainLossSar,
    note: tx.note,
    portfolioId: tx.portfolioId,
    expenseCategoryId: tx.expenseCategoryId,
    expenseNecessity: tx.expenseNecessity,
    expenseBeneficiaryId: tx.expenseBeneficiaryId,
  }
}

function openingTransactionsFor(state: FinanceState, accountId: string, ownerId: string, symbol: string) {
  const normalized = symbol.trim().toUpperCase()
  return state.ledger.filter(tx => {
    if (tx.kind !== 'opening' || tx.status !== 'posted' || tx.ownerId !== ownerId || !tx.targetHoldingId) return false
    const holding = state.holdings.find(h => h.id === tx.targetHoldingId && !h.archived)
    return Boolean(holding && holding.accountId === accountId && holding.symbol.toUpperCase() === normalized)
  })
}

export interface OpeningBalanceInfo {
  exists: boolean
  quantity: number
  count: number
  holdingId?: string
  portfolioId?: string
}

export function openingBalanceInfo(state: FinanceState, accountId: string, ownerId: string, symbol: string): OpeningBalanceInfo {
  const txs = openingTransactionsFor(state, accountId, ownerId, symbol)
  return {
    exists: txs.length > 0,
    quantity: round2(txs.reduce((sum, tx) => sum + (tx.targetQuantity ?? 0), 0)),
    count: txs.length,
    holdingId: txs[0]?.targetHoldingId,
    portfolioId: txs[0]?.portfolioId,
  }
}

function updateOwnerQuantity(holding: Holding, ownerId: string, delta: number, unitCostSar: number): Holding {
  const ownerQty = holding.ownership.filter(x => x.ownerId === ownerId).reduce((sum, x) => sum + x.quantity, 0)
  const nextOwner = round2(ownerQty + delta)
  if (nextOwner < -1e-9) throw new Error('لا يمكن خفض الرصيد الافتتاحي لهذه القيمة لأن جزءًا من الرصيد استُهلك لاحقًا. يحتاج هذا السيناريو إلى إعادة تشغيل الحركات اللاحقة.')
  const nextTotal = round2(holding.quantity + delta)
  if (nextTotal < -1e-9) throw new Error('تصحيح الرصيد سيجعل الرصيد الكلي سالبًا')

  let ownership = holding.ownership.filter(x => x.ownerId !== ownerId)
  if (nextOwner > 1e-9) ownership = [...ownership, { ownerId, quantity: nextOwner }]

  let costLots = [...holding.costLots]
  if (delta > 0) {
    costLots.push({ id: id('lot'), ownerId, quantity: round2(delta), unitCostSar, acquiredAt: now() })
  } else if (delta < 0) {
    let remaining = -delta
    costLots = costLots.map(lot => {
      if (remaining <= 1e-9 || lot.ownerId !== ownerId || lot.quantity <= 0) return lot
      const used = Math.min(lot.quantity, remaining)
      remaining = round2(remaining - used)
      return { ...lot, quantity: round2(lot.quantity - used) }
    }).filter(lot => lot.quantity > 1e-9)
    if (remaining > 1e-9) throw new Error('تعذر عكس Cost Basis للرصد الافتتاحي بدقة')
  }

  return { ...holding, quantity: Math.max(0, nextTotal), ownership, costLots }
}

function adjustPortfolioSlice(state: FinanceState, portfolioId: string | undefined, holdingId: string, ownerId: string, delta: number): FinanceState {
  if (!portfolioId || Math.abs(delta) <= 1e-9) return state
  const slice = state.portfolioSlices.find(s => s.portfolioId === portfolioId && s.holdingId === holdingId && s.ownerId === ownerId)
  if (delta > 0) {
    if (slice) return { ...state, portfolioSlices: state.portfolioSlices.map(s => s.id === slice.id ? { ...s, quantity: round2(s.quantity + delta) } : s) }
    return { ...state, portfolioSlices: [...state.portfolioSlices, { id: id('slice'), portfolioId, holdingId, ownerId, quantity: round2(delta) }] }
  }
  if (!slice || slice.quantity + delta < -1e-9) throw new Error('لا يمكن خفض الرصيد الافتتاحي لأن الكمية المخصصة للمحفظة استُهلكت أو تغيرت لاحقًا')
  return { ...state, portfolioSlices: state.portfolioSlices.map(s => s.id === slice.id ? { ...s, quantity: round2(s.quantity + delta) } : s).filter(s => s.quantity > 1e-9) }
}

export interface SetOpeningBalanceInput extends Omit<AddFundsInput, 'classification'> {
  reason?: string
}

/**
 * Opening balance is a single state-initialization event per Account + Owner + Symbol.
 * Existing duplicate prototype entries are consolidated into one canonical transaction.
 */
export function setOpeningBalance(state: FinanceState, input: SetOpeningBalanceInput): FinanceState {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error('الرصيد الافتتاحي يجب أن يكون أكبر من صفر')
  const txs = openingTransactionsFor(state, input.accountId, input.ownerId, input.symbol)
  if (txs.length === 0) return addFunds(state, { ...input, classification: 'opening' })

  const canonical = txs[txs.length - 1]
  const holdingId = canonical.targetHoldingId
  if (!holdingId) throw new Error('الرصيد الافتتاحي القديم لا يشير إلى رصيد فعلي')
  const holding = state.holdings.find(h => h.id === holdingId && !h.archived)
  if (!holding) throw new Error('الرصيد المرتبط بالحركة الافتتاحية غير موجود')
  if (txs.some(tx => tx.targetHoldingId !== holdingId)) throw new Error('توجد أرصدة افتتاحية متكررة موزعة على أكثر من Holding؛ يلزم دمجها يدويًا قبل التصحيح')

  const existingPortfolioIds = [...new Set(txs.map(tx => tx.portfolioId).filter(Boolean))]
  if (existingPortfolioIds.length > 1) throw new Error('الأرصدة الافتتاحية المتكررة مرتبطة بمحافظ مختلفة؛ لا يمكن دمجها تلقائيًا بأمان')
  const existingPortfolioId = existingPortfolioIds[0]
  if ((input.portfolioId || undefined) !== existingPortfolioId) throw new Error('تغيير محفظة الرصيد الافتتاحي ليس جزءًا من التصحيح الحالي؛ اترك المحفظة كما كانت')

  const currentOpening = round2(txs.reduce((sum, tx) => sum + (tx.targetQuantity ?? 0), 0))
  const delta = round2(input.quantity - currentOpening)
  let nextHolding = holding
  if (Math.abs(delta) > 1e-9) nextHolding = updateOwnerQuantity(holding, input.ownerId, delta, input.unitCostSar)

  let next: FinanceState = { ...state, holdings: state.holdings.map(h => h.id === holdingId ? nextHolding : h) }
  next = adjustPortfolioSlice(next, existingPortfolioId, holdingId, input.ownerId, delta)

  const reason = input.reason?.trim() || (txs.length > 1 ? 'توحيد وتصحيح أرصدة افتتاحية متكررة' : 'تصحيح الرصيد الافتتاحي')
  const canonicalRevision: TransactionRevision = { version: canonical.version, changedAt: now(), reason, snapshot: snapshot(canonical) }
  const updatedCanonical: LedgerTransaction = {
    ...canonical,
    version: canonical.version + 1,
    revisions: [...canonical.revisions, canonicalRevision],
    amountSar: round2(input.quantity * input.unitCostSar),
    targetQuantity: round2(input.quantity),
    title: input.title?.trim() || canonical.title || 'إضافة رصيد افتتاحي',
    note: txs.length > 1 ? `تم توحيد ${txs.length} إدخالات افتتاحية في رصيد افتتاحي واحد.` : 'تم تعديل الرصيد الافتتاحي مع الاحتفاظ بتاريخ المراجعة.',
  }

  const redundantIds = new Set(txs.filter(tx => tx.id !== canonical.id).map(tx => tx.id))
  return {
    ...next,
    ledger: next.ledger.map(tx => {
      if (tx.id === canonical.id) return updatedCanonical
      if (!redundantIds.has(tx.id)) return tx
      return {
        ...tx,
        status: 'voided',
        version: tx.version + 1,
        revisions: [...tx.revisions, { version: tx.version, changedAt: now(), reason: 'أُلغي كإدخال افتتاحي مكرر أثناء التوحيد', snapshot: snapshot(tx) }],
        note: 'ملغاة: كان إدخالًا افتتاحيًا مكررًا وتم عكس أثره ضمن الرصيد الافتتاحي الموحد.',
      }
    }),
  }
}

export function voidOpeningBalance(state: FinanceState, transactionId: string, reason: string): FinanceState {
  const tx = state.ledger.find(t => t.id === transactionId)
  if (!tx || tx.kind !== 'opening' || tx.status !== 'posted') throw new Error('يمكن حذف/إلغاء رصيد افتتاحي نشط فقط')
  const why = reason.trim()
  if (!why) throw new Error('سبب الحذف/الإلغاء مطلوب')
  if (!tx.targetHoldingId || !tx.targetQuantity) throw new Error('الحركة الافتتاحية لا تحتوي تفاصيل كافية للعكس')
  const holding = state.holdings.find(h => h.id === tx.targetHoldingId && !h.archived)
  if (!holding) throw new Error('الرصيد المرتبط بالحركة غير موجود')

  const nextHolding = updateOwnerQuantity(holding, tx.ownerId, -tx.targetQuantity, tx.amountSar / tx.targetQuantity)
  let next: FinanceState = { ...state, holdings: state.holdings.map(h => h.id === holding.id ? nextHolding : h) }
  next = adjustPortfolioSlice(next, tx.portfolioId, holding.id, tx.ownerId, -tx.targetQuantity)

  const revision: TransactionRevision = { version: tx.version, changedAt: now(), reason: why, snapshot: snapshot(tx) }
  return {
    ...next,
    ledger: next.ledger.map(item => item.id === tx.id ? {
      ...item,
      status: 'voided',
      version: item.version + 1,
      revisions: [...item.revisions, revision],
      note: `ملغاة: ${why}`,
    } : item),
  }
}
