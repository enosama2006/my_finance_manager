import type { ExpenseNecessity, FinanceState, LedgerTransaction, TransactionRevision } from '../domain/types'

const now = () => new Date().toISOString()

export interface ReviseTransactionInput {
  transactionId: string
  reason: string
  at: string
  title: string
  note?: string
  expenseCategoryId?: string
  expenseBeneficiaryId?: string
  expenseNecessity?: ExpenseNecessity
}

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
    userInput: tx.userInput,
  }
}

/** Safe revision for fields that do not alter the posted economic effects. */
export function reviseTransaction(state: FinanceState, input: ReviseTransactionInput): FinanceState {
  const current = state.ledger.find(tx => tx.id === input.transactionId)
  if (!current) throw new Error('الحركة غير موجودة')
  if (current.status !== 'posted') throw new Error('يمكن تعديل الحركات المرحلة فقط عبر سجل المراجعات')

  const reason = input.reason.trim()
  const title = input.title.trim()
  if (!reason) throw new Error('سبب التعديل مطلوب لحفظ سجل المراجعة')
  if (!title) throw new Error('عنوان الحركة مطلوب')
  const at = new Date(input.at)
  if (Number.isNaN(at.getTime())) throw new Error('تاريخ الحركة غير صالح')

  let expenseCategoryId = current.expenseCategoryId
  let expenseBeneficiaryId = current.expenseBeneficiaryId
  let expenseNecessity = current.expenseNecessity

  if (current.kind === 'expense') {
    if (input.expenseCategoryId) {
      const category = (state.expenseCategories ?? []).find(c => c.id === input.expenseCategoryId)
      if (!category) throw new Error('بند الصرف غير موجود')
      expenseCategoryId = category.id
    }
    if (input.expenseBeneficiaryId) {
      const beneficiary = (state.expenseBeneficiaries ?? []).find(b => b.id === input.expenseBeneficiaryId)
      if (!beneficiary) throw new Error('المستفيد غير موجود')
      expenseBeneficiaryId = beneficiary.id
    } else {
      expenseBeneficiaryId = undefined
    }
    expenseNecessity = input.expenseNecessity
  }

  const revision: TransactionRevision = {
    version: current.version,
    changedAt: now(),
    reason,
    snapshot: snapshot(current),
  }

  const updated: LedgerTransaction = {
    ...current,
    version: current.version + 1,
    revisions: [...current.revisions, revision],
    at: at.toISOString(),
    title,
    note: input.note?.trim() || undefined,
    expenseCategoryId,
    expenseBeneficiaryId,
    expenseNecessity,
  }

  return { ...state, ledger: state.ledger.map(tx => tx.id === current.id ? updated : tx) }
}
