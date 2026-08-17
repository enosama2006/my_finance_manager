import { describe, expect, it } from 'vitest'
import { runScenario } from '../src/application/scenarios'
import { seedState } from '../src/data/seed'
import { capitalCycleResultSar, portfolioCoverage, positionMetrics } from '../src/domain/lifecycle'

const fresh = () => structuredClone(seedState)

describe('MyFinMan Operating Lab V1', () => {
  it('carries all-in SAR cost through USD into Land without losing cost basis', () => {
    const before = fresh().holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity
    const next = runScenario(fresh(), 'land_purchase')
    const land = positionMetrics(next, 'pos-lab-land')
    expect(next.holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity).toBe(before - 39000)
    expect(land.costBasisSar).toBe(39000)
    expect(land.currentValueSar).toBe(39270)
    expect(land.unrealizedGainLossSar).toBe(270)
  })

  it('gold round trip returns principal and realizes only the 100 SAR gain', () => {
    const initialCash = fresh().holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity
    const bought = runScenario(fresh(), 'gold_buy')
    expect(positionMetrics(bought, 'pos-lab-gold').unrealizedGainLossSar).toBe(-100)
    const sold = runScenario(bought, 'gold_sell')
    const p = positionMetrics(sold, 'pos-lab-gold')
    expect(p.realizedGainLossSar).toBe(100)
    expect(p.currentValueSar).toBe(0)
    expect(sold.holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity).toBe(initialCash + 100)
    expect(sold.ledger.find(t => t.id === 'lab-gold-sell')!.amountSar).toBe(5500)
    expect(sold.ledger.find(t => t.id === 'lab-gold-sell')!.realizedGainLossSar).toBe(100)
  })

  it('Google Pay friction is carried into XRP cost basis once, not double-counted', () => {
    const next = runScenario(fresh(), 'xrp_purchase')
    const p = positionMetrics(next, 'pos-lab-xrp')
    expect(p.costBasisSar).toBeCloseTo(3750, 1)
    expect(p.currentValueSar).toBe(3693.75)
    expect(p.unrealizedGainLossSar).toBeCloseTo(-56.25, 1)
    expect(next.ledger.find(t => t.id === 'lab-xrp-buy')!.feesSar).toBe(56.25)
  })

  it('transactional USD retains acquisition cost but recognizes loss only when converted back to SAR', () => {
    const bought = runScenario(fresh(), 'usd_buy')
    const open = positionMetrics(bought, 'pos-lab-usd')
    expect(open.unrealizedGainLossSar).toBe(0)
    const sold = runScenario(bought, 'usd_sell')
    expect(positionMetrics(sold, 'pos-lab-usd').realizedGainLossSar).toBe(-250)
  })

  it('volatile currency investment can be mark-to-market using quote direction', () => {
    const next = runScenario(fresh(), 'syp_investment')
    const p = positionMetrics(next, 'pos-lab-syp')
    expect(p.unrealizedGainLossSar).toBeGreaterThan(0)
  })

  it('existing car onboarding creates no current bank outflow while a new car purchase does', () => {
    const base = fresh()
    const beforeRajhi = base.holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity
    const beforeAlinma = base.holdings.find(h => h.id === 'h-alinma-sar')!.quantity
    const existing = runScenario(base, 'existing_car')
    expect(existing.holdings.find(h => h.id === 'h-alrajhi-sar')!.quantity).toBe(beforeRajhi)
    expect(existing.holdings.find(h => h.id === 'h-alinma-sar')!.quantity).toBe(beforeAlinma)
    const purchased = runScenario(existing, 'new_car')
    expect(purchased.holdings.find(h => h.id === 'h-alinma-sar')!.quantity).toBe(beforeAlinma - 150000)
    expect(positionMetrics(purchased, 'pos-lab-car-new').unrealizedGainLossSar).toBe(-5000)
  })

  it('commitment portfolio separates economic coverage from settlement-ready cash', () => {
    const rent = portfolioCoverage(fresh(), 'p-rent')
    expect(rent.economicCoveragePct).toBeCloseTo(100, 1)
    expect(rent.settlementReadySar).toBe(5000)
    expect(rent.settlementReadyPct).toBeCloseTo(16.67, 1)
  })

  it('short commercial cycle stays open after realized spread and freezes result only after closure', () => {
    const opened = runScenario(fresh(), 'commercial_open')
    const openCycle = opened.capitalCycles!.find(c => c.id === 'cycle-commercial')!
    expect(openCycle.status).not.toBe('closed')
    expect(openCycle.realizedGainsSar).toBe(416.67)
    expect(openCycle.openObligationSar).toBe(1875)
    const closed = runScenario(opened, 'commercial_close')
    const closedCycle = closed.capitalCycles!.find(c => c.id === 'cycle-commercial')!
    expect(closedCycle.status).toBe('closed')
    expect(closedCycle.nativeResultAmount).toBe(4550)
    expect(closedCycle.reportingResultSar).toBe(379.17)
    expect(capitalCycleResultSar(closedCycle)).toBe(379.17)
    expect(closed.holdings.find(h => h.id === 'h-lab-try')!.quantity).toBe(4550)
    expect(closed.positions!.find(p => p.id === 'pos-lab-try-residual')?.status).toBe('open')
  })
})
