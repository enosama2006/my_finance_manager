import { describe, expect, it } from 'vitest'
import { addAccount, addFunds } from '../src/application/commands'
import { applyManagedConversion, previewManagedConversion } from '../src/application/conversionPolicy'
import { createParty } from '../src/application/expenses'
import { previewSimplifiedPurchase, purchaseAssetSimplified } from '../src/application/purchase'
import { emptyState } from '../src/data/emptyState'
import { createSnapshot, parseSnapshot } from '../src/data/snapshot'
import { ownerHoldingCostBasisSar, holdingUnrealizedGainLossSar } from '../src/domain/lifecycle'

function prepared() {
  let state = createParty(emptyState, { name: 'مصرف الراجحي', type: 'bank' })
  const bank = state.parties.find(p => p.name === 'مصرف الراجحي')!
  state = addAccount(state, { name: 'الجاري', kind: 'checking', custodianId: bank.id, currency: 'SAR' })
  state = addAccount(state, { name: 'استثمار', kind: 'investment', custodianId: bank.id, currency: 'SAR' })
  const checking = state.accounts.find(a => a.name === 'الجاري')!
  state = addFunds(state, { accountId: checking.id, ownerId: 'self', symbol: 'SAR', nativeUnit: 'ر.س', quantity: 20_000, unitCostSar: 1, marketPriceSar: 1, classification: 'opening' })
  return { state, bank, checking, investment: state.accounts.find(a => a.name === 'استثمار')! }
}

describe('place-first purchase and realization policy', () => {
  it('keeps multiple accounts under one bank place', () => {
    const { state, bank } = prepared()
    expect(state.accounts.filter(a => a.custodianId === bank.id)).toHaveLength(2)
  })

  it('derives gold cost basis from amount paid and acquired quantity without a manual market field', () => {
    const { state, investment } = prepared()
    const cash = state.holdings.find(h => h.kind === 'cash')!
    const input = {
      sourceHoldingId: cash.id, ownerId: 'self', amountPaid: 5_400, targetAccountId: investment.id,
      assetTypeId: 'gold' as const, name: 'ذهب 24', symbol: 'XAU', quantity: 10,
      marketQuote: { unitPriceSar: 530, source: 'test-market', asOf: '2026-08-17T00:00:00Z', isLive: true },
    }
    const preview = previewSimplifiedPurchase(state, input)
    expect(preview.totalCostBasisSar).toBe(5_400)
    expect(preview.effectiveUnitCostSar).toBe(540)
    expect(preview.unrealizedAtPurchaseSar).toBe(-100)

    const next = purchaseAssetSimplified(state, input)
    const gold = next.holdings.find(h => h.assetTypeId === 'gold')!
    expect(ownerHoldingCostBasisSar(gold, 'self')).toBe(5_400)
    expect(holdingUnrealizedGainLossSar(gold, 'self')).toBe(-100)
    expect(gold.marketPriceSar).toBe(530)
  })

  it('does not realize P/L when an investment asset becomes another non-cash asset', () => {
    const { state, investment } = prepared()
    const cash = state.holdings.find(h => h.kind === 'cash')!
    const bought = purchaseAssetSimplified(state, {
      sourceHoldingId: cash.id, ownerId: 'self', amountPaid: 5_400, targetAccountId: investment.id,
      assetTypeId: 'gold', name: 'ذهب', symbol: 'XAU', quantity: 10,
      marketQuote: { unitPriceSar: 600, source: 'test-market', asOf: '2026-08-17T00:00:00Z', isLive: true },
    })
    const gold = bought.holdings.find(h => h.assetTypeId === 'gold')!
    const input = {
      sourceHoldingId: gold.id, targetSymbol: 'XRP', targetName: 'XRP', targetKind: 'crypto' as const, targetUnit: 'XRP',
      sourceQuantity: 10, targetQuantity: 5_000, targetUnitValueSarAtExecution: 1.2, feesSar: 50, ownerId: 'self',
      targetAccountId: investment.id, targetCustodianId: investment.custodianId,
    }
    const preview = previewManagedConversion(bought, input)
    expect(preview.realizationState).toBe('cost_continues')
    expect(preview.realizedGainLossSar).toBeNull()
    expect(preview.propagatedTargetBasisSar).toBe(5_450)

    const next = applyManagedConversion(bought, input)
    const tx = next.ledger[0]
    expect(tx.realizedGainLossSar).toBeNull()
    const xrp = next.holdings.find(h => h.symbol === 'XRP')!
    expect(ownerHoldingCostBasisSar(xrp, 'self')).toBe(5_450)
  })

  it('realizes P/L only when the asset exits to cash', () => {
    const { state, investment, checking } = prepared()
    const cash = state.holdings.find(h => h.kind === 'cash')!
    const bought = purchaseAssetSimplified(state, {
      sourceHoldingId: cash.id, ownerId: 'self', amountPaid: 5_400, targetAccountId: investment.id,
      assetTypeId: 'gold', name: 'ذهب', symbol: 'XAU', quantity: 10,
      marketQuote: { unitPriceSar: 550, source: 'test-market', asOf: '2026-08-17T00:00:00Z', isLive: true },
    })
    const gold = bought.holdings.find(h => h.assetTypeId === 'gold')!
    const input = {
      sourceHoldingId: gold.id, targetSymbol: 'SAR', targetName: 'ريال سعودي', targetKind: 'cash' as const, targetUnit: 'ر.س',
      sourceQuantity: 10, targetQuantity: 5_500, targetUnitValueSarAtExecution: 1, feesSar: 0, ownerId: 'self',
      targetAccountId: checking.id, targetCustodianId: checking.custodianId,
    }
    const preview = previewManagedConversion(bought, input)
    expect(preview.realizationState).toBe('realized_to_cash')
    expect(preview.realizedGainLossSar).toBe(100)
    expect(applyManagedConversion(bought, input).ledger[0].realizedGainLossSar).toBe(100)
  })

  it('round-trips a portable MyFinMan snapshot', () => {
    const { state } = prepared()
    const snapshot = createSnapshot(state)
    const restored = parseSnapshot(JSON.stringify(snapshot))
    expect(restored.accounts).toEqual(state.accounts)
    expect(restored.holdings).toEqual(state.holdings)
    expect(snapshot.format).toBe('myfinman-snapshot')
  })
})
