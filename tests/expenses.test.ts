import { describe, expect, it } from 'vitest'
import { emptyState } from '../src/data/emptyState'
import { seedState, SELF_ID } from '../src/data/seed'
import {
  createExpenseCategory,
  createParty,
  expenseCategorySpentSar,
  spendExpense,
  updateExpenseCategory,
} from '../src/application/expenses'

const clone = <T,>(value: T): T => structuredClone(value)

describe('empty onboarding', () => {
  it('starts with identity only and no financial/demo data', () => {
    expect(emptyState.parties).toEqual([{ id: SELF_ID, name: 'أنا', type: 'self' }])
    expect(emptyState.accounts).toHaveLength(0)
    expect(emptyState.holdings).toHaveLength(0)
    expect(emptyState.portfolios).toHaveLength(0)
    expect(emptyState.portfolioSlices).toHaveLength(0)
    expect(emptyState.expenseCategories).toHaveLength(0)
    expect(emptyState.ledger).toHaveLength(0)
  })

  it('allows adding a bank from the empty state', () => {
    const next = createParty(clone(emptyState), { name: 'مصرف تجريبي', type: 'bank' })
    expect(next.parties.some(p => p.name === 'مصرف تجريبي' && p.type === 'bank')).toBe(true)
  })
})

describe('hierarchical expense categories', () => {
  it('creates and reparents a category tree safely', () => {
    let state = clone(emptyState)
    state = createExpenseCategory(state, { name: 'السكن' })
    const housing = state.expenseCategories![0]
    state = createExpenseCategory(state, { name: 'الخدمات', parentId: housing.id })
    const services = state.expenseCategories!.find(c => c.name === 'الخدمات')!
    state = createExpenseCategory(state, { name: 'الكهرباء', parentId: services.id })
    const electricity = state.expenseCategories!.find(c => c.name === 'الكهرباء')!

    expect(electricity.parentId).toBe(services.id)
    expect(() => updateExpenseCategory(state, { id: housing.id, name: 'السكن', parentId: electricity.id })).toThrow()
  })
})

describe('expense posting', () => {
  function withCategory() {
    const state = createExpenseCategory(clone(seedState), { name: 'السكن' })
    return { state, categoryId: state.expenseCategories![0].id }
  }

  it('unlinked expense spends only free liquidity and leaves portfolios untouched', () => {
    const { state, categoryId } = withCategory()
    const beforeHolding = state.holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity
    const beforeSlices = clone(state.portfolioSlices)

    const next = spendExpense(state, {
      sourceHoldingId: 'h-alrajhi-sar', ownerId: SELF_ID, quantity: 1000, expenseCategoryId: categoryId, title: 'فاتورة',
    })

    expect(next.holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity).toBe(beforeHolding - 1000)
    expect(next.portfolioSlices).toEqual(beforeSlices)
    expect(next.ledger[0].kind).toBe('expense')
    expect(next.ledger[0].portfolioId).toBeUndefined()
    expect(next.ledger[0].expenseCategoryId).toBe(categoryId)
  })

  it('linked expense decreases the physical cash and the portfolio allocation', () => {
    const { state, categoryId } = withCategory()
    const beforeHolding = state.holdings.find(h => h.id === 'h-alinma-sar')!.quantity
    const beforeSchool = state.portfolioSlices.find(s => s.id === 's-school')!.quantity

    const next = spendExpense(state, {
      sourceHoldingId: 'h-alinma-sar', ownerId: SELF_ID, quantity: 5000, expenseCategoryId: categoryId, portfolioId: 'p-school',
    })

    expect(next.holdings.find(h => h.id === 'h-alinma-sar')!.quantity).toBe(beforeHolding - 5000)
    expect(next.portfolioSlices.find(s => s.id === 's-school')!.quantity).toBe(beforeSchool - 5000)
    expect(next.ledger[0].portfolioId).toBe('p-school')
  })

  it('can pay from free cash while consuming a portfolio backed elsewhere', () => {
    const { state, categoryId } = withCategory()
    const beforeRentValue = state.portfolioSlices.filter(s => s.portfolioId === 'p-rent').reduce((sum, s) => {
      const h = state.holdings.find(x => x.id === s.holdingId)!
      return sum + s.quantity * h.marketPriceSar
    }, 0)

    const next = spendExpense(state, {
      sourceHoldingId: 'h-alinma-sar', ownerId: SELF_ID, quantity: 10000, expenseCategoryId: categoryId, portfolioId: 'p-rent',
    })

    const afterRentValue = next.portfolioSlices.filter(s => s.portfolioId === 'p-rent').reduce((sum, s) => {
      const h = next.holdings.find(x => x.id === s.holdingId)!
      return sum + s.quantity * h.marketPriceSar
    }, 0)
    expect(Math.round(beforeRentValue - afterRentValue)).toBe(10000)
    expect(next.holdings.find(h => h.id === 'h-alinma-sar')!.quantity).toBe(990000)
  })

  it('rolls child-category spending into the parent category total', () => {
    let state = clone(seedState)
    state = createExpenseCategory(state, { name: 'السكن' })
    const housing = state.expenseCategories![0]
    state = createExpenseCategory(state, { name: 'كهرباء', parentId: housing.id })
    const electricity = state.expenseCategories!.find(c => c.name === 'كهرباء')!
    state = spendExpense(state, { sourceHoldingId: 'h-alrajhi-sar', ownerId: SELF_ID, quantity: 250, expenseCategoryId: electricity.id })

    expect(expenseCategorySpentSar(state, electricity.id)).toBe(250)
    expect(expenseCategorySpentSar(state, housing.id)).toBe(250)
  })
})
