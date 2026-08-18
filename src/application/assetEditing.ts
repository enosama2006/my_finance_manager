import { ownerHoldingCostBasisSar } from '../domain/lifecycle'
import { round2 } from '../domain/finance'
import type { FinanceState, LedgerTransaction } from '../domain/types'
import { updateAsset, type UpdateAssetInput } from './assets'

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const now = () => new Date().toISOString()

export interface UpdateAssetFullInput extends UpdateAssetInput { costBasisSar?: number }

export function updateAssetFull(state: FinanceState, input: UpdateAssetFullInput): FinanceState {
  if (input.costBasisSar != null && (!Number.isFinite(input.costBasisSar) || input.costBasisSar < 0)) throw new Error('Cost Basis لا يمكن أن يكون سالبًا')
  let next = updateAsset(state, input)
  if (input.costBasisSar == null) return next
  const asset = next.holdings.find(h => h.id === input.id && !h.archived)
  if (!asset) throw new Error('الأصل غير موجود بعد التصحيح')
  const owners = asset.ownership.filter(x => x.quantity > 0)
  if (owners.length > 1) throw new Error('تصحيح Cost Basis الكلي لأصل متعدد الملاك يحتاج توزيعًا صريحًا')
  const ownerId = owners[0]?.ownerId ?? input.ownerId
  const oldAsset = state.holdings.find(h => h.id === input.id)!
  const oldCost = ownerHoldingCostBasisSar(oldAsset, ownerId) ?? 0
  const newCost = round2(input.costBasisSar)
  // Keep enough precision in unit cost so quantity × unitCost reproduces the exact user-entered total basis.
  const unitCost = asset.quantity > 0 ? newCost / asset.quantity : undefined
  const acquiredAt = asset.costLots.find(l => l.ownerId === ownerId)?.acquiredAt ?? now()
  const corrected = { ...asset, costLots: asset.quantity > 0 ? [{ id: id('lot'), ownerId, quantity: asset.quantity, unitCostSar: unitCost, acquiredAt }] : [] }
  if (Math.abs(oldCost - newCost) <= 0.009) return { ...next, holdings: next.holdings.map(h => h.id === asset.id ? corrected : h) }
  const tx: LedgerTransaction = { id: id('tx'), version: 1, status: 'posted', revisions: [], at: now(), kind: 'reconciliation', title: `تصحيح Cost Basis: ${asset.name}`, amountSar: Math.abs(round2(newCost - oldCost)), ownerId, targetHoldingId: asset.id, note: `تصحيح Cost Basis من ${oldCost} إلى ${newCost}. السبب: ${input.reason.trim()}` }
  return { ...next, holdings: next.holdings.map(h => h.id === asset.id ? corrected : h), ledger: [tx, ...next.ledger] }
}
