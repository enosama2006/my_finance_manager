import { describe, expect, it } from 'vitest'
import { correctOpening } from '../src/application/simpleTransactionCorrections'
import { createAssetWithOpening, transferBetweenAssets } from '../src/application/assetTransactions'
import { ownerCostBasisSar } from '../src/domain/finance'
import { emptyState } from '../src/data/emptyState'

const clone = <T,>(value: T): T => structuredClone(value)

describe('opening correction as projection rebuild', () => {
  it('corrects the opening fact after later movements without creating balancing transactions or replaying later IDs', () => {
    let state = clone(emptyState)
    const ownerId = state.parties.find(p => p.type === 'self')!.id

    state = createAssetWithOpening(state, {
      name: 'حساب الدولار',
      kind: 'cash',
      symbol: 'USD',
      nativeUnit: 'USD',
      currency: 'USD',
      ownerId,
      quantity: 75.09,
    })
    const sourceId = state.holdings.at(-1)!.id

    state = createAssetWithOpening(state, {
      name: 'حساب دولار آخر',
      kind: 'cash',
      symbol: 'USD',
      nativeUnit: 'USD',
      currency: 'USD',
      ownerId,
      quantity: 0,
    })
    const targetId = state.holdings.at(-1)!.id
    const openingBefore = state.ledger.find(tx => tx.kind === 'opening' && tx.targetHoldingId === sourceId)!

    state = transferBetweenAssets(state, {
      sourceAssetId: sourceId,
      targetAssetId: targetId,
      ownerId,
      quantity: 40,
    })
    const laterTransferBefore = structuredClone(state.ledger.find(tx => tx.kind === 'real_transfer')!)

    expect(state.holdings.find(h => h.id === sourceId)!.quantity).toBe(35.09)
    expect(state.holdings.find(h => h.id === targetId)!.quantity).toBe(40)
    expect(ownerCostBasisSar(state.holdings.find(h => h.id === sourceId)!, ownerId)).toBeNull()

    state = correctOpening(state, {
      transactionId: openingBefore.id,
      reason: 'الرصيد الافتتاحي أُدخل أعلى من الحقيقة بـ 10 USD',
      at: openingBefore.at,
      assetId: sourceId,
      ownerId,
      quantity: 65.09,
    })

    const source = state.holdings.find(h => h.id === sourceId)!
    const target = state.holdings.find(h => h.id === targetId)!
    const openingAfter = state.ledger.find(tx => tx.id === openingBefore.id)!
    const laterTransferAfter = state.ledger.find(tx => tx.id === laterTransferBefore.id)!

    // 65.09 corrected opening - 40 later transfer = 25.09 current balance.
    expect(source.quantity).toBe(25.09)
    expect(target.quantity).toBe(40)

    // Same logical fact is revised; no balancing/reconciliation transaction is fabricated.
    expect(openingAfter.id).toBe(openingBefore.id)
    expect(openingAfter.targetQuantity).toBe(65.09)
    expect(openingAfter.version).toBe(openingBefore.version + 1)
    expect(openingAfter.revisions).toHaveLength(openingBefore.revisions.length + 1)
    expect(openingAfter.revisions.at(-1)?.snapshot.targetQuantity).toBe(75.09)
    expect(state.ledger).toHaveLength(2)
    expect(state.ledger.some(tx => tx.kind === 'reconciliation')).toBe(false)

    // The real movement stays exactly the same and is not replayed/re-created.
    expect(laterTransferAfter).toEqual(laterTransferBefore)

    // Unknown historical FX basis remains unknown after the correction.
    expect(openingAfter.costBasisSar).toBeNull()
    expect(ownerCostBasisSar(source, ownerId)).toBeNull()
  })
})
