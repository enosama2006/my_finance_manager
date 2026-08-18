import { holdingValueSar, ownerCostBasisSar, ownerQuantity, round2 } from './finance'
import type { CapitalCycle, FinanceState, Holding, Position } from './types'

export function ownerHoldingCostBasisSar(holding: Holding, ownerId: string): number | null {
  const basis = ownerCostBasisSar(holding, ownerId)
  return basis == null ? null : round2(basis)
}

export function holdingUnrealizedGainLossSar(holding: Holding, ownerId: string): number | null {
  const basis = ownerHoldingCostBasisSar(holding, ownerId)
  if (basis == null) return null
  return round2(ownerQuantity(holding, ownerId) * holding.marketPriceSar - basis)
}

export interface PositionMetrics {
  costBasisSar: number
  currentValueSar: number
  unrealizedGainLossSar: number
  realizedGainLossSar: number
  totalGainLossSar: number
  returnPct: number | null
}

export function positionMetrics(state: FinanceState, positionId: string): PositionMetrics {
  const position = (state.positions ?? []).find(p => p.id === positionId)
  if (!position) throw new Error('Position not found')
  const holdings = state.holdings.filter(h => position.holdingIds.includes(h.id))
  const currentValueSar = round2(holdings.reduce((sum, h) => sum + ownerQuantity(h, position.ownerId) * h.marketPriceSar, 0))
  const openBasis = holdings.reduce((sum, h) => sum + (ownerHoldingCostBasisSar(h, position.ownerId) ?? 0), 0)
  const costBasisSar = position.status === 'closed' ? position.initialCostBasisSar : round2(openBasis || position.initialCostBasisSar)
  const unrealizedGainLossSar = position.status === 'closed' || position.performanceRole === 'transactional_cash' || position.performanceRole === 'bridge'
    ? 0
    : round2(currentValueSar - costBasisSar)
  const realizedGainLossSar = round2(position.realizedGainLossSar)
  const totalGainLossSar = round2(realizedGainLossSar + unrealizedGainLossSar)
  const returnPct = position.initialCostBasisSar > 0 ? round2(totalGainLossSar / position.initialCostBasisSar * 100) : null
  return { costBasisSar, currentValueSar, unrealizedGainLossSar, realizedGainLossSar, totalGainLossSar, returnPct }
}

export interface PortfolioCoverage {
  originalTargetSar: number
  spentSar: number
  requiredSar: number
  economicCoverageSar: number
  settlementReadySar: number
  economicCoveragePct: number
  settlementReadyPct: number
  shortfallSar: number
}

export function portfolioCoverage(state: FinanceState, portfolioId: string): PortfolioCoverage {
  const portfolio = state.portfolios.find(p => p.id === portfolioId)
  if (!portfolio) throw new Error('Portfolio not found')
  const slices = state.portfolioSlices.filter(s => s.portfolioId === portfolioId)
  const economicCoverageSar = round2(slices.reduce((sum, s) => {
    const h = state.holdings.find(x => x.id === s.holdingId)
    return sum + (h ? s.quantity * h.marketPriceSar : 0)
  }, 0))
  const settlementReadySar = round2(slices.reduce((sum, s) => {
    const h = state.holdings.find(x => x.id === s.holdingId)
    return sum + (h?.kind === 'cash' ? s.quantity * h.marketPriceSar : 0)
  }, 0))
  const spentSar = round2(state.ledger.filter(tx => tx.kind === 'expense' && tx.portfolioId === portfolioId).reduce((sum, tx) => sum + tx.amountSar, 0))
  const originalTargetSar = round2(portfolio.targetValueSar ?? economicCoverageSar)
  const consumesTarget = portfolio.profile === 'commitment' || portfolio.profile === 'spending_budget'
  const requiredSar = consumesTarget ? round2(Math.max(0, originalTargetSar - spentSar)) : originalTargetSar
  return {
    originalTargetSar,
    spentSar,
    requiredSar,
    economicCoverageSar,
    settlementReadySar,
    economicCoveragePct: requiredSar > 0 ? round2(economicCoverageSar / requiredSar * 100) : 100,
    settlementReadyPct: requiredSar > 0 ? round2(settlementReadySar / requiredSar * 100) : 100,
    shortfallSar: round2(Math.max(0, requiredSar - economicCoverageSar)),
  }
}

export function capitalCycleResultSar(cycle: CapitalCycle): number {
  return round2(cycle.realizedGainsSar - cycle.realizedLossesSar - cycle.directCostsSar)
}

export function totalClosedCycleResultSar(state: FinanceState, ownerId: string): number {
  return round2((state.capitalCycles ?? [])
    .filter(c => c.ownerId === ownerId && c.status === 'closed')
    .reduce((sum, c) => sum + (c.reportingResultSar ?? capitalCycleResultSar(c)), 0))
}

export function portfolioPositionValueSar(state: FinanceState, portfolioId: string): number {
  const ids = new Set((state.positions ?? []).filter(p => p.portfolioId === portfolioId && p.status !== 'closed').flatMap(p => p.holdingIds))
  return round2(state.holdings.filter(h => ids.has(h.id) && !h.archived).reduce((sum, h) => sum + holdingValueSar(h), 0))
}

export function findPosition(state: FinanceState, id: string): Position | undefined {
  return (state.positions ?? []).find(p => p.id === id)
}
