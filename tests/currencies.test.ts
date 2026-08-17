import { describe, expect, it } from 'vitest'
import { currencyReferenceRateSar, formatReportingValue, holdingUnitValueSar, sarToReporting } from '../src/domain/currencies'
import { holdingValueSar } from '../src/domain/finance'
import type { Holding } from '../src/domain/types'

function cash(symbol: string, quantity: number, storedMarketPriceSar: number): Holding {
  return {
    id: `holding-${symbol}`,
    symbol,
    name: `رصيد ${symbol}`,
    kind: 'cash',
    nativeUnit: symbol,
    quantity,
    marketPriceSar: storedMarketPriceSar,
    costLots: [{ id: 'lot-1', ownerId: 'party-self', quantity, unitCostSar: storedMarketPriceSar }],
    valuationMethod: symbol === 'SAR' ? 'nominal' : 'fx',
    accountId: 'acc-1',
    custodianId: 'party-self',
    ownership: [{ ownerId: 'party-self', quantity }],
  }
}

describe('currency valuation and reporting', () => {
  it('values USD cash at 3.75 SAR even when legacy stored market price is 1', () => {
    const usd = cash('USD', 40, 1)
    expect(currencyReferenceRateSar('USD')).toBe(3.75)
    expect(holdingUnitValueSar(usd)).toBe(3.75)
    expect(holdingValueSar(usd)).toBe(150)
  })

  it('keeps native quantity while converting SAR rollups to the reporting currency', () => {
    expect(sarToReporting(150, 'USD')).toBe(40)
    expect(formatReportingValue(150, 'SAR')).toContain('150')
    expect(formatReportingValue(150, 'USD')).toContain('40')
  })

  it('does not override non-cash market valuation', () => {
    const gold: Holding = { ...cash('XAU', 2, 530), kind: 'metal', valuationMethod: 'market_quote' }
    expect(holdingUnitValueSar(gold)).toBe(530)
    expect(holdingValueSar(gold)).toBe(1060)
  })
})
