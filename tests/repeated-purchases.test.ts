import { describe, expect, it } from 'vitest'
import { createAssetWithOpening } from '../src/application/assetTransactions'
import { correctAssetPurchase, voidAssetPurchase } from '../src/application/assetPurchaseCorrections'
import { purchaseAssetSimplified } from '../src/application/purchase'
import { emptyState } from '../src/data/emptyState'
import { SELF_ID } from '../src/data/seed'
import { ownerCostBasisSar, ownerWeightedAverageCostSar } from '../src/domain/finance'

function baseCash(amount = 100_000) {
  return createAssetWithOpening(emptyState, {
    name: 'سيولة الراجحي المالية', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID,
    quantity: amount, costBasisSar: amount, marketPriceSar: 1, currency: 'SAR', performanceRole: 'transactional_cash',
  })
}
function firstFundPurchase() {
  const state = baseCash()
  const cash = state.holdings.find(h => h.kind === 'cash')!
  const next = purchaseAssetSimplified(state, {
    sourceHoldingId: cash.id, ownerId: SELF_ID, amountPaid: 50_000,
    assetTypeId: 'fund', name: 'صندوق الراجحي للتوزيعات الشهرية 2', symbol: 'FUND-A', quantity: 5_048.055,
  })
  return { state: next, cashId: cash.id, fundId: next.holdings.find(h => h.kind === 'fund')!.id }
}

describe('repeated purchases / DCA into an existing Asset', () => {
  it('adds a second exact lot to the same selected Fund Asset and derives weighted average', () => {
    const first = firstFundPurchase()
    const next = purchaseAssetSimplified(first.state, {
      sourceHoldingId: first.cashId, ownerId: SELF_ID, amountPaid: 10_000,
      targetAssetId: first.fundId, assetTypeId: 'fund', name: 'ignored for existing', quantity: 1_000,
    })
    const funds = next.holdings.filter(h => h.kind === 'fund')
    expect(funds).toHaveLength(1)
    const fund = funds[0]
    expect(fund.quantity).toBeCloseTo(6_048.055, 9)
    expect(fund.costLots).toHaveLength(2)
    expect(fund.costLots.map(l => l.totalCostBasisSar)).toEqual([50_000, 10_000])
    expect(ownerCostBasisSar(fund, SELF_ID)).toBe(60_000)
    expect(ownerWeightedAverageCostSar(fund, SELF_ID)).toBeCloseTo(60_000 / 6_048.055, 12)
    expect(next.positions).toHaveLength(1)
    expect(next.positions![0].initialCostBasisSar).toBe(60_000)
    expect(next.holdings.find(h => h.id === first.cashId)!.quantity).toBe(40_000)
    const purchases = next.ledger.filter(tx => tx.kind === 'asset_purchase' && tx.status === 'posted')
    expect(purchases).toHaveLength(2)
    expect(purchases[0].targetHoldingId).toBe(first.fundId)
    expect(purchases[0].userInput?.kind === 'asset_purchase' && purchases[0].userInput.targetAssetId).toBe(first.fundId)
  })

  it('voids only the selected repeated-purchase lot and leaves the original holding intact', () => {
    const first = firstFundPurchase()
    const twice = purchaseAssetSimplified(first.state, {
      sourceHoldingId: first.cashId, ownerId: SELF_ID, amountPaid: 10_000,
      targetAssetId: first.fundId, assetTypeId: 'fund', name: 'same', quantity: 1_000,
    })
    const secondTx = twice.ledger.find(tx => tx.kind === 'asset_purchase' && tx.userInput?.kind === 'asset_purchase' && tx.userInput.targetAssetId === first.fundId)!
    const next = voidAssetPurchase(twice, secondTx.id, 'إلغاء الدفعة الثانية')
    const fund = next.holdings.find(h => h.id === first.fundId)!
    expect(fund.quantity).toBeCloseTo(5_048.055, 9)
    expect(fund.costLots).toHaveLength(1)
    expect(ownerCostBasisSar(fund, SELF_ID)).toBe(50_000)
    expect(next.holdings.find(h => h.id === first.cashId)!.quantity).toBe(50_000)
    expect(next.positions).toHaveLength(1)
    expect(next.positions![0].initialCostBasisSar).toBe(50_000)
    expect(next.ledger.find(tx => tx.id === secondTx.id)?.status).toBe('voided')
  })

  it('corrects one repeated purchase without rewriting the earlier lot or logical transaction identity', () => {
    const first = firstFundPurchase()
    const twice = purchaseAssetSimplified(first.state, {
      sourceHoldingId: first.cashId, ownerId: SELF_ID, amountPaid: 10_000,
      targetAssetId: first.fundId, assetTypeId: 'fund', name: 'same', quantity: 1_000,
    })
    const secondTx = twice.ledger.find(tx => tx.kind === 'asset_purchase' && tx.userInput?.kind === 'asset_purchase' && tx.userInput.targetAssetId === first.fundId)!
    const next = correctAssetPurchase(twice, {
      transactionId: secondTx.id, reason: 'تصحيح الدفعة الثانية', at: secondTx.at,
      sourceHoldingId: first.cashId, ownerId: SELF_ID, amountPaid: 20_000,
      targetAssetId: first.fundId, assetTypeId: 'fund', name: 'صندوق الراجحي للتوزيعات الشهرية 2', quantity: 2_000,
    })
    const fund = next.holdings.find(h => h.id === first.fundId)!
    expect(fund.quantity).toBeCloseTo(7_048.055, 9)
    expect(fund.costLots).toHaveLength(2)
    expect(fund.costLots.map(l => l.totalCostBasisSar)).toEqual([50_000, 20_000])
    expect(ownerCostBasisSar(fund, SELF_ID)).toBe(70_000)
    expect(next.holdings.find(h => h.id === first.cashId)!.quantity).toBe(30_000)
    const corrected = next.ledger.find(tx => tx.id === secondTx.id)!
    expect(corrected.version).toBe(2)
    expect(corrected.revisions).toHaveLength(1)
    expect(fund.costLots.some(l => l.sourceTransactionId === secondTx.id && l.totalCostBasisSar === 20_000)).toBe(true)
  })

  it('restores exact mixed portfolio funding when a repeated purchase is voided', () => {
    let state = baseCash()
    const cash = state.holdings.find(h => h.kind === 'cash')!
    state = {
      ...state,
      portfolios: [{ id: 'p-growth', name: 'استثمار', ownerIds: [SELF_ID], status: 'active', profile: 'investment' }],
      portfolioSlices: [{ id: 'slice-cash', portfolioId: 'p-growth', holdingId: cash.id, ownerId: SELF_ID, quantity: 60_000 }],
    }
    state = purchaseAssetSimplified(state, {
      sourceHoldingId: cash.id, ownerId: SELF_ID, amountPaid: 50_000, portfolioId: 'p-growth',
      assetTypeId: 'fund', name: 'صندوق', symbol: 'F', quantity: 5_000,
    })
    const fund = state.holdings.find(h => h.kind === 'fund')!
    state = purchaseAssetSimplified(state, {
      sourceHoldingId: cash.id, ownerId: SELF_ID, amountPaid: 20_000, portfolioId: 'p-growth',
      targetAssetId: fund.id, assetTypeId: 'fund', name: 'صندوق', quantity: 2_000,
    })
    const second = state.ledger.find(tx => tx.kind === 'asset_purchase' && tx.userInput?.kind === 'asset_purchase' && tx.userInput.targetAssetId === fund.id)!
    expect(second.userInput?.kind === 'asset_purchase' && second.userInput.sourcePortfolioQuantityConsumed).toBe(10_000)
    const voided = voidAssetPurchase(state, second.id, 'إلغاء الدفعة')
    const sourceSlice = voided.portfolioSlices.find(s => s.portfolioId === 'p-growth' && s.holdingId === cash.id)!
    const fundSlice = voided.portfolioSlices.find(s => s.portfolioId === 'p-growth' && s.holdingId === fund.id)!
    expect(sourceSlice.quantity).toBe(10_000)
    expect(fundSlice.quantity).toBe(5_000)
    expect(voided.holdings.find(h => h.id === cash.id)!.quantity).toBe(50_000)
    expect(voided.holdings.find(h => h.id === fund.id)!.quantity).toBe(5_000)
  })

  it('does not auto-merge same-name instruments across Groups; explicit target selection controls accumulation', () => {
    let state = baseCash(120_000)
    const cash = state.holdings.find(h => h.kind === 'cash')!
    state = { ...state, accountGroups: [
      { id: 'g-a', name: 'حفظ A', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'g-b', name: 'حفظ B', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
    ] }
    state = purchaseAssetSimplified(state, { sourceHoldingId: cash.id, ownerId: SELF_ID, amountPaid: 20_000, targetGroupId: 'g-a', assetTypeId: 'gold', name: 'ذهب', symbol: 'XAU', quantity: 20 })
    const goldA = state.holdings.find(h => h.kind === 'metal')!
    state = purchaseAssetSimplified(state, { sourceHoldingId: cash.id, ownerId: SELF_ID, amountPaid: 10_000, targetGroupId: 'g-b', assetTypeId: 'gold', name: 'ذهب', symbol: 'XAU', quantity: 10 })
    expect(state.holdings.filter(h => h.kind === 'metal')).toHaveLength(2)
    state = purchaseAssetSimplified(state, { sourceHoldingId: cash.id, ownerId: SELF_ID, amountPaid: 5_000, targetAssetId: goldA.id, assetTypeId: 'gold', name: 'ذهب', quantity: 5 })
    expect(state.holdings.filter(h => h.kind === 'metal')).toHaveLength(2)
    expect(state.holdings.find(h => h.id === goldA.id)!.quantity).toBe(25)
    expect(state.holdings.find(h => h.kind === 'metal' && h.id !== goldA.id)!.quantity).toBe(10)
  })
})
