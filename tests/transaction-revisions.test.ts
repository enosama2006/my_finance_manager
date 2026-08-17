import { describe, expect, it } from 'vitest'
import { emptyState } from '../src/data/emptyState'
import { reviseTransaction } from '../src/application/transactionRevisions'
import type { FinanceState, LedgerTransaction } from '../src/domain/types'

function baseExpense(): LedgerTransaction {
  return {
    id: 'tx-1', version: 1, status: 'posted', revisions: [], at: '2026-08-17T10:00:00.000Z', kind: 'expense',
    title: 'مطعم', amountSar: 150, ownerId: 'self-user', sourceHoldingId: 'cash-1', sourceQuantity: 150,
    expenseCategoryId: 'cat-food', expenseNecessity: 'discretionary', expenseBeneficiaryId: 'ben-self', note: 'قديم',
  }
}

function stateWithExpense(): FinanceState {
  return {
    ...structuredClone(emptyState),
    expenseCategories: [
      { id: 'cat-food', name: 'مطاعم', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', defaultNecessity: 'discretionary' },
      { id: 'cat-work', name: 'وجبات عمل', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', defaultNecessity: 'flexible' },
    ],
    expenseBeneficiaries: [
      { id: 'ben-self', name: 'أنا', kind: 'person', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'ben-family', name: 'العائلة', kind: 'group', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    holdings: [{
      id: 'cash-1', symbol: 'SAR', name: 'رصيد SAR', kind: 'cash', nativeUnit: 'SAR', quantity: 850, marketPriceSar: 1,
      costLots: [{ id: 'lot-1', ownerId: 'self-user', quantity: 850, unitCostSar: 1 }], valuationMethod: 'nominal',
      accountId: 'acc-1', custodianId: 'self-user', ownership: [{ ownerId: 'self-user', quantity: 850 }],
    }],
    accounts: [{ id: 'acc-1', name: 'الجاري', kind: 'checking', custodianId: 'self-user', status: 'active', currency: 'SAR' }],
    ledger: [baseExpense()],
  }
}

describe('logical transaction revisions', () => {
  it('revises safe expense metadata while preserving financial effects and identity', () => {
    const state = stateWithExpense()
    const holdingsBefore = structuredClone(state.holdings)
    const next = reviseTransaction(state, {
      transactionId: 'tx-1', reason: 'تصحيح التصنيف والمستفيد', at: '2026-08-17T11:30:00.000Z', title: 'غداء عمل', note: 'مع الفريق',
      expenseCategoryId: 'cat-work', expenseBeneficiaryId: 'ben-family', expenseNecessity: 'flexible',
    })
    const tx = next.ledger[0]
    expect(tx.id).toBe('tx-1')
    expect(tx.version).toBe(2)
    expect(tx.amountSar).toBe(150)
    expect(tx.sourceHoldingId).toBe('cash-1')
    expect(tx.sourceQuantity).toBe(150)
    expect(tx.expenseCategoryId).toBe('cat-work')
    expect(tx.expenseBeneficiaryId).toBe('ben-family')
    expect(tx.expenseNecessity).toBe('flexible')
    expect(next.holdings).toEqual(holdingsBefore)
    expect(tx.revisions).toHaveLength(1)
    expect(tx.revisions[0].version).toBe(1)
    expect(tx.revisions[0].snapshot.title).toBe('مطعم')
    expect(tx.revisions[0].snapshot.expenseCategoryId).toBe('cat-food')
  })

  it('preserves every prior version across repeated edits', () => {
    let state = stateWithExpense()
    state = reviseTransaction(state, { transactionId: 'tx-1', reason: 'تصحيح العنوان', at: '2026-08-17T10:00:00.000Z', title: 'غداء', note: 'قديم', expenseCategoryId: 'cat-food', expenseBeneficiaryId: 'ben-self', expenseNecessity: 'discretionary' })
    state = reviseTransaction(state, { transactionId: 'tx-1', reason: 'تصحيح التاريخ', at: '2026-08-18T10:00:00.000Z', title: 'غداء', note: 'قديم', expenseCategoryId: 'cat-food', expenseBeneficiaryId: 'ben-self', expenseNecessity: 'discretionary' })
    const tx = state.ledger[0]
    expect(tx.version).toBe(3)
    expect(tx.revisions.map(r => r.version)).toEqual([1, 2])
    expect(tx.revisions[0].snapshot.title).toBe('مطعم')
    expect(tx.revisions[1].snapshot.title).toBe('غداء')
  })

  it('requires an audit reason', () => {
    const state = stateWithExpense()
    expect(() => reviseTransaction(state, { transactionId: 'tx-1', reason: ' ', at: '2026-08-17T10:00:00.000Z', title: 'مطعم' })).toThrow('سبب التعديل مطلوب')
  })
})
