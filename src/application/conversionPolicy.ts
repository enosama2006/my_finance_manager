import { availableQuantity, ownerQuantity, ownerWeightedAverageCostSar, round2 } from '../domain/finance'
import type { ConversionInput, CostBasisLot, FinanceState, Holding, LedgerTransaction } from '../domain/types'

export interface ManagedConversionPreview {
  sourceCostBasisSar: number | null
  targetMarketValueSar: number
  feesSar: number
  realizedGainLossSar: number | null
  propagatedTargetBasisSar: number | null
  exchangeRate: number
  realizationState: 'realized_to_cash' | 'cost_continues'
}

function sourceAvailable(state: FinanceState, input: ConversionInput) {
  if (!input.sourcePortfolioId) return availableQuantity(state, input.sourceHoldingId, input.ownerId)
  return state.portfolioSlices
    .filter(s => s.holdingId === input.sourceHoldingId && s.ownerId === input.ownerId && s.portfolioId === input.sourcePortfolioId)
    .reduce((sum, s) => sum + s.quantity, 0)
}

export function previewManagedConversion(state: FinanceState, input: ConversionInput): ManagedConversionPreview {
  const source = state.holdings.find(h => h.id === input.sourceHoldingId)
  if (!source) throw new Error('الأصل المصدر غير موجود')
  if (input.sourceQuantity <= 0 || input.targetQuantity <= 0) throw new Error('الكميات يجب أن تكون أكبر من صفر')
  if (input.sourceQuantity > sourceAvailable(state, input) + 1e-9) throw new Error('الكمية غير متاحة في الحصة المختارة')
  const avgCost = ownerWeightedAverageCostSar(source, input.ownerId)
  const sourceCostBasisSar = avgCost == null ? null : round2(avgCost * input.sourceQuantity)
  const targetMarketValueSar = round2(input.targetQuantity * input.targetUnitValueSarAtExecution)
  const feesSar = round2(Math.max(0, input.feesSar))
  const isCashExit = input.targetKind === 'cash'
  const realizedGainLossSar = isCashExit && sourceCostBasisSar != null ? round2(targetMarketValueSar - feesSar - sourceCostBasisSar) : null
  const propagatedTargetBasisSar = !isCashExit && sourceCostBasisSar != null ? round2(sourceCostBasisSar + feesSar) : null
  return {
    sourceCostBasisSar,
    targetMarketValueSar,
    feesSar,
    realizedGainLossSar,
    propagatedTargetBasisSar,
    exchangeRate: input.sourceQuantity / input.targetQuantity,
    realizationState: isCashExit ? 'realized_to_cash' : 'cost_continues',
  }
}

function reduceLots(lots: CostBasisLot[], ownerId: string, quantity: number) {
  const ownerLots = lots.filter(l => l.ownerId === ownerId)
  const total = ownerLots.reduce((sum, l) => sum + l.quantity, 0)
  if (quantity > total + 1e-9) throw new Error('Cost Basis لا يغطي الكمية')
  const remaining = Math.max(0, total - quantity)
  if (remaining <= 1e-9) return lots.filter(l => l.ownerId !== ownerId)
  let assigned = 0
  let seen = 0
  return lots.map(lot => {
    if (lot.ownerId !== ownerId) return lot
    seen += 1
    const next = seen === ownerLots.length ? round2(remaining - assigned) : round2(lot.quantity / total * remaining)
    assigned = round2(assigned + next)
    return { ...lot, quantity: next }
  }).filter(l => l.quantity > 0)
}

export function applyManagedConversion(state: FinanceState, input: ConversionInput, at = new Date().toISOString()): FinanceState {
  const preview = previewManagedConversion(state, input)
  const source = state.holdings.find(h => h.id === input.sourceHoldingId)!
  if (input.sourceQuantity > ownerQuantity(source, input.ownerId) + 1e-9) throw new Error('الرصيد غير كافٍ')

  let groupId = input.targetGroupId
  if (!groupId && input.targetAccountId) groupId = state.accounts.find(a => a.id === input.targetAccountId)?.groupId
  if (groupId && !(state.accountGroups ?? []).some(g => g.id === groupId && g.status === 'active')) throw new Error('المجموعة الهدف غير موجودة أو مؤرشفة')

  const updatedSource: Holding = {
    ...source,
    quantity: round2(source.quantity - input.sourceQuantity),
    ownership: source.ownership.map(s => s.ownerId === input.ownerId ? { ...s, quantity: round2(s.quantity - input.sourceQuantity) } : s).filter(s => s.quantity > 0),
    costLots: reduceLots(source.costLots, input.ownerId, input.sourceQuantity),
  }

  const targetBasisSar = preview.realizationState === 'cost_continues' ? preview.propagatedTargetBasisSar : preview.targetMarketValueSar
  const targetSymbolNorm = input.targetSymbol.toUpperCase()
  const unitCostSar = targetBasisSar == null ? undefined : targetBasisSar / input.targetQuantity
  const newLot: CostBasisLot = { id: `lot-${crypto.randomUUID()}`, ownerId: input.ownerId, quantity: input.targetQuantity, unitCostSar, totalCostBasisSar: targetBasisSar ?? undefined, acquiredAt: at }

  // RULE-022 / DEC-024 — converting into an already-owned instrument in the same custody context
  // appends a lot to the existing Asset instead of minting a duplicate identity.
  const existingTarget = state.holdings.find(h =>
    !h.archived &&
    h.kind === input.targetKind &&
    h.symbol.toUpperCase() === targetSymbolNorm &&
    (h.groupId ?? undefined) === (groupId || undefined),
  )
  const targetId = existingTarget?.id ?? `holding-${crypto.randomUUID()}`
  let target: Holding
  if (existingTarget) {
    const hasOwner = existingTarget.ownership.some(s => s.ownerId === input.ownerId)
    target = {
      ...existingTarget,
      quantity: existingTarget.quantity + input.targetQuantity,
      marketPriceSar: input.targetUnitValueSarAtExecution,
      valuedAt: at,
      valuationSource: 'execution',
      ownership: hasOwner
        ? existingTarget.ownership.map(s => s.ownerId === input.ownerId ? { ...s, quantity: s.quantity + input.targetQuantity } : s)
        : [...existingTarget.ownership, { ownerId: input.ownerId, quantity: input.targetQuantity }],
      costLots: [...existingTarget.costLots, newLot],
    }
  } else {
    target = {
      id: targetId,
      symbol: targetSymbolNorm,
      name: input.targetName,
      kind: input.targetKind,
      nativeUnit: input.targetUnit,
      quantity: input.targetQuantity,
      marketPriceSar: input.targetUnitValueSarAtExecution,
      costLots: [newLot],
      valuationMethod: input.targetKind === 'cash' ? (targetSymbolNorm === 'SAR' ? 'nominal' : 'fx') : 'market_quote',
      valuationSource: 'execution',
      valuedAt: at,
      groupId: groupId || undefined,
      location: input.targetLocation,
      ownership: [{ ownerId: input.ownerId, quantity: input.targetQuantity }],
      performanceRole: input.targetKind === 'cash' ? 'transactional_cash' : 'investment',
      acquisitionJourney: preview.realizationState === 'cost_continues' ? [...(source.acquisitionJourney ?? [source.name]), input.targetName] : [input.targetName],
    }
  }

  let slices = state.portfolioSlices
  if (input.sourcePortfolioId) {
    let remaining = input.sourceQuantity
    slices = slices.map(slice => {
      if (remaining <= 0 || slice.holdingId !== source.id || slice.ownerId !== input.ownerId || slice.portfolioId !== input.sourcePortfolioId) return slice
      const used = Math.min(slice.quantity, remaining)
      remaining = round2(remaining - used)
      return { ...slice, quantity: round2(slice.quantity - used) }
    }).filter(slice => slice.quantity > 0)
  }
  const destinationPortfolio = input.targetPortfolioId ?? input.sourcePortfolioId
  if (destinationPortfolio) slices = [...slices, { id: `slice-${crypto.randomUUID()}`, portfolioId: destinationPortfolio, holdingId: targetId, ownerId: input.ownerId, quantity: input.targetQuantity }]

  const tx: LedgerTransaction = {
    id: `tx-${crypto.randomUUID()}`,
    version: 1,
    status: 'posted',
    revisions: [],
    at,
    kind: 'conversion',
    title: `${source.symbol} ← ${input.targetSymbol.toUpperCase()}`,
    amountSar: preview.targetMarketValueSar,
    ownerId: input.ownerId,
    sourceHoldingId: source.id,
    targetHoldingId: targetId,
    sourceQuantity: input.sourceQuantity,
    targetQuantity: input.targetQuantity,
    exchangeRate: preview.exchangeRate,
    feesSar: preview.feesSar || undefined,
    realizedGainLossSar: preview.realizedGainLossSar,
    portfolioId: destinationPortfolio,
    userInput: {
      kind: 'conversion',
      sourceHoldingId: input.sourceHoldingId,
      sourcePortfolioId: input.sourcePortfolioId,
      targetPortfolioId: input.targetPortfolioId,
      targetSymbol: input.targetSymbol.toUpperCase(),
      targetName: input.targetName,
      targetKind: input.targetKind,
      targetUnit: input.targetUnit,
      sourceQuantity: input.sourceQuantity,
      targetQuantity: input.targetQuantity,
      targetUnitValueSarAtExecution: input.targetUnitValueSarAtExecution,
      feesSar: input.feesSar,
      ownerId: input.ownerId,
      targetGroupId: groupId || undefined,
      targetLocation: input.targetLocation,
    },
    note: preview.realizationState === 'realized_to_cash'
      ? 'تم التسييل إلى نقد؛ أصبح فرق التكلفة مقابل صافي النقد ربحًا/خسارة محققة.'
      : 'تحول أصل إلى أصل دون خروج نهائي إلى نقد؛ استمرت التكلفة الاقتصادية إلى الأصل الجديد ولم يُسجل ربح نقدي محقق.',
  }
  const nextHoldings = existingTarget
    ? state.holdings.map(h => h.id === source.id ? updatedSource : h.id === existingTarget.id ? target : h)
    : state.holdings.map(h => h.id === source.id ? updatedSource : h).concat(target)
  return { ...state, schemaVersion: 5, holdings: nextHoldings, portfolioSlices: slices, ledger: [tx, ...state.ledger] }
}
