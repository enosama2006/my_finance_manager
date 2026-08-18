/**
 * INV-PRECISION — exact quantity and exact cost basis.
 * Authority: RULE-023 (exact lot basis, round display only), DEC-024, ADR-005.
 */
import { describe, expect, it } from 'vitest'
import { createAsset } from '../../src/application/assets'
import { createAssetWithOpening, transferBetweenAssets } from '../../src/application/assetTransactions'
import { addExistingAsset } from '../../src/application/commands'
import { lotCostBasisSar, ownerCostBasisSar } from '../../src/domain/finance'
import { freshState, SELF_ID } from './_harness'

describe('INV-001 — native quantity is never rounded to a money scale (RULE-023)', () => {
  it('preserves a fractional crypto opening balance exactly', () => {
    const state = createAssetWithOpening(freshState(), {
      name: 'بيتكوين', kind: 'crypto', symbol: 'BTC', nativeUnit: 'BTC', ownerId: SELF_ID,
      quantity: 0.00512, marketPriceSar: 400_000, costBasisSar: 2_048, groupId: 'g-banks',
    })
    expect(state.holdings[0].quantity).toBe(0.00512)
  })

  it('preserves a fractional fund unit quantity through a purchase-free path', () => {
    const state = createAssetWithOpening(freshState(), {
      name: 'صندوق', kind: 'fund', symbol: 'FUND', nativeUnit: 'وحدة', ownerId: SELF_ID,
      quantity: 1234.5678, marketPriceSar: 10, costBasisSar: 12_345.678, groupId: 'g-banks',
    })
    expect(state.holdings[0].quantity).toBe(1234.5678)
  })
})

describe('INV-002 — every known-basis lot persists an exact total, not a rounded unit cost (RULE-023)', () => {
  it('stores totalCostBasisSar when an existing asset is onboarded', () => {
    const state = addExistingAsset(freshState(), {
      ownerId: SELF_ID, accountId: 'acc-missing', name: 'ذهب', symbol: 'XAU', kind: 'metal',
      nativeUnit: 'غرام', quantity: 3, costBasisSar: 1_000, marketPriceSar: 400, performanceRole: 'store_of_value',
    })
    const lot = state.holdings[0].costLots[0]
    expect(lot.totalCostBasisSar).toBe(1_000)
    expect(lotCostBasisSar(lot)).toBe(1_000)
  })
})

describe('INV-003 — the base currency always has a unit cost basis of exactly 1', () => {
  it('does not give SAR a synthetic cost basis after an FX movement', () => {
    let state = freshState()
    state = createAssetWithOpening(state, { name: 'دولار', kind: 'cash', symbol: 'USD', nativeUnit: 'USD', ownerId: SELF_ID, quantity: 1_000, costBasisSar: 3_500, groupId: 'g-banks' })
    state = createAsset(state, { name: 'ريال', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID, quantity: 0, groupId: 'g-banks' })
    const [usd, sar] = state.holdings
    state = transferBetweenAssets(state, { sourceAssetId: usd.id, targetAssetId: sar.id, ownerId: SELF_ID, quantity: 1_000, targetQuantity: 3_750 })

    const sarAfter = state.holdings.find(h => h.id === sar.id)!
    expect(ownerCostBasisSar(sarAfter, SELF_ID)).toBe(3_750)
  })
})
