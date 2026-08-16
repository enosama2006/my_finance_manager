import type { ConversionInput, FinanceState, Holding, LedgerTransaction, Portfolio } from './types'

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function holdingValueSar(holding: Holding): number {
  return round2(holding.quantity * holding.marketPriceSar)
}

export function ownerQuantity(holding: Holding, ownerId: string): number {
  return holding.ownership.find((share) => share.ownerId === ownerId)?.quantity ?? 0
}

export function ownerHoldingValueSar(holding: Holding, ownerId: string): number {
  return round2(ownerQuantity(holding, ownerId) * holding.marketPriceSar)
}

export function externalLiabilitiesByOwner(state: FinanceState, ownerId: string): number {
  return round2(state.liabilities.filter((l) => l.ownerId === ownerId && l.status === 'open').reduce((sum, l) => sum + l.amountSar, 0))
}

export function netWorthByOwner(state: FinanceState, ownerId: string): number {
  const assets = state.holdings.filter((h) => !h.archived).reduce((sum, holding) => sum + ownerHoldingValueSar(holding, ownerId), 0)
  return round2(assets - externalLiabilitiesByOwner(state, ownerId))
}

export function allocatedQuantity(state: FinanceState, holdingId: string, ownerId: string): number {
  return round2(state.portfolioSlices.filter((s) => s.holdingId === holdingId && s.ownerId === ownerId).reduce((sum, s) => sum + s.quantity, 0))
}

export function availableQuantity(state: FinanceState, holdingId: string, ownerId: string): number {
  const holding = state.holdings.find((h) => h.id === holdingId)
  if (!holding) return 0
  return round2(Math.max(0, ownerQuantity(holding, ownerId) - allocatedQuantity(state, holdingId, ownerId)))
}

export function totalAllocatedByOwner(state: FinanceState, ownerId: string): number {
  return round2(state.portfolioSlices.filter((s) => s.ownerId === ownerId).reduce((sum, slice) => {
    const holding = state.holdings.find((h) => h.id === slice.holdingId)
    return sum + (holding ? slice.quantity * holding.marketPriceSar : 0)
  }, 0))
}

export function availableByOwner(state: FinanceState, ownerId: string): number {
  return round2(state.holdings.reduce((sum, holding) => sum + availableQuantity(state, holding.id, ownerId) * holding.marketPriceSar, 0))
}

export function realizedProfitByOwner(state: FinanceState, ownerId: string): number {
  return round2(state.ledger
    .filter((t) => t.ownerId === ownerId && t.status === 'posted' && (t.kind === 'conversion' || t.kind === 'asset_sale'))
    .reduce((sum, t) => sum + (t.realizedGainLossSar ?? 0), 0))
}

export function holdingsInThirdPartyCustody(state: FinanceState, ownerId: string): Holding[] {
  return state.holdings.filter((holding) => ownerQuantity(holding, ownerId) > 0 && holding.custodianId !== ownerId)
}

export function accountValueSar(state: FinanceState, accountId: string): number {
  return round2(state.holdings.filter((h) => h.accountId === accountId && !h.archived).reduce((sum, h) => sum + holdingValueSar(h), 0))
}

export function portfolioDirectValueSar(state: FinanceState, portfolioId: string): number {
  return round2(state.portfolioSlices.filter((s) => s.portfolioId === portfolioId).reduce((sum, slice) => {
    const holding = state.holdings.find((h) => h.id === slice.holdingId)
    return sum + (holding ? slice.quantity * holding.marketPriceSar : 0)
  }, 0))
}

function descendants(portfolios: Portfolio[], portfolioId: string): string[] {
  const children = portfolios.filter((p) => p.parentId === portfolioId)
  return children.flatMap((child) => [child.id, ...descendants(portfolios, child.id)])
}

export function portfolioRollupValueSar(state: FinanceState, portfolioId: string): number {
  const ids = [portfolioId, ...descendants(state.portfolios, portfolioId)]
  return round2(ids.reduce((sum, id) => sum + portfolioDirectValueSar(state, id), 0))
}

export interface ConversionPreview {
  sourceCostBasisSar: number | null
  proceedsSar: number
  feesSar: number
  realizedGainLossSar: number | null
  exchangeRate: number
}

function sourceAvailableForConversion(state: FinanceState, input: ConversionInput): number {
  if (!input.sourcePortfolioId) return availableQuantity(state, input.sourceHoldingId, input.ownerId)
  return state.portfolioSlices
    .filter((s) => s.holdingId === input.sourceHoldingId && s.ownerId === input.ownerId && s.portfolioId === input.sourcePortfolioId)
    .reduce((sum, s) => sum + s.quantity, 0)
}

export function previewConversion(state: FinanceState, input: ConversionInput): ConversionPreview {
  const source = state.holdings.find((h) => h.id === input.sourceHoldingId)
  if (!source) throw new Error('Source holding not found')
  if (input.sourceQuantity <= 0 || input.targetQuantity <= 0) throw new Error('Quantities must be positive')
  if (input.sourceQuantity > sourceAvailableForConversion(state, input)) throw new Error('Not enough quantity in the selected owner/portfolio slice')

  const sourceCostBasisSar = source.averageCostSar == null ? null : round2(input.sourceQuantity * source.averageCostSar)
  const proceedsSar = round2(input.targetQuantity * input.targetUnitValueSarAtExecution)
  const feesSar = round2(Math.max(0, input.feesSar))
  const realizedGainLossSar = sourceCostBasisSar == null ? null : round2(proceedsSar - feesSar - sourceCostBasisSar)
  const exchangeRate = round2(input.targetQuantity / input.sourceQuantity)
  return { sourceCostBasisSar, proceedsSar, feesSar, realizedGainLossSar, exchangeRate }
}

export function applyConversion(state: FinanceState, input: ConversionInput, now = new Date().toISOString()): FinanceState {
  const preview = previewConversion(state, input)
  const sourceIndex = state.holdings.findIndex((h) => h.id === input.sourceHoldingId)
  const source = state.holdings[sourceIndex]

  const updatedSource: Holding = {
    ...source,
    quantity: round2(source.quantity - input.sourceQuantity),
    ownership: source.ownership.map((share) => share.ownerId === input.ownerId ? { ...share, quantity: round2(share.quantity - input.sourceQuantity) } : share),
  }

  const targetId = `holding-${crypto.randomUUID()}`
  const target: Holding = {
    id: targetId,
    symbol: input.targetSymbol,
    name: input.targetName,
    kind: input.targetKind,
    nativeUnit: input.targetUnit,
    quantity: input.targetQuantity,
    marketPriceSar: input.targetUnitValueSarAtExecution,
    averageCostSar: round2((preview.proceedsSar + preview.feesSar) / input.targetQuantity),
    valuationMethod: input.targetSymbol === 'SAR' ? 'nominal' : 'market_quote',
    valuationSource: 'execution',
    valuedAt: now,
    accountId: input.targetAccountId,
    custodianId: input.targetCustodianId,
    location: input.targetLocation,
    ownership: [{ ownerId: input.ownerId, quantity: input.targetQuantity }],
  }

  let portfolioSlices = state.portfolioSlices
  if (input.sourcePortfolioId) {
    let remaining = input.sourceQuantity
    portfolioSlices = portfolioSlices.map((slice) => {
      if (remaining <= 0 || slice.holdingId !== source.id || slice.ownerId !== input.ownerId || slice.portfolioId !== input.sourcePortfolioId) return slice
      const used = Math.min(slice.quantity, remaining)
      remaining = round2(remaining - used)
      return { ...slice, quantity: round2(slice.quantity - used) }
    }).filter((slice) => slice.quantity > 0)
  }

  const destinationPortfolio = input.targetPortfolioId ?? input.sourcePortfolioId
  if (destinationPortfolio) {
    portfolioSlices = portfolioSlices.concat({ id: `slice-${crypto.randomUUID()}`, portfolioId: destinationPortfolio, holdingId: target.id, ownerId: input.ownerId, quantity: input.targetQuantity })
  }

  const tx: LedgerTransaction = {
    id: `tx-${crypto.randomUUID()}`,
    version: 1,
    status: 'posted',
    revisions: [],
    at: now,
    kind: 'conversion',
    title: `${source.symbol} ← ${input.targetSymbol}`,
    amountSar: preview.proceedsSar,
    ownerId: input.ownerId,
    sourceHoldingId: source.id,
    targetHoldingId: target.id,
    sourceQuantity: input.sourceQuantity,
    targetQuantity: input.targetQuantity,
    exchangeRate: preview.exchangeRate,
    feesSar: preview.feesSar,
    realizedGainLossSar: preview.realizedGainLossSar,
    note: 'Realized P/L exists only for a real conversion/disposal; valuation and allocation changes do not create it.',
  }

  return { ...state, holdings: state.holdings.map((h, i) => i === sourceIndex ? updatedSource : h).concat(target), portfolioSlices, ledger: [tx, ...state.ledger] }
}

export function updateValuation(state: FinanceState, holdingId: string, unitPriceSar: number, source: string, now = new Date().toISOString()): FinanceState {
  if (unitPriceSar < 0) throw new Error('Valuation cannot be negative')
  return { ...state, holdings: state.holdings.map((h) => h.id === holdingId ? { ...h, marketPriceSar: round2(unitPriceSar), valuationSource: source, valuedAt: now } : h) }
}

export function assertPhysicalQuantityInvariant(holding: Holding): boolean {
  return round2(holding.ownership.reduce((sum, share) => sum + share.quantity, 0)) === round2(holding.quantity)
}

export function assertPortfolioAllocationInvariant(state: FinanceState): boolean {
  return state.holdings.every((holding) => holding.ownership.every((share) => allocatedQuantity(state, holding.id, share.ownerId) <= round2(share.quantity)))
}
