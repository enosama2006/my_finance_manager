import { describe, expect, it } from 'vitest'
import { emptyState } from '../src/data/emptyState'
import { createAssetWithOpening } from '../src/application/assetTransactions'
import { allocateToPortfolio, createPortfolio } from '../src/application/commands'
import { applyManagedConversion } from '../src/application/conversionPolicy'
import { archivePortfolio, updatePortfolio } from '../src/application/portfolios'
import { correctAllocation, correctConversion } from '../src/application/simpleTransactionCorrections'
import { voidTransaction } from '../src/application/transactionVoids'
import type { FinanceState } from '../src/domain/types'

const clone = <T,>(value: T): T => structuredClone(value)
const self = (state: FinanceState) => state.parties.find(p => p.type === 'self')!.id

function withCash(quantity = 1000) {
  let state = clone(emptyState)
  state = createAssetWithOpening(state, { name: 'الراجحي', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: self(state), quantity, costBasisSar: quantity, marketPriceSar: 1, currency: 'SAR', accountKind: 'checking' })
  return state
}

function withPortfolio(state: FinanceState) {
  return createPortfolio(state, { name: 'استثماري', ownerId: self(state), profile: 'investment', protectionMode: 'flexible' })
}

describe('schema-v5 full user correction controls', () => {
  it('voids a portfolio-funded conversion and restores source quantity plus source allocation', () => {
    let state = withPortfolio(withCash())
    const source = state.holdings[0]
    const portfolio = state.portfolios[0]
    state = allocateToPortfolio(state, { holdingId: source.id, ownerId: self(state), portfolioId: portfolio.id, quantity: 600 })
    state = applyManagedConversion(state, { sourceHoldingId: source.id, sourcePortfolioId: portfolio.id, targetPortfolioId: portfolio.id, targetSymbol: 'XAU', targetName: 'ذهب', targetKind: 'metal', targetUnit: 'غ', sourceQuantity: 200, targetQuantity: 1, targetUnitValueSarAtExecution: 200, feesSar: 0, ownerId: self(state) })
    const conversion = state.ledger.find(tx => tx.kind === 'conversion' && tx.status === 'posted')!
    const targetId = conversion.targetHoldingId!
    expect(conversion.userInput?.kind).toBe('conversion')
    expect(state.holdings.find(h => h.id === source.id)?.quantity).toBe(800)
    expect(state.portfolioSlices.find(s => s.holdingId === source.id)?.quantity).toBe(400)
    expect(state.portfolioSlices.find(s => s.holdingId === targetId)?.quantity).toBe(1)

    state = voidTransaction(state, conversion.id, 'التحويل كان خاطئًا')
    expect(state.holdings.find(h => h.id === source.id)?.quantity).toBe(1000)
    expect(state.holdings.some(h => h.id === targetId)).toBe(false)
    expect(state.portfolioSlices.find(s => s.holdingId === source.id)?.quantity).toBe(600)
    expect(state.ledger.find(tx => tx.id === conversion.id)?.status).toBe('voided')
  })

  it('corrects a conversion by replay while keeping transaction identity and revision history', () => {
    let state = withCash()
    const source = state.holdings[0]
    state = applyManagedConversion(state, { sourceHoldingId: source.id, targetSymbol: 'USD', targetName: 'دولار', targetKind: 'cash', targetUnit: 'USD', sourceQuantity: 375, targetQuantity: 100, targetUnitValueSarAtExecution: 3.75, feesSar: 0, ownerId: self(state) })
    const tx = state.ledger.find(x => x.kind === 'conversion' && x.status === 'posted')!
    state = correctConversion(state, { transactionId: tx.id, reason: 'الكمية المستلمة كانت خاطئة', at: tx.at, sourceHoldingId: source.id, targetSymbol: 'USD', targetName: 'دولار أمريكي', targetKind: 'cash', targetUnit: 'USD', sourceQuantity: 375, targetQuantity: 95, targetUnitValueSarAtExecution: 3.75, feesSar: 0, ownerId: self(state) })
    const corrected = state.ledger.find(x => x.id === tx.id)!
    expect(corrected.version).toBe(2)
    expect(corrected.revisions).toHaveLength(1)
    expect(corrected.targetQuantity).toBe(95)
    expect(corrected.userInput?.kind).toBe('conversion')
    expect(state.holdings.find(h => h.id === corrected.targetHoldingId)?.quantity).toBe(95)
  })

  it('corrects and deletes an allocation transaction without changing asset quantity', () => {
    let state = withPortfolio(withCash())
    const source = state.holdings[0]
    const portfolio = state.portfolios[0]
    state = allocateToPortfolio(state, { holdingId: source.id, ownerId: self(state), portfolioId: portfolio.id, quantity: 300 })
    const tx = state.ledger.find(x => x.kind === 'allocation_settlement' && x.status === 'posted')!
    state = correctAllocation(state, { transactionId: tx.id, reason: 'التخصيص الصحيح 200', at: tx.at, assetId: source.id, ownerId: self(state), portfolioId: portfolio.id, quantity: 200 })
    expect(state.ledger.find(x => x.id === tx.id)?.version).toBe(2)
    expect(state.portfolioSlices.find(s => s.portfolioId === portfolio.id)?.quantity).toBe(200)
    expect(state.holdings[0].quantity).toBe(1000)

    state = voidTransaction(state, tx.id, 'إلغاء التخصيص')
    expect(state.portfolioSlices.filter(s => s.portfolioId === portfolio.id)).toHaveLength(0)
    expect(state.holdings[0].quantity).toBe(1000)
    expect(state.ledger.find(x => x.id === tx.id)?.status).toBe('voided')
  })

  it('edits portfolio metadata and delete releases logical allocations to free liquidity', () => {
    let state = withPortfolio(withCash())
    const source = state.holdings[0]
    const portfolio = state.portfolios[0]
    state = allocateToPortfolio(state, { holdingId: source.id, ownerId: self(state), portfolioId: portfolio.id, quantity: 400 })
    state = updatePortfolio(state, { id: portfolio.id, name: 'استثمار طويل الأجل', ownerId: self(state), profile: 'investment', purpose: 'نمو رأس المال', targetValueSar: 5000, protectionMode: 'flexible' })
    expect(state.portfolios[0].name).toBe('استثمار طويل الأجل')
    expect(state.portfolios[0].targetValueSar).toBe(5000)
    state = archivePortfolio(state, portfolio.id)
    expect(state.portfolios[0].status).toBe('archived')
    expect(state.portfolioSlices.filter(s => s.portfolioId === portfolio.id)).toHaveLength(0)
    expect(state.holdings[0].quantity).toBe(1000)
  })
})
