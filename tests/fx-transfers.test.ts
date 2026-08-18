import { describe, expect, it } from 'vitest'
import { transferBetweenAssets } from '../src/application/assetTransactions'
import { voidTransaction } from '../src/application/transactionVoids'
import { ownerWeightedAverageCostSar } from '../src/domain/finance'
import type { FinanceState, Holding } from '../src/domain/types'

const ownerId = 'party-self'
function cash(id: string, symbol: string, quantity: number, marketPriceSar: number, basisPerUnit?: number): Holding {
  return {
    id,
    name: id,
    symbol,
    kind: 'cash',
    nativeUnit: symbol,
    quantity,
    marketPriceSar,
    costLots: quantity > 0 ? [{ id: `lot-${id}`, ownerId, quantity, unitCostSar: basisPerUnit, totalCostBasisSar: basisPerUnit == null ? undefined : quantity * basisPerUnit }] : [],
    valuationMethod: symbol === 'SAR' ? 'nominal' : 'fx',
    ownership: quantity > 0 ? [{ ownerId, quantity }] : [],
    performanceRole: 'transactional_cash',
    currency: symbol,
  }
}
function state(source: Holding, target: Holding): FinanceState {
  return {
    schemaVersion: 5,
    costBasisMethod: 'weighted_average',
    parties: [{ id: ownerId, name: 'أنا', type: 'self' }],
    accountGroups: [], accounts: [], holdings: [source, target], portfolios: [], portfolioSlices: [],
    expenseCategories: [], expenseBeneficiaries: [], ledger: [], incomeStreams: [], liabilities: [], claims: [], positions: [], capitalCycles: [],
  }
}

describe('cross-currency cash transfers', () => {
  it('derives target amount from source-per-target FX rate and stores both', () => {
    const initial = state(cash('sar', 'SAR', 1000, 1, 1), cash('usd', 'USD', 0, 3.75))
    const next = transferBetweenAssets(initial, { sourceAssetId: 'sar', targetAssetId: 'usd', ownerId, quantity: 750, exchangeRate: 3.75 })
    expect(next.holdings.find(h => h.id === 'sar')?.quantity).toBe(250)
    expect(next.holdings.find(h => h.id === 'usd')?.quantity).toBe(200)
    expect(ownerWeightedAverageCostSar(next.holdings.find(h => h.id === 'usd')!, ownerId)).toBe(3.75)
    expect(next.ledger[0].sourceQuantity).toBe(750)
    expect(next.ledger[0].targetQuantity).toBe(200)
    expect(next.ledger[0].exchangeRate).toBe(3.75)
    expect(next.ledger[0].costBasisSar).toBe(750)
  })

  it('derives FX rate when the user enters the final target amount', () => {
    const initial = state(cash('sar', 'SAR', 1000, 1, 1), cash('usd', 'USD', 0, 3.75))
    const next = transferBetweenAssets(initial, { sourceAssetId: 'sar', targetAssetId: 'usd', ownerId, quantity: 375, targetQuantity: 100 })
    expect(next.ledger[0].targetQuantity).toBe(100)
    expect(next.ledger[0].exchangeRate).toBe(3.75)
  })

  it('voids an FX transfer and restores the historical source basis', () => {
    const initial = state(cash('usd', 'USD', 200, 4, 3.5), cash('sar', 'SAR', 0, 1))
    const moved = transferBetweenAssets(initial, { sourceAssetId: 'usd', targetAssetId: 'sar', ownerId, quantity: 100, targetQuantity: 400 })
    expect(moved.ledger[0].realizedGainLossSar).toBe(50)
    const restored = voidTransaction(moved, moved.ledger[0].id, 'اختبار العكس')
    const usd = restored.holdings.find(h => h.id === 'usd')!
    const sar = restored.holdings.find(h => h.id === 'sar')!
    expect(usd.quantity).toBe(200)
    expect(sar.quantity).toBe(0)
    expect(ownerWeightedAverageCostSar(usd, ownerId)).toBe(3.5)
  })

  it('does not invent historical basis when the source basis is unknown', () => {
    const initial = state(cash('usd', 'USD', 100, 3.75), cash('sar', 'SAR', 0, 1))
    const moved = transferBetweenAssets(initial, { sourceAssetId: 'usd', targetAssetId: 'sar', ownerId, quantity: 50, targetQuantity: 187.5 })
    expect(moved.ledger[0].costBasisSar).toBeNull()
    expect(ownerWeightedAverageCostSar(moved.holdings.find(h => h.id === 'sar')!, ownerId)).toBeNull()
    const restored = voidTransaction(moved, moved.ledger[0].id, 'اختبار basis مجهول')
    expect(ownerWeightedAverageCostSar(restored.holdings.find(h => h.id === 'usd')!, ownerId)).toBeNull()
  })
})
