import { describe, expect, it } from 'vitest'
import { applyConversion, applyPureReallocation, assertPhysicalQuantityInvariant, netWorthByOwner, previewConversion } from '../src/domain/finance'
import { seedState, SELF_ID } from '../src/data/seed'

const baseConversion = {
  sourceHoldingId: 'h-usd',
  targetSymbol: 'SAR',
  targetName: 'ريال سعودي',
  targetKind: 'currency' as const,
  targetUnit: 'ر.س',
  sourceQuantity: 1000,
  targetQuantity: 3800,
  targetUnitValueSarAtExecution: 1,
  feesSar: 10,
  ownerId: SELF_ID,
  targetContainer: 'ناتج التحويل',
  targetCustodianId: SELF_ID,
  targetLocation: 'بحوزتي',
}

describe('MyFinMan domain invariants', () => {
  it('pure reallocation never changes physical net worth', () => {
    const before = netWorthByOwner(seedState, SELF_ID)
    const next = applyPureReallocation(seedState, 'a-emergency', 110000)
    expect(netWorthByOwner(next, SELF_ID)).toBe(before)
    expect(next.ledger).toEqual(seedState.ledger)
  })

  it('calculates realized gain only for asset conversion', () => {
    const p = previewConversion(seedState, baseConversion)
    expect(p.sourceCostBasisSar).toBe(3740)
    expect(p.proceedsSar).toBe(3800)
    expect(p.realizedGainLossSar).toBe(50)
  })

  it('conversion reduces source, creates target and immutable event', () => {
    const next = applyConversion(seedState, baseConversion, '2026-08-16T20:00:00.000Z')
    const source = next.holdings.find(h => h.id === 'h-usd')!
    const target = next.holdings.find(h => h.id === next.ledger[0].targetHoldingId)!
    expect(source.quantity).toBe(11000)
    expect(target.quantity).toBe(3800)
    expect(next.ledger[0].kind).toBe('conversion')
    expect(next.ledger[0].realizedGainLossSar).toBe(50)
    expect(assertPhysicalQuantityInvariant(source)).toBe(true)
    expect(assertPhysicalQuantityInvariant(target)).toBe(true)
  })

  it('third-party custody does not change ownership quantity', () => {
    const silver = seedState.holdings.find(h => h.id === 'h-silver-ahmad')!
    expect(silver.custodianId).toBe('party-ahmad')
    expect(silver.ownership.find(s => s.ownerId === SELF_ID)?.quantity).toBe(500)
    expect(assertPhysicalQuantityInvariant(silver)).toBe(true)
  })
})
