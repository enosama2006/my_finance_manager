import { describe, expect, it } from 'vitest'
import { addAccount, addFunds } from '../src/application/commands'
import { correctAssetPurchase, voidAssetPurchase } from '../src/application/assetPurchaseCorrections'
import { hydrateTransactionUserInputs } from '../src/application/transactionInputMigration'
import { purchaseAssetSimplified } from '../src/application/purchase'
import { emptyState } from '../src/data/emptyState'
import { SELF_ID } from '../src/data/seed'

function prepared() {
  let state = addAccount(emptyState, { name: 'الراجحي الجاري', kind: 'checking', custodianId: SELF_ID, currency: 'SAR' })
  state = addAccount(state, { name: 'الإنماء الجاري', kind: 'checking', custodianId: SELF_ID, currency: 'SAR' })
  state = addAccount(state, { name: 'حساب أصول الذهب', kind: 'custody', custodianId: SELF_ID })
  const rajhi = state.accounts.find(a => a.name === 'الراجحي الجاري')!
  const alinma = state.accounts.find(a => a.name === 'الإنماء الجاري')!
  const goldAccount = state.accounts.find(a => a.name === 'حساب أصول الذهب')!
  state = addFunds(state, { accountId: rajhi.id, ownerId: SELF_ID, symbol: 'SAR', nativeUnit: 'ر.س', quantity: 1_000, unitCostSar: 1, marketPriceSar: 1, classification: 'opening' })
  state = addFunds(state, { accountId: alinma.id, ownerId: SELF_ID, symbol: 'SAR', nativeUnit: 'ر.س', quantity: 2_000, unitCostSar: 1, marketPriceSar: 1, classification: 'opening' })
  const rajhiCash = state.holdings.find(h => h.accountId === rajhi.id && h.kind === 'cash')!
  const alinmaCash = state.holdings.find(h => h.accountId === alinma.id && h.kind === 'cash')!
  state = purchaseAssetSimplified(state, {
    sourceHoldingId: rajhiCash.id,
    ownerId: SELF_ID,
    amountPaid: 387.41,
    targetAccountId: rajhi.id,
    assetTypeId: 'gold',
    name: 'ذهب',
    symbol: 'XAU',
    quantity: 1,
    marketQuote: { unitPriceSar: 530, source: 'user-entry', asOf: '2026-08-17T15:46:52.155Z', isLive: false },
  })
  return { state, rajhi, alinma, goldAccount, rajhiCashId: rajhiCash.id, alinmaCashId: alinmaCash.id }
}

describe('audited asset purchase correction', () => {
  it('moves an asset to the corrected account without creating a transfer or changing the cash result', () => {
    const { state, goldAccount, rajhiCashId } = prepared()
    const tx = state.ledger.find(t => t.kind === 'asset_purchase')!
    const corrected = correctAssetPurchase(state, {
      transactionId: tx.id,
      reason: 'تم اختيار حساب حفظ خاطئ',
      at: tx.at,
      sourceHoldingId: rajhiCashId,
      ownerId: SELF_ID,
      amountPaid: 387.41,
      targetAccountId: goldAccount.id,
      assetTypeId: 'gold',
      name: 'ذهب',
      symbol: 'XAU',
      quantity: 1,
      marketUnitPriceSar: 530,
      marketSource: 'user-entry',
    })
    const gold = corrected.holdings.find(h => h.kind === 'metal')!
    const cash = corrected.holdings.find(h => h.id === rajhiCashId)!
    const correctedTx = corrected.ledger.find(t => t.id === tx.id)!
    expect(gold.accountId).toBe(goldAccount.id)
    expect(cash.quantity).toBe(612.59)
    expect(corrected.ledger.filter(t => t.kind === 'real_transfer')).toHaveLength(0)
    expect(correctedTx.version).toBe(2)
    expect(correctedTx.revisions).toHaveLength(1)
    expect(correctedTx.userInput?.kind).toBe('asset_purchase')
    expect(correctedTx.userInput?.targetAccountId).toBe(goldAccount.id)
  })

  it('can correct the bank/source that was charged and restores the old source first', () => {
    const { state, goldAccount, rajhiCashId, alinmaCashId } = prepared()
    const tx = state.ledger.find(t => t.kind === 'asset_purchase')!
    const corrected = correctAssetPurchase(state, {
      transactionId: tx.id,
      reason: 'الخصم كان من الإنماء وليس الراجحي',
      at: tx.at,
      sourceHoldingId: alinmaCashId,
      ownerId: SELF_ID,
      amountPaid: 387.41,
      targetAccountId: goldAccount.id,
      assetTypeId: 'gold',
      name: 'ذهب',
      symbol: 'XAU',
      quantity: 1,
      marketUnitPriceSar: 530,
    })
    expect(corrected.holdings.find(h => h.id === rajhiCashId)!.quantity).toBe(1_000)
    expect(corrected.holdings.find(h => h.id === alinmaCashId)!.quantity).toBe(1_612.59)
  })

  it('voids a mistaken purchase by restoring cash and removing the generated asset while retaining audit', () => {
    const { state, rajhiCashId } = prepared()
    const tx = state.ledger.find(t => t.kind === 'asset_purchase')!
    const next = voidAssetPurchase(state, tx.id, 'الشراء أُدخل بالخطأ')
    expect(next.holdings.find(h => h.id === rajhiCashId)!.quantity).toBe(1_000)
    expect(next.holdings.some(h => h.kind === 'metal')).toBe(false)
    const voided = next.ledger.find(t => t.id === tx.id)!
    expect(voided.status).toBe('voided')
    expect(voided.revisions).toHaveLength(1)
  })

  it('hydrates old purchase intent and normalizes malformed currency text without a financial event', () => {
    const { state } = prepared()
    const purchase = state.ledger.find(t => t.kind === 'asset_purchase')!
    const legacy = {
      ...state,
      accounts: state.accounts.map((a, i) => i === 0 ? { ...a, currency: 'ٍِSAR' } : a),
      ledger: state.ledger.map(t => t.id === purchase.id ? { ...t, userInput: undefined } : t),
    }
    const hydrated = hydrateTransactionUserInputs(legacy)
    const tx = hydrated.ledger.find(t => t.id === purchase.id)!
    expect(hydrated.accounts[0].currency).toBe('SAR')
    expect(tx.userInput?.kind).toBe('asset_purchase')
    expect(tx.userInput?.sourceHoldingId).toBe(purchase.sourceHoldingId)
    expect(tx.userInput?.targetAccountId).toBe(hydrated.holdings.find(h => h.id === purchase.targetHoldingId)!.accountId)
  })
})
