import { describe, expect, it } from 'vitest'
import { accountValueSar, applyConversion, assertCostBasisCoverageInvariant, assertPhysicalQuantityInvariant, assertPortfolioAllocationInvariant, availableByOwner, netWorthByOwner, ownerWeightedAverageCostSar, portfolioRollupValueSar, previewConversion, updateValuation } from '../src/domain/finance'
import { seedState, SELF_ID } from '../src/data/seed'

const baseConversion = {
  sourceHoldingId: 'h-usd', targetSymbol: 'SAR', targetName: 'ريال سعودي', targetKind: 'currency' as const, targetUnit: 'ر.س',
  sourceQuantity: 1000, targetQuantity: 3800, targetUnitValueSarAtExecution: 1, feesSar: 10, ownerId: SELF_ID,
  targetAccountId: 'acc-alrajhi', targetCustodianId: 'party-alrajhi', targetLocation: 'جاري الراجحي',
}

describe('MyFinMan Foundation V4 invariants', () => {
  it('account digital twin totals holdings in that real account', () => { expect(accountValueSar(seedState, 'acc-alinma')).toBe(1000000) })
  it('portfolio tree rolls up children without duplicating parent value', () => { expect(portfolioRollupValueSar(seedState, 'p-commitments')).toBe(300000) })
  it('one portfolio can span several real accounts', () => { expect(portfolioRollupValueSar(seedState, 'p-monthly')).toBe(200000); expect(new Set(seedState.portfolioSlices.filter(s => s.portfolioId === 'p-monthly').map(s => seedState.holdings.find(h => h.id === s.holdingId)?.accountId)).size).toBe(2) })
  it('available comes from unallocated holding slices, not net worth minus targets', () => { expect(availableByOwner(seedState, SELF_ID)).toBeGreaterThan(0); expect(assertPortfolioAllocationInvariant(seedState)).toBe(true) })
  it('physical native quantity equals ownership shares and cost lots cover each owner share', () => { expect(seedState.holdings.every(assertPhysicalQuantityInvariant)).toBe(true); expect(seedState.holdings.every(assertCostBasisCoverageInvariant)).toBe(true) })
  it('third-party custody keeps ownership with the owner', () => { const silver = seedState.holdings.find(h => h.id === 'h-silver-ahmad')!; expect(silver.custodianId).toBe('party-ahmad'); expect(silver.ownership[0].ownerId).toBe(SELF_ID) })
  it('cost basis is owner-specific inside a shared holding', () => { const silver = seedState.holdings.find(h => h.id === 'h-shared-silver')!; expect(ownerWeightedAverageCostSar(silver, SELF_ID)).toBe(7.7); expect(ownerWeightedAverageCostSar(silver, 'party-owner-2')).toBe(7.9) })
  it('market valuation changes wealth but creates no ledger movement', () => { const beforeLedger = seedState.ledger.length; const before = netWorthByOwner(seedState, SELF_ID); const next = updateValuation(seedState, 'h-gold', 600, 'test'); expect(next.ledger.length).toBe(beforeLedger); expect(netWorthByOwner(next, SELF_ID)).toBeGreaterThan(before) })
  it('realized gain is calculated only on real conversion/disposal', () => { const p = previewConversion(seedState, baseConversion); expect(p.sourceCostBasisSar).toBe(3740); expect(p.realizedGainLossSar).toBe(50) })
  it('conversion cannot silently consume a protected portfolio slice', () => { const input = { ...baseConversion, sourceHoldingId: 'h-gold', sourceQuantity: 1, targetQuantity: 545 }; expect(() => previewConversion(seedState, input)).toThrow() })
  it('conversion from a selected portfolio preserves the economic purpose on the target', () => { const input = { ...baseConversion, sourceHoldingId: 'h-gold', sourcePortfolioId: 'p-invest', sourceQuantity: 1, targetQuantity: 545 }; const next = applyConversion(seedState, input, '2026-08-16T20:00:00.000Z'); const targetId = next.ledger[0].targetHoldingId!; expect(next.portfolioSlices.some(s => s.holdingId === targetId && s.portfolioId === 'p-invest')).toBe(true); expect(next.ledger[0].realizedGainLossSar).not.toBeNull(); expect(assertCostBasisCoverageInvariant(next.holdings.find(h => h.id === 'h-gold')!)).toBe(true) })
  it('weighted-average disposal keeps remaining lots covered and preserves remaining weighted cost', () => {
    const state = structuredClone(seedState)
    const usd = state.holdings.find(h => h.id === 'h-usd')!
    usd.costLots = [
      { id: 'usd-a', ownerId: SELF_ID, quantity: 6000, unitCostSar: 3.5 },
      { id: 'usd-b', ownerId: SELF_ID, quantity: 6000, unitCostSar: 4.0 },
    ]
    expect(ownerWeightedAverageCostSar(usd, SELF_ID)).toBe(3.75)
    const next = applyConversion(state, { ...baseConversion, sourceQuantity: 3000, targetQuantity: 11250, feesSar: 0 }, '2026-08-16T20:00:00.000Z')
    const remaining = next.holdings.find(h => h.id === 'h-usd')!
    expect(ownerWeightedAverageCostSar(remaining, SELF_ID)).toBe(3.75)
    expect(assertCostBasisCoverageInvariant(remaining)).toBe(true)
  })
})
