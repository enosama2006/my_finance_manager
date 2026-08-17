import { round2 } from '../domain/finance'
import type { CapitalCycle, CostBasisLot, FinanceState, Holding, LedgerTransaction, Position } from '../domain/types'
import { SELF_ID } from '../data/seed'

export type ScenarioId = 'land_purchase' | 'gold_buy' | 'gold_sell' | 'xrp_purchase' | 'existing_car' | 'new_car' | 'usd_buy' | 'usd_sell' | 'syp_investment' | 'commercial_open' | 'commercial_close'

const now = () => new Date().toISOString()
const round6 = (value: number) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000
const txExists = (state: FinanceState, id: string) => state.ledger.some(t => t.id === id)
const positions = (state: FinanceState) => state.positions ?? []
const cycles = (state: FinanceState) => state.capitalCycles ?? []

function reduceLots(lots: CostBasisLot[], ownerId: string, quantity: number): CostBasisLot[] {
  let remaining = quantity
  return lots.map(lot => {
    if (lot.ownerId !== ownerId || remaining <= 0) return lot
    const used = Math.min(lot.quantity, remaining)
    remaining = round6(remaining - used)
    return { ...lot, quantity: round6(lot.quantity - used) }
  }).filter(lot => lot.quantity > 0)
}

function debitHolding(state: FinanceState, holdingId: string, quantity: number): FinanceState {
  const holding = state.holdings.find(h => h.id === holdingId)
  if (!holding) throw new Error('الحيازة المصدر غير موجودة')
  const own = holding.ownership.find(o => o.ownerId === SELF_ID)?.quantity ?? 0
  if (quantity > own) throw new Error('الرصيد غير كافٍ لتنفيذ السيناريو')
  return {
    ...state,
    holdings: state.holdings.map(h => h.id !== holdingId ? h : {
      ...h,
      quantity: round6(h.quantity - quantity),
      ownership: h.ownership.map(o => o.ownerId === SELF_ID ? { ...o, quantity: round6(o.quantity - quantity) } : o),
      costLots: reduceLots(h.costLots, SELF_ID, quantity),
    }),
  }
}

function creditCash(state: FinanceState, holdingId: string, quantity: number): FinanceState {
  const holding = state.holdings.find(h => h.id === holdingId)
  if (!holding) throw new Error('حيازة النقد الوجهة غير موجودة')
  return {
    ...state,
    holdings: state.holdings.map(h => h.id !== holdingId ? h : {
      ...h,
      quantity: round6(h.quantity + quantity),
      ownership: h.ownership.map(o => o.ownerId === SELF_ID ? { ...o, quantity: round6(o.quantity + quantity) } : o),
      costLots: h.costLots.concat({ id: `lot-${crypto.randomUUID()}`, ownerId: SELF_ID, quantity, unitCostSar: h.symbol === 'SAR' ? 1 : h.marketPriceSar, acquiredAt: now() }),
    }),
  }
}

function appendHolding(state: FinanceState, holding: Holding): FinanceState {
  if (state.holdings.some(h => h.id === holding.id)) return state
  return { ...state, holdings: state.holdings.concat(holding) }
}

function appendPosition(state: FinanceState, position: Position): FinanceState {
  if (positions(state).some(p => p.id === position.id)) return state
  return { ...state, positions: positions(state).concat(position) }
}

function appendCycle(state: FinanceState, cycle: CapitalCycle): FinanceState {
  if (cycles(state).some(c => c.id === cycle.id)) return state
  return { ...state, capitalCycles: cycles(state).concat(cycle) }
}

function appendTx(state: FinanceState, tx: LedgerTransaction): FinanceState {
  if (txExists(state, tx.id)) return state
  return { ...state, ledger: [tx, ...state.ledger] }
}

function addSlice(state: FinanceState, portfolioId: string, holdingId: string, quantity: number): FinanceState {
  if (state.portfolioSlices.some(s => s.holdingId === holdingId && s.portfolioId === portfolioId)) return state
  return { ...state, portfolioSlices: state.portfolioSlices.concat({ id: `slice-${holdingId}`, portfolioId, holdingId, ownerId: SELF_ID, quantity }) }
}

function baseTx(id: string, kind: LedgerTransaction['kind'], title: string, amountSar: number): LedgerTransaction {
  return { id, version: 1, status: 'posted', revisions: [], at: now(), kind, title, amountSar: round2(amountSar), ownerId: SELF_ID }
}

function investmentHolding(input: {
  id: string; symbol: string; name: string; kind: Holding['kind']; unit: string; quantity: number; marketPriceSar: number; totalCostSar: number; accountId: string; custodianId: string; positionId: string; journey: string[]; location?: string; role?: Holding['performanceRole']
}): Holding {
  return {
    id: input.id,
    symbol: input.symbol,
    name: input.name,
    kind: input.kind,
    nativeUnit: input.unit,
    quantity: input.quantity,
    marketPriceSar: round6(input.marketPriceSar),
    costLots: [{ id: `lot-${input.id}`, ownerId: SELF_ID, quantity: input.quantity, unitCostSar: round6(input.totalCostSar / input.quantity), acquiredAt: now() }],
    valuationMethod: input.kind === 'real_estate' || input.kind === 'vehicle' ? 'manual_appraisal' : input.kind === 'cash' ? 'fx' : 'market_quote',
    valuationSource: 'Scenario Lab',
    valuedAt: now(),
    accountId: input.accountId,
    custodianId: input.custodianId,
    location: input.location,
    ownership: [{ ownerId: SELF_ID, quantity: input.quantity }],
    performanceRole: input.role ?? 'investment',
    positionId: input.positionId,
    acquisitionJourney: input.journey,
  }
}

function runLandPurchase(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-land-buy')) return state
  let next = debitHolding(state, 'h-alrajhi-sar', 39000)
  next = appendHolding(next, investmentHolding({ id: 'h-lab-land', symbol: 'LAND', name: 'أرض سوريا — تجربة', kind: 'real_estate', unit: 'قطعة', quantity: 1, marketPriceSar: 39270, totalCostSar: 39000, accountId: 'acc-syria-assets', custodianId: SELF_ID, positionId: 'pos-lab-land', journey: ['SAR 39,000', 'USD 10,000 @ 3.90 all-in', 'Land'], location: 'سوريا' }))
  next = appendPosition(next, { id: 'pos-lab-land', name: 'أرض سوريا', ownerId: SELF_ID, portfolioId: 'p-invest', holdingIds: ['h-lab-land'], openedAt: now(), status: 'open', performanceRole: 'investment', initialCostBasisSar: 39000, realizedGainLossSar: 0, note: 'تكلفة الأرض تحمل كامل رحلة SAR → USD → Land.' })
  next = addSlice(next, 'p-invest', 'h-lab-land', 1)
  return appendTx(next, { ...baseTx('lab-land-buy', 'asset_purchase', 'شراء أرض عبر SAR → USD → Land', 39000), sourceHoldingId: 'h-alrajhi-sar', targetHoldingId: 'h-lab-land', targetQuantity: 1, positionId: 'pos-lab-land', portfolioId: 'p-invest', note: '10,000 USD كلفت فعليًا 39,000 SAR؛ التكلفة انتقلت إلى الأرض.' })
}

function runGoldBuy(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-gold-buy')) return state
  let next = debitHolding(state, 'h-alrajhi-sar', 5400)
  next = appendHolding(next, investmentHolding({ id: 'h-lab-gold', symbol: 'XAU', name: 'ذهب 10غ — دورة قصيرة', kind: 'metal', unit: 'غرام', quantity: 10, marketPriceSar: 530, totalCostSar: 5400, accountId: 'acc-vault', custodianId: SELF_ID, positionId: 'pos-lab-gold', journey: ['SAR 5,400', 'Gold 10g @ all-in 540/g'], location: 'خزنة المنزل', role: 'store_of_value' }))
  next = appendPosition(next, { id: 'pos-lab-gold', name: 'دورة ذهب 10غ', ownerId: SELF_ID, portfolioId: 'p-invest', cycleId: 'cycle-lab-gold', holdingIds: ['h-lab-gold'], openedAt: now(), status: 'open', performanceRole: 'store_of_value', initialCostBasisSar: 5400, realizedGainLossSar: 0 })
  next = appendCycle(next, { id: 'cycle-lab-gold', name: 'شراء ثم تسييل 10غ ذهب', ownerId: SELF_ID, portfolioId: 'p-invest', kind: 'investment_round', status: 'open', openedAt: now(), capitalInputSar: 5400, realizedGainsSar: 0, realizedLossesSar: 0, directCostsSar: 0, openObligationSar: 0, transactionIds: ['lab-gold-buy'], positionIds: ['pos-lab-gold'] })
  next = addSlice(next, 'p-invest', 'h-lab-gold', 10)
  return appendTx(next, { ...baseTx('lab-gold-buy', 'asset_purchase', 'شراء 10غ ذهب بتكلفة شاملة 540/غ', 5400), sourceHoldingId: 'h-alrajhi-sar', targetHoldingId: 'h-lab-gold', targetQuantity: 10, positionId: 'pos-lab-gold', cycleId: 'cycle-lab-gold', portfolioId: 'p-invest' })
}

function runGoldSell(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-gold-sell')) return state
  const gold = state.holdings.find(h => h.id === 'h-lab-gold')
  if (!gold || gold.quantity < 10) throw new Error('شغّل شراء الذهب أولًا')
  let next = creditCash(state, 'h-alrajhi-sar', 5500)
  next = { ...next,
    holdings: next.holdings.map(h => h.id !== 'h-lab-gold' ? h : { ...h, quantity: 0, ownership: h.ownership.map(o => ({ ...o, quantity: 0 })), costLots: [], archived: true }),
    portfolioSlices: next.portfolioSlices.filter(s => s.holdingId !== 'h-lab-gold'),
    positions: positions(next).map(p => p.id !== 'pos-lab-gold' ? p : { ...p, status: 'closed', closedAt: now(), realizedGainLossSar: 100 }),
    capitalCycles: cycles(next).map(c => c.id !== 'cycle-lab-gold' ? c : { ...c, status: 'closed', closedAt: now(), realizedGainsSar: 100, reportingResultSar: 100, transactionIds: [...c.transactionIds, 'lab-gold-sell'] }),
  }
  return appendTx(next, { ...baseTx('lab-gold-sell', 'asset_sale', 'تسييل 10غ ذهب', 5500), sourceHoldingId: 'h-lab-gold', targetHoldingId: 'h-alrajhi-sar', sourceQuantity: 10, realizedGainLossSar: 100, positionId: 'pos-lab-gold', cycleId: 'cycle-lab-gold', portfolioId: 'p-invest', note: '5,400 رجوع أصل رأس المال + 100 ربح محقق؛ 5,500 ليست كلها دخلًا.' })
}

function runXrpPurchase(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-xrp-buy')) return state
  let next = debitHolding(state, 'h-alrajhi-sar', 3750)
  next = appendHolding(next, investmentHolding({ id: 'h-lab-xrp', symbol: 'XRP', name: 'XRP — Google Pay → USDT → XRP', kind: 'crypto', unit: 'XRP', quantity: 985, marketPriceSar: 3.75, totalCostSar: 3750, accountId: 'acc-binance', custodianId: 'party-binance', positionId: 'pos-lab-xrp', journey: ['1,000 USD economic outlay', '985 USDT after 15 USD friction', '985 XRP'] }))
  next = appendPosition(next, { id: 'pos-lab-xrp', name: 'XRP 985', ownerId: SELF_ID, portfolioId: 'p-invest', holdingIds: ['h-lab-xrp'], openedAt: now(), status: 'open', performanceRole: 'investment', initialCostBasisSar: 3750, realizedGainLossSar: 0, note: 'تكلفة 15 USD لم تضِع؛ حملت إلى Cost Basis النهائي للـXRP.' })
  next = addSlice(next, 'p-invest', 'h-lab-xrp', 985)
  return appendTx(next, { ...baseTx('lab-xrp-buy', 'asset_purchase', 'شراء XRP عبر Google Pay وUSDT', 3750), sourceHoldingId: 'h-alrajhi-sar', targetHoldingId: 'h-lab-xrp', targetQuantity: 985, positionId: 'pos-lab-xrp', portfolioId: 'p-invest', feesSar: 56.25, note: 'الـ56.25 SAR جزء تفسيري من Cost Basis وليس خسارة إضافية ثانية.' })
}

function runExistingCar(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-car-existing')) return state
  let next = appendHolding(state, investmentHolding({ id: 'h-lab-car-existing', symbol: 'CAR', name: 'سيارة موجودة قبل التطبيق', kind: 'vehicle', unit: 'سيارة', quantity: 1, marketPriceSar: 135000, totalCostSar: 120000, accountId: 'acc-syria-assets', custodianId: SELF_ID, positionId: 'pos-lab-car-existing', journey: ['Existing asset onboarding'], location: 'سوريا' }))
  next = appendPosition(next, { id: 'pos-lab-car-existing', name: 'سيارة قائمة', ownerId: SELF_ID, portfolioId: 'p-income-assets', holdingIds: ['h-lab-car-existing'], openedAt: '2025-01-01T00:00:00.000Z', status: 'open', performanceRole: 'investment', initialCostBasisSar: 120000, realizedGainLossSar: 0, note: 'إدخال أصل قائم لا يخصم من أي حساب حالي.' })
  next = addSlice(next, 'p-income-assets', 'h-lab-car-existing', 1)
  return appendTx(next, { ...baseTx('lab-car-existing', 'opening', 'إدخال سيارة قائمة دون حركة مصرفية', 0), targetHoldingId: 'h-lab-car-existing', positionId: 'pos-lab-car-existing', portfolioId: 'p-income-assets', note: 'Opening Asset: لا يوجد شراء وهمي ولا خصم من الرصيد الحالي.' })
}

function runNewCar(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-car-buy')) return state
  let next = debitHolding(state, 'h-alinma-sar', 150000)
  next = appendHolding(next, investmentHolding({ id: 'h-lab-car-new', symbol: 'CAR', name: 'سيارة استثمارية جديدة', kind: 'vehicle', unit: 'سيارة', quantity: 1, marketPriceSar: 145000, totalCostSar: 150000, accountId: 'acc-syria-assets', custodianId: SELF_ID, positionId: 'pos-lab-car-new', journey: ['SAR 150,000', 'Vehicle'], location: 'سوريا' }))
  next = appendPosition(next, { id: 'pos-lab-car-new', name: 'سيارة استثمارية جديدة', ownerId: SELF_ID, portfolioId: 'p-income-assets', holdingIds: ['h-lab-car-new'], openedAt: now(), status: 'open', performanceRole: 'investment', initialCostBasisSar: 150000, realizedGainLossSar: 0 })
  next = addSlice(next, 'p-income-assets', 'h-lab-car-new', 1)
  return appendTx(next, { ...baseTx('lab-car-buy', 'asset_purchase', 'شراء سيارة استثمارية من الإنماء', 150000), sourceHoldingId: 'h-alinma-sar', targetHoldingId: 'h-lab-car-new', targetQuantity: 1, positionId: 'pos-lab-car-new', portfolioId: 'p-income-assets' })
}

function runUsdBuy(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-usd-buy')) return state
  let next = debitHolding(state, 'h-alrajhi-sar', 37650)
  next = appendHolding(next, investmentHolding({ id: 'h-lab-usd', symbol: 'USD', name: 'USD سيولة تشغيلية', kind: 'cash', unit: 'USD', quantity: 10000, marketPriceSar: 3.74, totalCostSar: 37650, accountId: 'acc-vault', custodianId: SELF_ID, positionId: 'pos-lab-usd', journey: ['SAR 37,650', 'USD 10,000 @ 3.765'], location: 'خزنة المنزل', role: 'transactional_cash' }))
  next = appendPosition(next, { id: 'pos-lab-usd', name: '10,000 USD سيولة', ownerId: SELF_ID, holdingIds: ['h-lab-usd'], openedAt: now(), status: 'open', performanceRole: 'transactional_cash', initialCostBasisSar: 37650, realizedGainLossSar: 0, note: 'نحتفظ بالتكلفة لكن لا نعرض Unrealized P/L افتراضيًا.' })
  return appendTx(next, { ...baseTx('lab-usd-buy', 'conversion', 'شراء 10,000 USD كسيولة', 37650), sourceHoldingId: 'h-alrajhi-sar', targetHoldingId: 'h-lab-usd', targetQuantity: 10000, positionId: 'pos-lab-usd' })
}

function runUsdSell(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-usd-sell')) return state
  const usd = state.holdings.find(h => h.id === 'h-lab-usd')
  if (!usd || usd.quantity < 10000) throw new Error('شغّل شراء الدولار أولًا')
  let next = creditCash(state, 'h-alrajhi-sar', 37400)
  next = { ...next,
    holdings: next.holdings.map(h => h.id !== 'h-lab-usd' ? h : { ...h, quantity: 0, ownership: h.ownership.map(o => ({ ...o, quantity: 0 })), costLots: [], archived: true }),
    positions: positions(next).map(p => p.id !== 'pos-lab-usd' ? p : { ...p, status: 'closed', closedAt: now(), realizedGainLossSar: -250 }),
  }
  return appendTx(next, { ...baseTx('lab-usd-sell', 'conversion', 'إعادة USD إلى SAR', 37400), sourceHoldingId: 'h-lab-usd', targetHoldingId: 'h-alrajhi-sar', sourceQuantity: 10000, realizedGainLossSar: -250, positionId: 'pos-lab-usd', note: 'الخسارة تحققت عند إغلاق مركز العملة: 37,400 - 37,650 = -250 SAR.' })
}

function runSypInvestment(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-syp-buy')) return state
  let next = debitHolding(state, 'h-alrajhi-sar', 3750)
  const quantity = 125000
  const marketPriceSar = 3.75 / 122
  next = appendHolding(next, investmentHolding({ id: 'h-lab-syp', symbol: 'SYP', name: 'ليرة سورية — مركز استثماري', kind: 'cash', unit: 'SYP', quantity, marketPriceSar, totalCostSar: 3750, accountId: 'acc-syria-assets', custodianId: SELF_ID, positionId: 'pos-lab-syp', journey: ['1,000 USD equivalent', '125,000 SYP @ 125 SYP/USD'], location: 'سوريا', role: 'investment' }))
  next = appendPosition(next, { id: 'pos-lab-syp', name: 'SYP استثماري', ownerId: SELF_ID, portfolioId: 'p-invest', holdingIds: ['h-lab-syp'], openedAt: now(), status: 'open', performanceRole: 'investment', initialCostBasisSar: 3750, realizedGainLossSar: 0, note: 'التقييم الحالي يفترض 122 SYP/USD؛ انخفاض الرقم يعني قوة SYP.' })
  next = addSlice(next, 'p-invest', 'h-lab-syp', quantity)
  return appendTx(next, { ...baseTx('lab-syp-buy', 'conversion', 'شراء SYP كمركز استثماري', 3750), sourceHoldingId: 'h-alrajhi-sar', targetHoldingId: 'h-lab-syp', targetQuantity: quantity, positionId: 'pos-lab-syp', portfolioId: 'p-invest' })
}

function runCommercialOpen(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-commercial-sale')) return state
  const tryRateSar = 3.75 / 45
  let next = appendHolding(state, investmentHolding({ id: 'h-lab-try', symbol: 'TRY', name: 'حصيلة عملية USDT', kind: 'cash', unit: 'TRY', quantity: 50000, marketPriceSar: tryRateSar, totalCostSar: 3750, accountId: 'acc-turkey', custodianId: 'party-turkey-bank', positionId: 'pos-lab-try', journey: ['1,000 USDT', 'Sell @ 50 TRY/USDT', '50,000 TRY'], role: 'transactional_cash' }))
  next = appendPosition(next, { id: 'pos-lab-try', name: 'حصيلة TRY للعملية القصيرة', ownerId: SELF_ID, cycleId: 'cycle-commercial', holdingIds: ['h-lab-try'], openedAt: now(), status: 'open', performanceRole: 'transactional_cash', initialCostBasisSar: 3750, realizedGainLossSar: 416.67 })
  next = appendCycle(next, { id: 'cycle-commercial', name: 'عملية تجارية قصيرة USDT → TRY → تسوية', ownerId: SELF_ID, kind: 'commercial_operation', status: 'partially_settled', openedAt: now(), capitalInputSar: 3750, realizedGainsSar: 416.67, realizedLossesSar: 0, directCostsSar: 0, openObligationSar: 1875, transactionIds: ['lab-commercial-sale'], positionIds: ['pos-lab-try'], nativeResultAmount: 5000, nativeResultCurrency: 'TRY', note: 'الـ5,000 TRY هامش محقق حتى الآن، لكن الدورة لم تغلق بعد.' })
  return appendTx(next, { ...baseTx('lab-commercial-sale', 'asset_sale', 'بيع 1,000 USDT بسعر 50 TRY', 4166.67), targetHoldingId: 'h-lab-try', targetQuantity: 50000, realizedGainLossSar: 416.67, cycleId: 'cycle-commercial', positionId: 'pos-lab-try', note: 'مرجع السيناريو 45 TRY/USDT؛ الهامش 5,000 TRY، والدورة ما زالت مفتوحة.' })
}

function runCommercialClose(state: FinanceState): FinanceState {
  if (txExists(state, 'lab-commercial-close')) return state
  const cycle = cycles(state).find(c => c.id === 'cycle-commercial')
  if (!cycle) throw new Error('شغّل العملية التجارية أولًا')
  const extraCostSar = 10 * 3.75
  const finalResultSar = round2(416.67 - extraCostSar)
  const residualTry = 4550
  const residualPosition: Position = { id: 'pos-lab-try-residual', name: 'ربح TRY بعد إغلاق الدورة', ownerId: SELF_ID, holdingIds: ['h-lab-try'], openedAt: now(), status: 'open', performanceRole: 'transactional_cash', initialCostBasisSar: finalResultSar, realizedGainLossSar: 0, note: 'أي تغير لاحق في TRY/SAR يخص هذا المركز بعد الإغلاق ولا يعيد كتابة ربح الدورة.' }
  let next: FinanceState = {
    ...state,
    holdings: state.holdings.map(h => h.id !== 'h-lab-try' ? h : { ...h, quantity: residualTry, ownership: [{ ownerId: SELF_ID, quantity: residualTry }], costLots: [{ id: 'lot-lab-try-residual', ownerId: SELF_ID, quantity: residualTry, unitCostSar: round6(finalResultSar / residualTry), acquiredAt: now() }], positionId: residualPosition.id, acquisitionJourney: ['Closed cycle residual', '4,550 TRY'] }),
    positions: positions(state).map(p => p.id !== 'pos-lab-try' ? p : { ...p, status: 'closed', closedAt: now(), holdingIds: [] }).concat(residualPosition),
    capitalCycles: cycles(state).map(c => c.id !== 'cycle-commercial' ? c : { ...c, status: 'closed', closedAt: now(), directCostsSar: extraCostSar, openObligationSar: 0, reportingResultSar: finalResultSar, nativeResultAmount: residualTry, nativeResultCurrency: 'TRY', transactionIds: [...c.transactionIds, 'lab-commercial-close'], note: 'تمت التسوية؛ استُهلك 45,450 TRY من الحصيلة وبقي 4,550 TRY ربحًا نهائيًا للدورة.' }),
  }
  next = appendTx(next, { ...baseTx('lab-commercial-close', 'expense', 'إكمال التسوية وتثبيت نتيجة الدورة', extraCostSar), cycleId: 'cycle-commercial', note: 'النتيجة النهائية 4,550 TRY ≈ 379.17 SAR في فرضيات السيناريو، وأصبحت البقية مركز TRY جديدًا مستقلًا.' })
  return next
}

export function runScenario(state: FinanceState, id: ScenarioId): FinanceState {
  switch (id) {
    case 'land_purchase': return runLandPurchase(state)
    case 'gold_buy': return runGoldBuy(state)
    case 'gold_sell': return runGoldSell(state)
    case 'xrp_purchase': return runXrpPurchase(state)
    case 'existing_car': return runExistingCar(state)
    case 'new_car': return runNewCar(state)
    case 'usd_buy': return runUsdBuy(state)
    case 'usd_sell': return runUsdSell(state)
    case 'syp_investment': return runSypInvestment(state)
    case 'commercial_open': return runCommercialOpen(state)
    case 'commercial_close': return runCommercialClose(state)
  }
}
