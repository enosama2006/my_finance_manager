import { describe, expect, it } from 'vitest'
import { emptyState } from '../src/data/emptyState'
import { createAccountGroup, archiveAccountGroup } from '../src/application/accountGroups'
import { createAsset, flattenLegacyAccountsToAssets, moveAssetToGroup } from '../src/application/assets'
import { updateAssetFull } from '../src/application/assetEditing'
import { createAssetWithOpening, setAssetOpeningBalance, transferBetweenAssets } from '../src/application/assetTransactions'
import { voidTransaction } from '../src/application/transactionVoids'
import { purchaseAssetSimplified } from '../src/application/purchase'
import type { FinanceState, Holding } from '../src/domain/types'

const clone = <T,>(value: T): T => structuredClone(value)
const self = (state: FinanceState) => state.parties.find(p => p.type === 'self')!.id

function cashInput(state: FinanceState, name = 'الراجحي الجاري', groupId?: string) {
  return { name, kind: 'cash' as const, symbol: 'SAR', nativeUnit: 'SAR', ownerId: self(state), quantity: 1000, marketPriceSar: 1, costBasisSar: 1000, groupId, accountKind: 'checking' as const, currency: 'SAR', institutionName: 'مصرف الراجحي' }
}

describe('ADR-004 Group → Asset model', () => {
  it('migrates a legacy Account/Holding into a direct Group Asset without changing financial truth', () => {
    const ownerId = self(emptyState)
    const legacy: FinanceState = {
      ...clone(emptyState), schemaVersion: 4,
      accountGroups: [{ id: 'g-bank', name: 'البنوك', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' }],
      accounts: [{ id: 'acc-rj', name: 'الراجحي الجاري', kind: 'checking', groupId: 'g-bank', custodianId: ownerId, currency: 'SAR', last4: '1234', status: 'active' }],
      holdings: [{ id: 'h-sar', name: 'رصيد SAR', symbol: 'SAR', kind: 'cash', nativeUnit: 'SAR', quantity: 27163.03, marketPriceSar: 1, costLots: [{ id: 'lot', ownerId, quantity: 27163.03, unitCostSar: 1 }], valuationMethod: 'nominal', accountId: 'acc-rj', custodianId: ownerId, ownership: [{ ownerId, quantity: 27163.03 }] }],
      ledger: [{ id: 'tx-old', version: 1, status: 'posted', revisions: [], at: '2026-01-01T00:00:00.000Z', kind: 'opening', title: 'افتتاحي', amountSar: 27163.03, ownerId, targetHoldingId: 'h-sar', targetQuantity: 27163.03 }],
    }
    const migrated = flattenLegacyAccountsToAssets(legacy)
    const asset = migrated.holdings.find(h => h.id === 'h-sar')!
    expect(migrated.schemaVersion).toBe(5)
    expect(asset.name).toBe('الراجحي الجاري')
    expect(asset.groupId).toBe('g-bank')
    expect(asset.quantity).toBe(27163.03)
    expect(asset.last4).toBe('1234')
    expect(asset.costLots).toEqual(legacy.holdings[0].costLots)
    expect(migrated.ledger).toEqual(legacy.ledger)
    expect(migrated.holdings).toHaveLength(1)
  })

  it('creates an Asset directly under a Group and records one opening event', () => {
    let state = clone(emptyState)
    state = createAccountGroup(state, { name: 'البنوك' })
    const groupId = state.accountGroups![0].id
    state = createAssetWithOpening(state, cashInput(state, 'الراجحي الجاري', groupId))
    expect(state.accounts).toHaveLength(0)
    expect(state.holdings).toHaveLength(1)
    expect(state.holdings[0].groupId).toBe(groupId)
    expect(state.holdings[0].quantity).toBe(1000)
    expect(state.ledger.filter(tx => tx.kind === 'opening' && tx.status === 'posted')).toHaveLength(1)
  })

  it('corrects the same opening state instead of stacking duplicate balances', () => {
    let state = createAssetWithOpening(clone(emptyState), cashInput(emptyState))
    const assetId = state.holdings[0].id
    const ownerId = self(state)
    state = setAssetOpeningBalance(state, { assetId, ownerId, quantity: 1200, reason: 'القيمة الأولى خاطئة' })
    const openings = state.ledger.filter(tx => tx.kind === 'opening' && tx.status === 'posted')
    expect(openings).toHaveLength(1)
    expect(openings[0].version).toBe(2)
    expect(openings[0].targetQuantity).toBe(1200)
    expect(state.holdings[0].quantity).toBe(1200)
  })

  it('moves an Asset between Groups without touching ledger, quantity, owner, or cost basis', () => {
    let state = clone(emptyState)
    state = createAccountGroup(state, { name: 'البنوك' })
    state = createAccountGroup(state, { name: 'سيولة طويلة الأجل' })
    const [g1, g2] = state.accountGroups!
    state = createAssetWithOpening(state, cashInput(state, 'الراجحي', g1.id))
    const asset = state.holdings[0]
    const ledgerBefore = structuredClone(state.ledger)
    const lotsBefore = structuredClone(asset.costLots)
    state = moveAssetToGroup(state, asset.id, g2.id)
    expect(state.holdings[0].groupId).toBe(g2.id)
    expect(state.holdings[0].quantity).toBe(asset.quantity)
    expect(state.holdings[0].ownership).toEqual(asset.ownership)
    expect(state.holdings[0].costLots).toEqual(lotsBefore)
    expect(state.ledger).toEqual(ledgerBefore)
  })

  it('renames/repositions an Asset without financial ledger mutation', () => {
    let state = clone(emptyState)
    state = createAccountGroup(state, { name: 'البنوك' })
    state = createAccountGroup(state, { name: 'مدخرات' })
    state = createAssetWithOpening(state, cashInput(state, 'اسم قديم', state.accountGroups![0].id))
    const asset = state.holdings[0]
    const before = state.ledger.length
    state = updateAssetFull(state, { id: asset.id, name: 'اسم صحيح', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: self(state), quantity: asset.quantity, marketPriceSar: 1, costBasisSar: 1000, groupId: state.accountGroups![1].id, accountKind: 'checking', currency: 'SAR', institutionName: 'الراجحي', reason: 'تصحيح الاسم والمجموعة' })
    expect(state.holdings[0].name).toBe('اسم صحيح')
    expect(state.holdings[0].groupId).toBe(state.accountGroups![1].id)
    expect(state.ledger).toHaveLength(before)
  })

  it('audits quantity and cost-basis corrections', () => {
    let state = createAssetWithOpening(clone(emptyState), cashInput(emptyState))
    const asset = state.holdings[0]
    const before = state.ledger.length
    state = updateAssetFull(state, { id: asset.id, name: asset.name, kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: self(state), quantity: 900, marketPriceSar: 1, costBasisSar: 850, accountKind: 'checking', currency: 'SAR', reason: 'تصحيح رصيد وتكلفة' })
    expect(state.holdings[0].quantity).toBe(900)
    expect(state.holdings[0].costLots.reduce((sum, lot) => sum + lot.quantity * (lot.unitCostSar ?? 0), 0)).toBeCloseTo(850, 2)
    expect(state.ledger.length).toBeGreaterThan(before)
    expect(state.ledger.filter(tx => tx.kind === 'reconciliation')).toHaveLength(2)
  })

  it('does not archive a Group while it still contains a direct Asset', () => {
    let state = clone(emptyState)
    state = createAccountGroup(state, { name: 'معادن' })
    const groupId = state.accountGroups![0].id
    state = createAsset(state, { name: 'ذهب', kind: 'metal', symbol: 'XAU', nativeUnit: 'غ', ownerId: self(state), quantity: 0, marketPriceSar: 500, groupId })
    expect(() => archiveAccountGroup(state, groupId)).toThrow(/الأصول/)
  })

  it('reverses a cash transfer exactly when the transaction is deleted/voided', () => {
    let state = clone(emptyState)
    state = createAssetWithOpening(state, cashInput(state, 'الراجحي'))
    state = createAssetWithOpening(state, { ...cashInput(state, 'الإنماء'), quantity: 100, costBasisSar: 100 })
    const [source, target] = state.holdings
    state = transferBetweenAssets(state, { sourceAssetId: source.id, targetAssetId: target.id, ownerId: self(state), quantity: 250 })
    const tx = state.ledger.find(t => t.kind === 'real_transfer' && t.status === 'posted')!
    expect(state.holdings.find(h => h.id === source.id)?.quantity).toBe(750)
    expect(state.holdings.find(h => h.id === target.id)?.quantity).toBe(350)
    state = voidTransaction(state, tx.id, 'النقل أُدخل بالخطأ')
    expect(state.holdings.find(h => h.id === source.id)?.quantity).toBe(1000)
    expect(state.holdings.find(h => h.id === target.id)?.quantity).toBe(100)
    expect(state.ledger.find(t => t.id === tx.id)?.status).toBe('voided')
  })

  it('purchases gold directly into a Group with no target Account', () => {
    let state = clone(emptyState)
    state = createAccountGroup(state, { name: 'المعادن' })
    state = createAssetWithOpening(state, cashInput(state, 'الراجحي'))
    const source = state.holdings[0]
    state = purchaseAssetSimplified(state, { sourceHoldingId: source.id, ownerId: self(state), amountPaid: 500, targetGroupId: state.accountGroups![0].id, assetTypeId: 'gold', name: 'ذهب', symbol: 'XAU', quantity: 1, extraCostsSar: 0, marketQuote: { unitPriceSar: 530, source: 'test', asOf: '2026-08-18T00:00:00.000Z', isLive: false } })
    const gold = state.holdings.find(h => h.kind === 'metal')!
    expect(gold.groupId).toBe(state.accountGroups![0].id)
    expect(gold.accountId).toBeUndefined()
    expect(state.accounts).toHaveLength(0)
    expect(state.holdings.find(h => h.id === source.id)?.quantity).toBe(500)
  })
})
