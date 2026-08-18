import { describe, expect, it } from 'vitest'
import { createAssetWithOpening, setAssetOpeningBalance } from '../src/application/assetTransactions'
import { purchaseAssetSimplified } from '../src/application/purchase'
import { emptyState } from '../src/data/emptyState'
import { ownerWeightedAverageCostSar } from '../src/domain/finance'
import { ownerHoldingCostBasisSar } from '../src/domain/lifecycle'

function sarCash(amount = 100_000) {
  return createAssetWithOpening(emptyState, {
    name: 'سيولة استثمارية', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: 'self',
    quantity: amount, costBasisSar: amount, marketPriceSar: 1, currency: 'SAR', performanceRole: 'transactional_cash',
  })
}

describe('exact cost-basis lots and FX opening basis', () => {
  it('stores the exact 50,000 SAR purchase basis for fractional fund units', () => {
    const state = sarCash()
    const cash = state.holdings.find(h => h.kind === 'cash')!
    const next = purchaseAssetSimplified(state, {
      sourceHoldingId: cash.id,
      ownerId: 'self',
      amountPaid: 50_000,
      assetTypeId: 'fund',
      name: 'صندوق التوزيعات الشهرية 2',
      quantity: 5_048.055,
      extraCostsSar: 0,
      marketQuote: null,
    })

    const fund = next.holdings.find(h => h.kind === 'fund')!
    const lot = fund.costLots[0]
    expect(lot.totalCostBasisSar).toBe(50_000)
    expect(lot.unitCostSar).toBeCloseTo(50_000 / 5_048.055, 12)
    expect(ownerHoldingCostBasisSar(fund, 'self')).toBe(50_000)
    expect(next.ledger[0].costBasisSar).toBe(50_000)

    const remainingCash = next.holdings.find(h => h.id === cash.id)!
    expect(ownerHoldingCostBasisSar(remainingCash, 'self')).toBe(50_000)
    expect(ownerWeightedAverageCostSar(remainingCash, 'self')).toBeCloseTo(1, 12)
  })

  it('keeps a foreign-currency opening basis unknown when the user did not provide it', () => {
    const created = createAssetWithOpening(emptyState, {
      name: 'حساب الدولار', kind: 'cash', symbol: 'USD', nativeUnit: 'USD', ownerId: 'self',
      quantity: 6_645, marketPriceSar: 3.75, currency: 'USD', performanceRole: 'transactional_cash',
    })
    const usd = created.holdings.find(h => h.symbol === 'USD')!
    const opening = created.ledger.find(tx => tx.kind === 'opening')!

    expect(usd.quantity).toBe(6_645)
    expect(usd.marketPriceSar).toBe(3.75)
    expect(usd.costLots[0].unitCostSar).toBeUndefined()
    expect(usd.costLots[0].totalCostBasisSar).toBeUndefined()
    expect(ownerHoldingCostBasisSar(usd, 'self')).toBeNull()
    expect(opening.costBasisSar).toBeNull()
    expect(opening.amountSar).toBe(24_918.75)
  })

  it('stores explicit historical FX basis separately from current valuation', () => {
    let state = createAssetWithOpening(emptyState, {
      name: 'دولار', kind: 'cash', symbol: 'USD', nativeUnit: 'USD', ownerId: 'self',
      quantity: 0, marketPriceSar: 3.75, currency: 'USD', performanceRole: 'transactional_cash',
    })
    const usd = state.holdings.find(h => h.symbol === 'USD')!
    state = setAssetOpeningBalance(state, { assetId: usd.id, ownerId: 'self', quantity: 1_000, unitCostSar: 3.70 })
    const updated = state.holdings.find(h => h.id === usd.id)!
    const opening = state.ledger[0]

    expect(ownerHoldingCostBasisSar(updated, 'self')).toBe(3_700)
    expect(opening.costBasisSar).toBe(3_700)
    expect(opening.amountSar).toBe(3_750)
  })
})
