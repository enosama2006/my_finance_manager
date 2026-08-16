import type { ConversionInput, FinanceState, Holding, LedgerTransaction } from './types'

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function holdingValueSar(holding: Holding): number {
  return round2(holding.quantity * holding.marketPriceSar)
}

export function ownerQuantity(holding: Holding, ownerId: string): number {
  return holding.ownership.find((share) => share.ownerId === ownerId)?.quantity ?? 0
}

export function ownerHoldingValueSar(holding: Holding, ownerId: string): number {
  const quantity = ownerQuantity(holding, ownerId)
  return round2(quantity * holding.marketPriceSar)
}

export function netWorthByOwner(state: FinanceState, ownerId: string): number {
  return round2(state.holdings.reduce((sum, holding) => sum + ownerHoldingValueSar(holding, ownerId), 0))
}

export function totalAllocatedByOwner(state: FinanceState, ownerId: string): number {
  return round2(state.allocations.filter((a) => a.ownerId === ownerId).reduce((sum, a) => sum + a.fundedSar, 0))
}

export function availableByOwner(state: FinanceState, ownerId: string): number {
  return round2(netWorthByOwner(state, ownerId) - totalAllocatedByOwner(state, ownerId))
}

export function realizedProfitByOwner(state: FinanceState, ownerId: string): number {
  return round2(
    state.ledger
      .filter((t) => t.ownerId === ownerId && t.kind === 'conversion')
      .reduce((sum, t) => sum + (t.realizedGainLossSar ?? 0), 0),
  )
}

export function holdingsInThirdPartyCustody(state: FinanceState, ownerId: string): Holding[] {
  return state.holdings.filter((holding) => {
    const hasOwnership = ownerQuantity(holding, ownerId) > 0
    return hasOwnership && holding.custodianId !== ownerId
  })
}

export interface ConversionPreview {
  sourceCostBasisSar: number
  proceedsSar: number
  feesSar: number
  realizedGainLossSar: number
  exchangeRate: number
}

export function previewConversion(state: FinanceState, input: ConversionInput): ConversionPreview {
  const source = state.holdings.find((h) => h.id === input.sourceHoldingId)
  if (!source) throw new Error('Source holding not found')
  if (input.sourceQuantity <= 0 || input.targetQuantity <= 0) throw new Error('Quantities must be positive')
  if (input.sourceQuantity > ownerQuantity(source, input.ownerId)) throw new Error('Owner does not have enough quantity')

  const sourceCostBasisSar = round2(input.sourceQuantity * source.averageCostSar)
  const proceedsSar = round2(input.targetQuantity * input.targetUnitValueSarAtExecution)
  const feesSar = round2(Math.max(0, input.feesSar))
  const realizedGainLossSar = round2(proceedsSar - feesSar - sourceCostBasisSar)
  const exchangeRate = round2(input.targetQuantity / input.sourceQuantity)

  return { sourceCostBasisSar, proceedsSar, feesSar, realizedGainLossSar, exchangeRate }
}

export function applyConversion(state: FinanceState, input: ConversionInput, now = new Date().toISOString()): FinanceState {
  const preview = previewConversion(state, input)
  const sourceIndex = state.holdings.findIndex((h) => h.id === input.sourceHoldingId)
  const source = state.holdings[sourceIndex]
  const ownerShareIndex = source.ownership.findIndex((s) => s.ownerId === input.ownerId)

  const updatedSource: Holding = {
    ...source,
    quantity: round2(source.quantity - input.sourceQuantity),
    ownership: source.ownership.map((share, index) =>
      index === ownerShareIndex ? { ...share, quantity: round2(share.quantity - input.sourceQuantity) } : share,
    ),
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
    container: input.targetContainer,
    custodianId: input.targetCustodianId,
    location: input.targetLocation,
    ownership: [{ ownerId: input.ownerId, quantity: input.targetQuantity }],
  }

  const tx: LedgerTransaction = {
    id: `tx-${crypto.randomUUID()}`,
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
    note: 'Realized P/L is created only because this is an asset conversion/disposal event.',
  }

  return {
    ...state,
    holdings: state.holdings.map((h, index) => (index === sourceIndex ? updatedSource : h)).concat(target),
    ledger: [tx, ...state.ledger],
  }
}

export function applyPureReallocation(state: FinanceState, allocationId: string, fundedSar: number): FinanceState {
  return {
    ...state,
    allocations: state.allocations.map((a) => (a.id === allocationId ? { ...a, fundedSar: round2(fundedSar) } : a)),
  }
}

export function assertPhysicalQuantityInvariant(holding: Holding): boolean {
  const shares = round2(holding.ownership.reduce((sum, share) => sum + share.quantity, 0))
  return shares === round2(holding.quantity)
}
