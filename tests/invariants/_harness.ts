/**
 * INVARIANT GATE — shared harness.
 *
 * These helpers exist so every invariant test states a RULE from docs/spec,
 * not an implementation detail. If an invariant fails, the model is wrong
 * (or the rule must be explicitly changed through an ADR) — never the test.
 */
import { emptyState } from '../../src/data/emptyState'
import { SELF_ID } from '../../src/data/seed'
import type { AccountGroup, FinanceState, LedgerTransaction } from '../../src/domain/types'

export { SELF_ID }

export const BANKS_GROUP: AccountGroup = { id: 'g-banks', name: 'البنوك', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' }

export function freshState(): FinanceState {
  return { ...emptyState, accountGroups: [BANKS_GROUP] }
}

/** Owner-scoped native quantity currently stored on an Asset (the materialized projection). */
export function storedOwnerQuantity(state: FinanceState, assetId: string, ownerId: string): number {
  const asset = state.holdings.find(h => h.id === assetId)
  return asset?.ownership.find(s => s.ownerId === ownerId)?.quantity ?? 0
}

/**
 * ADR-008 §2 — balances are projections of canonical facts.
 * This is the minimal deterministic replay: rebuild owner native quantity per Asset
 * from posted ledger facts alone. If the stored projection disagrees with the replay,
 * the system has a second, competing source of financial truth.
 */
export function replayOwnerQuantities(state: FinanceState): Map<string, number> {
  const result = new Map<string, number>()
  const add = (assetId: string | undefined, ownerId: string, delta: number) => {
    if (!assetId || !Number.isFinite(delta) || delta === 0) return
    const key = `${assetId}::${ownerId}`
    result.set(key, (result.get(key) ?? 0) + delta)
  }

  const posted = state.ledger.filter((tx: LedgerTransaction) => tx.status === 'posted')
  // Replay oldest-first: the store keeps the ledger newest-first.
  for (const tx of [...posted].reverse()) {
    switch (tx.kind) {
      case 'opening':
      case 'income':
        add(tx.targetHoldingId, tx.ownerId, tx.targetQuantity ?? 0)
        break
      case 'expense':
        add(tx.sourceHoldingId, tx.ownerId, -(tx.sourceQuantity ?? 0))
        break
      case 'real_transfer':
      case 'asset_purchase':
      case 'conversion':
      case 'asset_sale':
        add(tx.sourceHoldingId, tx.ownerId, -(tx.sourceQuantity ?? 0))
        add(tx.targetHoldingId, tx.ownerId, tx.targetQuantity ?? 0)
        break
      default:
        // allocation_settlement and friends must not move physical quantity at all (RULE-010).
        break
    }
  }
  return result
}

export function projectionDrift(state: FinanceState): Array<{ assetId: string; ownerId: string; stored: number; replayed: number }> {
  const replayed = replayOwnerQuantities(state)
  const drift: Array<{ assetId: string; ownerId: string; stored: number; replayed: number }> = []
  const keys = new Set<string>(replayed.keys())
  for (const asset of state.holdings) {
    for (const share of asset.ownership) keys.add(`${asset.id}::${share.ownerId}`)
  }
  for (const key of keys) {
    const [assetId, ownerId] = key.split('::')
    const stored = storedOwnerQuantity(state, assetId, ownerId)
    const value = replayed.get(key) ?? 0
    if (Math.abs(stored - value) > 1e-9) drift.push({ assetId, ownerId, stored, replayed: value })
  }
  return drift
}
