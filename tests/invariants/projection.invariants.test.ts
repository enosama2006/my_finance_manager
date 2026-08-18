/**
 * INV-PROJECTION — the master invariant.
 * Authority: ADR-008 §2 and Invariant 4/6 — stored balances are materialized projections
 * of canonical facts and must be reproducible by replaying those facts.
 *
 * If this passes, most of the other defects become impossible to introduce silently.
 */
import { describe, expect, it } from 'vitest'
import { createAsset } from '../../src/application/assets'
import { addIncomeToAsset, createAssetWithOpening, transferBetweenAssets } from '../../src/application/assetTransactions'
import { createExpenseCategory, spendExpense } from '../../src/application/expenses'
import { purchaseAssetSimplified } from '../../src/application/purchase'
import { freshState, projectionDrift, SELF_ID } from './_harness'

describe('INV-030 — stored balances replay exactly from the ledger', () => {
  it('holds after a realistic same-currency lifecycle', () => {
    let state = freshState()
    state = createAssetWithOpening(state, { name: 'الراجحي', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID, quantity: 20_000, costBasisSar: 20_000, groupId: 'g-banks' })
    state = createAsset(state, { name: 'الإنماء', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID, quantity: 0, groupId: 'g-banks' })
    const [rajhi, alinma] = state.holdings

    state = addIncomeToAsset(state, { assetId: rajhi.id, ownerId: SELF_ID, quantity: 8_000, title: 'راتب' })
    state = transferBetweenAssets(state, { sourceAssetId: rajhi.id, targetAssetId: alinma.id, ownerId: SELF_ID, quantity: 5_000 })
    state = createExpenseCategory(state, { name: 'سكن' })
    const category = (state.expenseCategories ?? [])[0]
    state = spendExpense(state, { sourceHoldingId: alinma.id, ownerId: SELF_ID, quantity: 1_200, expenseCategoryId: category.id })
    state = purchaseAssetSimplified(state, {
      sourceHoldingId: rajhi.id, ownerId: SELF_ID, amountPaid: 5_400,
      assetTypeId: 'gold', name: 'ذهب', quantity: 10, targetGroupId: 'g-banks',
    })

    expect(projectionDrift(state)).toEqual([])
  })

  it('holds after a cross-currency movement', () => {
    let state = freshState()
    state = createAssetWithOpening(state, { name: 'ريال', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID, quantity: 7_500, costBasisSar: 7_500, groupId: 'g-banks' })
    state = createAsset(state, { name: 'دولار', kind: 'cash', symbol: 'USD', nativeUnit: 'USD', ownerId: SELF_ID, quantity: 0, groupId: 'g-banks' })
    const [sar, usd] = state.holdings

    state = transferBetweenAssets(state, { sourceAssetId: sar.id, targetAssetId: usd.id, ownerId: SELF_ID, quantity: 3_750, targetQuantity: 1_000 })

    expect(projectionDrift(state)).toEqual([])
  })

  it('holds when the same asset receives two fractional income events', () => {
    let state = freshState()
    state = createAsset(state, { name: 'محفظة كريبتو', kind: 'cash', symbol: 'USDT', nativeUnit: 'USDT', ownerId: SELF_ID, quantity: 0, marketPriceSar: 3.75, groupId: 'g-banks' })
    const wallet = state.holdings[0]
    state = addIncomeToAsset(state, { assetId: wallet.id, ownerId: SELF_ID, quantity: 0.004, title: 'عائد 1' })
    state = addIncomeToAsset(state, { assetId: wallet.id, ownerId: SELF_ID, quantity: 0.004, title: 'عائد 2' })

    expect(projectionDrift(state)).toEqual([])
  })

  it('holds for fractional quantities', () => {
    let state = freshState()
    state = createAssetWithOpening(state, { name: 'ريال', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID, quantity: 50_000, costBasisSar: 50_000, groupId: 'g-banks' })
    const sar = state.holdings[0]
    state = purchaseAssetSimplified(state, {
      sourceHoldingId: sar.id, ownerId: SELF_ID, amountPaid: 2_048,
      assetTypeId: 'crypto', name: 'بيتكوين', symbol: 'BTC', quantity: 0.00512, targetGroupId: 'g-banks',
    })

    expect(projectionDrift(state)).toEqual([])
  })
})
