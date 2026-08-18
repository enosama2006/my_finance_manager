/**
 * INV-RECOGNITION — when value is realized, and how the executed rate is recorded.
 * Authority: RULE-011, CALC-015/016, ADR-007 §4-§6, ADR-008 Invariant 7.
 */
import { describe, expect, it } from 'vitest'
import { createAsset } from '../../src/application/assets'
import { createAssetWithOpening, transferBetweenAssets } from '../../src/application/assetTransactions'
import { applyManagedConversion, previewManagedConversion } from '../../src/application/conversionPolicy'
import { ownerCostBasisSar, realizedProfitByOwner } from '../../src/domain/finance'
import { freshState, SELF_ID } from './_harness'

function usdAndSar() {
  let state = freshState()
  state = createAssetWithOpening(state, { name: 'دولار', kind: 'cash', symbol: 'USD', nativeUnit: 'USD', ownerId: SELF_ID, quantity: 1_000, costBasisSar: 3_500, groupId: 'g-banks' })
  state = createAsset(state, { name: 'ريال', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID, quantity: 0, groupId: 'g-banks' })
  return { state, usdId: state.holdings[0].id, sarId: state.holdings[1].id }
}

describe('INV-010 — basis is either carried OR realized, never both (RULE-011 + ADR-007 §6)', () => {
  it('an FX movement that carries historical basis must not also post a realized result', () => {
    const { state, usdId, sarId } = usdAndSar()
    const next = transferBetweenAssets(state, { sourceAssetId: usdId, targetAssetId: sarId, ownerId: SELF_ID, quantity: 1_000, targetQuantity: 3_750 })
    const tx = next.ledger[0]
    const sarBasis = ownerCostBasisSar(next.holdings.find(h => h.id === sarId)!, SELF_ID)

    const carried = sarBasis === 3_500
    const realized = tx.realizedGainLossSar != null && tx.realizedGainLossSar !== 0
    expect(carried && realized).toBe(false)
  })
})

describe('INV-011 — one realized-profit truth across every lens (ADR-008 Invariant 7)', () => {
  it('reported realized profit equals the sum of realized results posted on the ledger', () => {
    const { state, usdId, sarId } = usdAndSar()
    const next = transferBetweenAssets(state, { sourceAssetId: usdId, targetAssetId: sarId, ownerId: SELF_ID, quantity: 1_000, targetQuantity: 3_750 })

    const ledgerRealized = next.ledger
      .filter(tx => tx.status === 'posted')
      .reduce((sum, tx) => sum + (tx.realizedGainLossSar ?? 0), 0)

    expect(realizedProfitByOwner(next, SELF_ID)).toBe(ledgerRealized)
  })
})

describe('INV-012 — one economic event, one answer, whichever door the user walks through', () => {
  it('«نقل أموال» and «تحويل أصل» agree on the resulting cost basis for USD→SAR', () => {
    const { state, usdId, sarId } = usdAndSar()

    const viaTransfer = transferBetweenAssets(state, { sourceAssetId: usdId, targetAssetId: sarId, ownerId: SELF_ID, quantity: 1_000, targetQuantity: 3_750 })
    const transferBasis = ownerCostBasisSar(viaTransfer.holdings.find(h => h.id === sarId)!, SELF_ID)

    const viaConversion = applyManagedConversion(state, {
      sourceHoldingId: usdId, ownerId: SELF_ID, targetSymbol: 'SAR', targetName: 'ريال', targetKind: 'cash',
      targetUnit: 'SAR', sourceQuantity: 1_000, targetQuantity: 3_750, targetUnitValueSarAtExecution: 1,
      feesSar: 0, targetGroupId: 'g-banks',
    })
    const conversionTarget = viaConversion.ledger[0].targetHoldingId!
    const conversionBasis = ownerCostBasisSar(viaConversion.holdings.find(h => h.id === conversionTarget)!, SELF_ID)

    expect(transferBasis).toBe(conversionBasis)
  })
})

describe('INV-013 — the executed FX rate is stored exactly and in one direction (ADR-007 §5)', () => {
  it('records source-units-per-target-unit without rounding it away', () => {
    let state = freshState()
    state = createAssetWithOpening(state, { name: 'ريال', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID, quantity: 3_750, costBasisSar: 3_750, groupId: 'g-banks' })
    const sar = state.holdings[0]

    const next = applyManagedConversion(state, {
      sourceHoldingId: sar.id, ownerId: SELF_ID, targetSymbol: 'USD', targetName: 'دولار', targetKind: 'cash',
      targetUnit: 'USD', sourceQuantity: 3_750, targetQuantity: 1_000, targetUnitValueSarAtExecution: 3.75,
      feesSar: 0, targetGroupId: 'g-banks',
    })

    expect(next.ledger[0].exchangeRate).toBe(3.75)
  })
})

describe('INV-014 — a conversion into an existing asset must not create a duplicate asset (RULE-022/DEC-024)', () => {
  it('reuses the existing USD cash asset instead of creating a second one', () => {
    let state = freshState()
    state = createAssetWithOpening(state, { name: 'ريال', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID, quantity: 3_750, costBasisSar: 3_750, groupId: 'g-banks' })
    state = createAsset(state, { name: 'دولار', kind: 'cash', symbol: 'USD', nativeUnit: 'USD', ownerId: SELF_ID, quantity: 0, groupId: 'g-banks' })
    const sar = state.holdings[0]

    const next = applyManagedConversion(state, {
      sourceHoldingId: sar.id, ownerId: SELF_ID, targetSymbol: 'USD', targetName: 'دولار', targetKind: 'cash',
      targetUnit: 'USD', sourceQuantity: 3_750, targetQuantity: 1_000, targetUnitValueSarAtExecution: 3.75,
      feesSar: 0, targetGroupId: 'g-banks',
    })

    expect(next.holdings.filter(h => h.symbol === 'USD').length).toBe(1)
  })
})
