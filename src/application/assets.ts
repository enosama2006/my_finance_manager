import { currencyReferenceRateSar } from '../domain/currencies'
import { ownerQuantity, ownerWeightedAverageCostSar, round2 } from '../domain/finance'
import type { AccountKind, AssetKind, FinanceState, Holding, LedgerTransaction, PerformanceRole, ValuationMethod } from '../domain/types'

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const now = () => new Date().toISOString()

function activeGroups(state: FinanceState) { return (state.accountGroups ?? []).filter(g => g.status === 'active') }
function assertGroup(state: FinanceState, groupId?: string) {
  if (groupId && !activeGroups(state).some(g => g.id === groupId)) throw new Error('المجموعة غير موجودة أو مؤرشفة')
}
function assertOwner(state: FinanceState, ownerId: string) {
  if (!state.parties.some(p => p.id === ownerId)) throw new Error('المالك غير موجود')
}
function valuationFor(kind: AssetKind, symbol: string): ValuationMethod {
  if (kind === 'cash') return symbol.toUpperCase() === 'SAR' ? 'nominal' : 'fx'
  if (kind === 'fixed_term' || kind === 'receivable') return 'contractual'
  if (kind === 'metal' || kind === 'stock' || kind === 'fund' || kind === 'crypto') return 'market_quote'
  return 'manual_appraisal'
}

export interface CreateAssetInput {
  name: string
  kind: AssetKind
  assetTypeId?: string
  symbol: string
  nativeUnit: string
  ownerId: string
  quantity?: number
  marketPriceSar?: number
  costBasisSar?: number
  groupId?: string
  accountKind?: AccountKind
  currency?: string
  last4?: string
  institutionName?: string
  description?: string
  location?: string
  performanceRole?: PerformanceRole
}

export function createAsset(state: FinanceState, input: CreateAssetInput): FinanceState {
  const name = input.name.trim()
  if (!name) throw new Error('اسم الأصل مطلوب')
  assertGroup(state, input.groupId)
  assertOwner(state, input.ownerId)
  const quantity = input.quantity ?? 0
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error('الكمية لا يمكن أن تكون سالبة')
  const symbol = input.symbol.trim().toUpperCase() || (input.kind === 'cash' ? (input.currency?.trim().toUpperCase() || 'SAR') : name.slice(0, 5).toUpperCase())
  const reference = input.kind === 'cash' ? currencyReferenceRateSar(symbol) : null
  const marketPriceSar = reference ?? input.marketPriceSar ?? (quantity > 0 && input.costBasisSar != null ? input.costBasisSar / quantity : 1)
  if (!Number.isFinite(marketPriceSar) || marketPriceSar <= 0) throw new Error('القيمة الحالية للوحدة يجب أن تكون أكبر من صفر')
  if (input.costBasisSar != null && input.costBasisSar < 0) throw new Error('التكلفة التاريخية لا يمكن أن تكون سالبة')
  const unitCost = quantity > 0 && input.costBasisSar != null ? input.costBasisSar / quantity : (quantity > 0 ? marketPriceSar : undefined)
  const asset: Holding = {
    id: id('asset'), name, kind: input.kind, assetTypeId: input.assetTypeId, symbol,
    nativeUnit: input.nativeUnit.trim() || (input.kind === 'cash' ? symbol : 'وحدة'), quantity: round2(quantity), marketPriceSar: round2(marketPriceSar),
    costLots: quantity > 0 ? [{ id: id('lot'), ownerId: input.ownerId, quantity: round2(quantity), unitCostSar: unitCost == null ? undefined : round2(unitCost), acquiredAt: now() }] : [],
    valuationMethod: valuationFor(input.kind, symbol), valuationSource: reference != null ? 'currency-reference' : 'user-entry', valuedAt: now(),
    groupId: input.groupId || undefined, accountKind: input.accountKind, currency: input.currency?.trim().toUpperCase() || (input.kind === 'cash' ? symbol : undefined),
    last4: input.last4?.trim() || undefined, institutionName: input.institutionName?.trim() || undefined, description: input.description?.trim() || undefined,
    location: input.location?.trim() || undefined, ownership: quantity > 0 ? [{ ownerId: input.ownerId, quantity: round2(quantity) }] : [],
    performanceRole: input.performanceRole ?? (input.kind === 'cash' ? 'transactional_cash' : 'investment'),
  }
  return { ...state, schemaVersion: 5, holdings: [...state.holdings, asset] }
}

export interface UpdateAssetInput extends Omit<CreateAssetInput, 'quantity' | 'costBasisSar'> {
  id: string
  quantity: number
  reason: string
}

function reduceLots(asset: Holding, ownerId: string, quantityToRemove: number) {
  let remaining = quantityToRemove
  return asset.costLots.map(lot => {
    if (lot.ownerId !== ownerId || remaining <= 1e-9) return lot
    const used = Math.min(lot.quantity, remaining)
    remaining = round2(remaining - used)
    return { ...lot, quantity: round2(lot.quantity - used) }
  }).filter(lot => lot.quantity > 1e-9)
}

function correctionTx(asset: Holding, ownerId: string, delta: number, reason: string): LedgerTransaction {
  return {
    id: id('tx'), version: 1, status: 'posted', revisions: [], at: now(), kind: 'reconciliation',
    title: `تصحيح أصل: ${asset.name}`, amountSar: round2(Math.abs(delta) * asset.marketPriceSar), ownerId,
    sourceHoldingId: delta < 0 ? asset.id : undefined, targetHoldingId: delta > 0 ? asset.id : undefined,
    sourceQuantity: delta < 0 ? Math.abs(delta) : undefined, targetQuantity: delta > 0 ? delta : undefined,
    note: `تصحيح أدخله المستخدم: ${reason}`,
  }
}

export function updateAsset(state: FinanceState, input: UpdateAssetInput): FinanceState {
  const asset = state.holdings.find(h => h.id === input.id && !h.archived)
  if (!asset) throw new Error('الأصل غير موجود أو محذوف')
  const name = input.name.trim()
  if (!name) throw new Error('اسم الأصل مطلوب')
  if (!input.reason.trim()) throw new Error('سبب التصحيح مطلوب')
  assertGroup(state, input.groupId)
  assertOwner(state, input.ownerId)
  if (!Number.isFinite(input.quantity) || input.quantity < 0) throw new Error('الكمية لا يمكن أن تكون سالبة')

  const currentOwners = asset.ownership.filter(x => x.quantity > 0)
  const currentOwnerId = currentOwners.length === 1 ? currentOwners[0].ownerId : input.ownerId
  if (currentOwners.length > 1 && currentOwners.some(x => x.ownerId !== input.ownerId)) throw new Error('الأصل متعدد الملاك؛ تعديل المالك الكامل يحتاج توزيع ملكية صريح')
  const currentQty = asset.quantity
  const delta = round2(input.quantity - currentQty)
  const symbol = input.symbol.trim().toUpperCase() || asset.symbol
  const reference = input.kind === 'cash' ? currencyReferenceRateSar(symbol) : null
  const market = reference ?? input.marketPriceSar ?? asset.marketPriceSar
  if (!Number.isFinite(market) || market <= 0) throw new Error('القيمة الحالية للوحدة يجب أن تكون أكبر من صفر')

  let lots = asset.costLots.map(lot => currentOwnerId !== input.ownerId ? { ...lot, ownerId: input.ownerId } : lot)
  if (delta > 0) {
    const unitCost = ownerWeightedAverageCostSar(asset, currentOwnerId) ?? market
    lots = [...lots, { id: id('lot'), ownerId: input.ownerId, quantity: delta, unitCostSar: unitCost, acquiredAt: now() }]
  } else if (delta < 0) {
    lots = reduceLots({ ...asset, costLots: lots }, input.ownerId, Math.abs(delta))
  }

  const updated: Holding = {
    ...asset, name, kind: input.kind, assetTypeId: input.assetTypeId, symbol, nativeUnit: input.nativeUnit.trim() || asset.nativeUnit,
    quantity: round2(input.quantity), marketPriceSar: round2(market), costLots: lots, valuationMethod: valuationFor(input.kind, symbol),
    valuationSource: reference != null ? 'currency-reference' : 'user-correction', valuedAt: now(), groupId: input.groupId || undefined,
    accountKind: input.accountKind, currency: input.currency?.trim().toUpperCase() || (input.kind === 'cash' ? symbol : undefined), last4: input.last4?.trim() || undefined,
    institutionName: input.institutionName?.trim() || undefined, description: input.description?.trim() || undefined, location: input.location?.trim() || undefined,
    ownership: input.quantity > 0 ? [{ ownerId: input.ownerId, quantity: round2(input.quantity) }] : [],
    performanceRole: input.performanceRole ?? asset.performanceRole ?? (input.kind === 'cash' ? 'transactional_cash' : 'investment'),
  }

  let slices = state.portfolioSlices
  if (currentOwnerId !== input.ownerId) slices = slices.map(s => s.holdingId === asset.id ? { ...s, ownerId: input.ownerId } : s)
  if (delta < 0) {
    const allocated = slices.filter(s => s.holdingId === asset.id).reduce((sum, s) => sum + s.quantity, 0)
    if (allocated > input.quantity + 1e-9) throw new Error('لا يمكن خفض الكمية تحت الكمية المخصصة للمحافظ؛ صحح التخصيص أولًا')
  }

  const ledger = Math.abs(delta) > 1e-9 ? [correctionTx(updated, input.ownerId, delta, input.reason.trim()), ...state.ledger] : state.ledger
  return { ...state, schemaVersion: 5, holdings: state.holdings.map(h => h.id === asset.id ? updated : h), portfolioSlices: slices, ledger }
}

export function moveAssetToGroup(state: FinanceState, assetId: string, groupId?: string): FinanceState {
  assertGroup(state, groupId)
  if (!state.holdings.some(h => h.id === assetId && !h.archived)) throw new Error('الأصل غير موجود')
  return { ...state, schemaVersion: 5, holdings: state.holdings.map(h => h.id === assetId ? { ...h, groupId: groupId || undefined } : h) }
}

export function archiveAssetCorrection(state: FinanceState, assetId: string, reason: string): FinanceState {
  const asset = state.holdings.find(h => h.id === assetId && !h.archived)
  if (!asset) throw new Error('الأصل غير موجود أو محذوف')
  if (!reason.trim()) throw new Error('سبب الحذف مطلوب')
  const owner = asset.ownership.find(x => x.quantity > 0)?.ownerId ?? state.parties.find(p => p.type === 'self')?.id ?? state.parties[0]?.id
  if (!owner) throw new Error('لا يوجد مالك يمكن ربط التصحيح به')
  const tx = asset.quantity > 0 ? correctionTx(asset, owner, -asset.quantity, `حذف الأصل: ${reason.trim()}`) : undefined
  return {
    ...state, schemaVersion: 5,
    holdings: state.holdings.map(h => h.id === asset.id ? { ...h, quantity: 0, ownership: [], costLots: [], archived: true } : h),
    portfolioSlices: state.portfolioSlices.filter(s => s.holdingId !== asset.id),
    ledger: tx ? [tx, ...state.ledger] : state.ledger,
  }
}

/**
 * Deterministic compatibility migration: old Account -> Holding placement becomes
 * Group -> Asset placement. No ledger/cost/quantity is changed.
 */
export function flattenLegacyAccountsToAssets(state: FinanceState): FinanceState {
  if (state.schemaVersion === 5 && state.holdings.every(h => h.groupId || !h.accountId)) return state
  const selfId = state.parties.find(p => p.type === 'self')?.id ?? state.parties[0]?.id
  const holdingsByAccount = new Map<string, Holding[]>()
  state.holdings.forEach(h => { if (h.accountId) holdingsByAccount.set(h.accountId, [...(holdingsByAccount.get(h.accountId) ?? []), h]) })

  const migrated = state.holdings.map(asset => {
    if (asset.groupId || !asset.accountId) return asset
    const account = state.accounts.find(a => a.id === asset.accountId)
    if (!account) return asset
    const siblings = (holdingsByAccount.get(account.id) ?? []).filter(h => !h.archived)
    const isCash = asset.kind === 'cash'
    const cleanLegacyName = /^رصيد\s+/i.test(asset.name) || asset.name.trim().toUpperCase() === asset.symbol.toUpperCase()
    const name = isCash && cleanLegacyName ? `${account.name}${siblings.length > 1 ? ` — ${asset.symbol}` : ''}` : asset.name
    return {
      ...asset, name, groupId: account.groupId, accountKind: isCash ? account.kind : asset.accountKind,
      currency: isCash ? (account.currency || asset.symbol) : asset.currency, last4: isCash ? account.last4 : asset.last4,
      institutionName: isCash ? account.name : asset.institutionName,
    }
  })

  const representedAccounts = new Set(migrated.map(h => h.accountId).filter(Boolean))
  const zeroAssets: Holding[] = state.accounts.filter(a => a.status === 'active' && !representedAccounts.has(a.id) && a.kind !== 'custody' && a.kind !== 'investment').map(account => {
    const symbol = account.currency?.trim().toUpperCase() || 'SAR'
    const market = currencyReferenceRateSar(symbol) ?? 1
    return {
      id: `legacy-asset-${account.id}`, name: account.name, kind: 'cash', symbol, nativeUnit: symbol, quantity: 0, marketPriceSar: market,
      costLots: [], valuationMethod: symbol === 'SAR' ? 'nominal' : 'fx', valuationSource: 'legacy-account-migration', valuedAt: now(),
      groupId: account.groupId, accountId: account.id, custodianId: account.custodianId, accountKind: account.kind, currency: symbol,
      last4: account.last4, institutionName: account.name, ownership: [], performanceRole: 'transactional_cash',
    }
  })

  return { ...state, schemaVersion: 5, holdings: [...migrated, ...zeroAssets] }
}
