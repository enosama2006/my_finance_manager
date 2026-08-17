import { describe, expect, it } from 'vitest'
import { addAccount, addExistingAsset, addFunds, allocateToPortfolio, createPortfolio, purchaseAsset, transferFunds } from '../src/application/commands'
import { seedState, SELF_ID } from '../src/data/seed'
import { accountValueSar, assertCostBasisCoverageInvariant, assertPhysicalQuantityInvariant, assertPortfolioAllocationInvariant, ownerQuantity } from '../src/domain/finance'
import { positionMetrics } from '../src/domain/lifecycle'

function clone() { return structuredClone(seedState) }

describe('general interactive commands', () => {
  it('creates a real account container without inventing money', () => {
    const before = seedState.holdings.length
    const next = addAccount(clone(), { name: 'حساب تجريبي جديد', kind: 'checking', custodianId: 'party-alrajhi', currency: 'SAR', last4: '1234' })
    expect(next.accounts.some(a => a.name === 'حساب تجريبي جديد')).toBe(true)
    expect(next.holdings.length).toBe(before)
  })

  it('adds opening cash as a holding and not as income', () => {
    const next = addFunds(clone(), { accountId: 'acc-vault', ownerId: SELF_ID, symbol: 'EUR', nativeUnit: 'EUR', quantity: 1000, unitCostSar: 4.25, marketPriceSar: 4.3, classification: 'opening' })
    const eur = next.holdings.find(h => h.symbol === 'EUR')!
    expect(eur.quantity).toBe(1000)
    expect(next.ledger[0].kind).toBe('opening')
    expect(next.ledger[0].amountSar).toBe(4250)
  })

  it('registers an existing car without reducing any bank account', () => {
    const before = accountValueSar(seedState, 'acc-alrajhi')
    const next = addExistingAsset(clone(), { ownerId: SELF_ID, accountId: 'acc-syria-assets', name: 'سيارتي الحالية', symbol: 'CAR', kind: 'vehicle', nativeUnit: 'سيارة', quantity: 1, costBasisSar: 80000, marketPriceSar: 70000, performanceRole: 'store_of_value' })
    expect(accountValueSar(next, 'acc-alrajhi')).toBe(before)
    expect(next.holdings.some(h => h.name === 'سيارتي الحالية')).toBe(true)
    expect(next.ledger[0].kind).toBe('opening')
  })

  it('purchases gold from real cash and carries all-in cost basis into the position', () => {
    const beforeQty = ownerQuantity(seedState.holdings.find(h => h.id === 'h-alrajhi-sar')!, SELF_ID)
    const next = purchaseAsset(clone(), { sourceHoldingId: 'h-alrajhi-sar', ownerId: SELF_ID, sourceQuantity: 5400, targetAccountId: 'acc-vault', name: 'ذهب جديد', symbol: 'XAU', kind: 'metal', nativeUnit: 'غرام', quantity: 10, marketPriceSar: 530, performanceRole: 'store_of_value', portfolioId: 'p-invest' })
    const source = next.holdings.find(h => h.id === 'h-alrajhi-sar')!
    const gold = next.holdings.find(h => h.name === 'ذهب جديد')!
    expect(ownerQuantity(source, SELF_ID)).toBe(beforeQty - 5400)
    expect(gold.quantity).toBe(10)
    expect(next.ledger[0].kind).toBe('asset_purchase')
    const metrics = positionMetrics(next, gold.positionId!)
    expect(metrics.costBasisSar).toBe(5400)
    expect(metrics.currentValueSar).toBe(5300)
    expect(metrics.unrealizedGainLossSar).toBe(-100)
  })

  it('real transfer preserves owner value, cost coverage and portfolio allocations without P/L', () => {
    const beforeTotal = accountValueSar(seedState, 'acc-alrajhi') + accountValueSar(seedState, 'acc-alinma')
    const next = transferFunds(clone(), { sourceHoldingId: 'h-alrajhi-sar', ownerId: SELF_ID, quantity: 10000, targetAccountId: 'acc-alinma' })
    const afterTotal = accountValueSar(next, 'acc-alrajhi') + accountValueSar(next, 'acc-alinma')
    expect(afterTotal).toBe(beforeTotal)
    expect(next.ledger[0].kind).toBe('real_transfer')
    expect(next.ledger[0].realizedGainLossSar ?? 0).toBe(0)
    expect(assertPortfolioAllocationInvariant(next)).toBe(true)
    expect(next.holdings.every(assertPhysicalQuantityInvariant)).toBe(true)
    expect(next.holdings.every(assertCostBasisCoverageInvariant)).toBe(true)
  })

  it('creates a portfolio without moving physical money', () => {
    const beforeLedger = seedState.ledger.length
    const next = createPortfolio(clone(), { name: 'محفظة جديدة', ownerId: SELF_ID, profile: 'investment', targetValueSar: 50000, protectionMode: 'flexible' })
    expect(next.portfolios.some(p => p.name === 'محفظة جديدة')).toBe(true)
    expect(next.ledger.length).toBe(beforeLedger)
  })

  it('allocates free cash to a portfolio without changing the holding quantity', () => {
    const beforeQty = seedState.holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity
    const next = allocateToPortfolio(clone(), { holdingId: 'h-alrajhi-sar', ownerId: SELF_ID, portfolioId: 'p-emergency', quantity: 1000 })
    expect(next.holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity).toBe(beforeQty)
    expect(next.ledger[0].kind).toBe('allocation_settlement')
    expect(next.portfolioSlices.some(s => s.portfolioId === 'p-emergency' && s.holdingId === 'h-alrajhi-sar')).toBe(true)
  })
})
