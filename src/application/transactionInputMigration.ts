import type { AssetPurchaseUserInput, FinanceState, LedgerTransaction } from '../domain/types'
import type { AssetTypeId } from '../domain/assetCatalog'

function inferAssetTypeId(tx: LedgerTransaction, state: FinanceState): AssetTypeId {
  const target = tx.targetHoldingId ? state.holdings.find(h => h.id === tx.targetHoldingId) : undefined
  const explicit = target?.assetTypeId as AssetTypeId | undefined
  if (explicit) return explicit
  const text = `${target?.name ?? ''} ${target?.symbol ?? ''}`.toLowerCase()
  if (target?.kind === 'metal') {
    if (text.includes('ذهب') || text.includes('xau') || text.includes('gold')) return 'gold'
    if (text.includes('فض') || text.includes('xag') || text.includes('silver')) return 'silver'
  }
  if (target?.kind === 'stock') return 'stock'
  if (target?.kind === 'fund') return 'fund'
  if (target?.kind === 'crypto') return 'crypto'
  if (target?.kind === 'fixed_term') return 'fixed_term'
  if (target?.kind === 'vehicle') return 'vehicle'
  if (target?.kind === 'collectible') return 'collectible'
  if (target?.kind === 'receivable') return 'receivable'
  if (target?.kind === 'real_estate') return text.includes('أرض') ? 'land' : 'property'
  return 'other'
}

function inferPurchaseInput(state: FinanceState, tx: LedgerTransaction): AssetPurchaseUserInput | undefined {
  if (tx.kind !== 'asset_purchase' || !tx.sourceHoldingId || !tx.targetHoldingId || !tx.sourceQuantity || !tx.targetQuantity) return undefined
  const source = state.holdings.find(h => h.id === tx.sourceHoldingId)
  const target = state.holdings.find(h => h.id === tx.targetHoldingId)
  if (!source || !target) return undefined
  return {
    kind: 'asset_purchase',
    sourceAccountId: source.accountId,
    sourceHoldingId: source.id,
    ownerId: tx.ownerId,
    amountPaid: tx.sourceQuantity,
    targetAccountId: target.accountId,
    assetTypeId: inferAssetTypeId(tx, state),
    name: target.name,
    symbol: target.symbol,
    quantity: tx.targetQuantity,
    extraCostsSar: tx.feesSar,
    portfolioId: tx.portfolioId,
    location: target.location,
    marketUnitPriceSar: target.marketPriceSar,
    marketSource: target.valuationSource,
  }
}

function normalizeCurrency(currency: string | undefined): string | undefined {
  if (!currency) return undefined
  const ascii = [...currency.toUpperCase()].filter(ch => ch >= 'A' && ch <= 'Z').join('')
  return ascii || currency.trim().toUpperCase()
}

/**
 * Compatibility migration. It never posts a financial event: it only enriches
 * legacy snapshots with user-intent metadata and normalizes textual currency codes.
 */
export function hydrateTransactionUserInputs(state: FinanceState): FinanceState {
  const accounts = state.accounts.map(account => ({ ...account, currency: normalizeCurrency(account.currency) }))
  const base = { ...state, accounts }
  const ledger = base.ledger.map(tx => tx.userInput ? tx : ({ ...tx, userInput: inferPurchaseInput(base, tx) }))
  return { ...base, ledger }
}
