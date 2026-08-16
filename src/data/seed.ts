import type { FinanceState } from '../domain/types'

export const SELF_ID = 'party-self'

const tx = (id: string, at: string, kind: FinanceState['ledger'][number]['kind'], title: string, amountSar: number, ownerId = SELF_ID): FinanceState['ledger'][number] => ({ id, version: 1, status: 'posted', revisions: [], at, kind, title, amountSar, ownerId })

export const seedState: FinanceState = {
  schemaVersion: 4,
  costBasisMethod: 'weighted_average',
  parties: [
    { id: SELF_ID, name: 'أنا', type: 'self' },
    { id: 'party-owner-2', name: 'مالك 2', type: 'person' },
    { id: 'party-ahmad', name: 'أحمد', type: 'person' },
    { id: 'party-alinma', name: 'مصرف الإنماء', type: 'bank' },
    { id: 'party-alrajhi', name: 'مصرف الراجحي', type: 'bank' },
    { id: 'party-broker', name: 'منصة الاستثمار', type: 'broker' },
  ],
  accounts: [
    { id: 'acc-alinma', name: 'جاري الإنماء', kind: 'checking', custodianId: 'party-alinma', institutionId: 'party-alinma', currency: 'SAR', last4: '2201', status: 'active', openingBalanceSar: 1000000, openingAt: '2026-08-01', observedBalanceSar: 1000000, observedAt: '2026-08-16' },
    { id: 'acc-alrajhi', name: 'جاري الراجحي', kind: 'checking', custodianId: 'party-alrajhi', institutionId: 'party-alrajhi', currency: 'SAR', last4: '7732', status: 'active', openingBalanceSar: 80000, openingAt: '2026-08-01', observedBalanceSar: 80000, observedAt: '2026-08-16' },
    { id: 'acc-vault', name: 'الخزنة', kind: 'cash', custodianId: SELF_ID, status: 'active' },
    { id: 'acc-ahmad-custody', name: 'حفظ لدى أحمد', kind: 'custody', custodianId: 'party-ahmad', status: 'active' },
    { id: 'acc-broker', name: 'حساب الاستثمار', kind: 'investment', custodianId: 'party-broker', institutionId: 'party-broker', status: 'active' },
  ],
  holdings: [
    { id: 'h-alinma-sar', symbol: 'SAR', name: 'ريال سعودي', kind: 'currency', nativeUnit: 'ر.س', quantity: 1000000, marketPriceSar: 1, costLots: [{ id: 'lot-alinma', ownerId: SELF_ID, quantity: 1000000, unitCostSar: 1, acquiredAt: '2026-08-01' }], valuationMethod: 'nominal', accountId: 'acc-alinma', custodianId: 'party-alinma', ownership: [{ ownerId: SELF_ID, quantity: 1000000 }] },
    { id: 'h-alrajhi-sar', symbol: 'SAR', name: 'ريال سعودي', kind: 'currency', nativeUnit: 'ر.س', quantity: 80000, marketPriceSar: 1, costLots: [{ id: 'lot-alrajhi', ownerId: SELF_ID, quantity: 80000, unitCostSar: 1, acquiredAt: '2026-08-01' }], valuationMethod: 'nominal', accountId: 'acc-alrajhi', custodianId: 'party-alrajhi', ownership: [{ ownerId: SELF_ID, quantity: 80000 }] },
    { id: 'h-usd', symbol: 'USD', name: 'دولار أمريكي', kind: 'currency', nativeUnit: 'USD', quantity: 12000, marketPriceSar: 3.75, costLots: [{ id: 'lot-usd', ownerId: SELF_ID, quantity: 12000, unitCostSar: 3.74, acquiredAt: '2025-01-01' }], valuationMethod: 'fx', valuationSource: 'manual seed', valuedAt: '2026-08-16', accountId: 'acc-vault', custodianId: SELF_ID, location: 'الخزنة', ownership: [{ ownerId: SELF_ID, quantity: 12000 }] },
    { id: 'h-silver-ahmad', symbol: 'XAG', name: 'فضة', kind: 'metal', nativeUnit: 'غرام', quantity: 500, marketPriceSar: 8.1, costLots: [{ id: 'lot-silver-ahmad', ownerId: SELF_ID, quantity: 500, unitCostSar: 7.55, acquiredAt: '2026-01-01' }], valuationMethod: 'market_quote', valuationSource: 'manual seed', valuedAt: '2026-08-16', accountId: 'acc-ahmad-custody', custodianId: 'party-ahmad', location: 'لدى أحمد', ownership: [{ ownerId: SELF_ID, quantity: 500 }] },
    { id: 'h-gold', symbol: 'XAU', name: 'ذهب', kind: 'metal', nativeUnit: 'غرام', quantity: 25, marketPriceSar: 545, costLots: [{ id: 'lot-gold', ownerId: SELF_ID, quantity: 25, unitCostSar: 530, acquiredAt: '2026-05-01' }], valuationMethod: 'market_quote', valuationSource: 'manual seed', valuedAt: '2026-08-16', accountId: 'acc-vault', custodianId: SELF_ID, location: 'الخزنة', ownership: [{ ownerId: SELF_ID, quantity: 25 }] },
    { id: 'h-shared-silver', symbol: 'XAG', name: 'فضة مشتركة', kind: 'metal', nativeUnit: 'غرام', quantity: 1000, marketPriceSar: 8.1, costLots: [{ id: 'lot-shared-self', ownerId: SELF_ID, quantity: 700, unitCostSar: 7.7, acquiredAt: '2026-02-01' }, { id: 'lot-shared-owner2', ownerId: 'party-owner-2', quantity: 300, unitCostSar: 7.9, acquiredAt: '2026-03-01' }], valuationMethod: 'market_quote', valuationSource: 'manual seed', valuedAt: '2026-08-16', accountId: 'acc-broker', custodianId: 'party-broker', location: 'مستودع الحفظ', ownership: [{ ownerId: SELF_ID, quantity: 700 }, { ownerId: 'party-owner-2', quantity: 300 }] },
    { id: 'h-global-fund', symbol: 'GLB', name: 'صندوق أسهم عالمي', kind: 'fund', nativeUnit: 'وحدة', quantity: 1000, marketPriceSar: 103, costLots: [{ id: 'lot-global-fund', ownerId: SELF_ID, quantity: 1000, unitCostSar: 100, acquiredAt: '2026-04-01' }], valuationMethod: 'market_quote', valuationSource: 'manual seed', valuedAt: '2026-08-16', accountId: 'acc-broker', custodianId: 'party-broker', ownership: [{ ownerId: SELF_ID, quantity: 1000 }] },
  ],
  portfolios: [
    { id: 'p-root', name: 'أموالي', ownerIds: [SELF_ID], purpose: 'الجذر التجميعي', status: 'active' },
    { id: 'p-commitments', name: 'التزاماتي', parentId: 'p-root', ownerIds: [SELF_ID], purpose: 'الالتزامات والاحتياجات', status: 'active' },
    { id: 'p-monthly', name: 'المصاريف الشهرية', parentId: 'p-commitments', ownerIds: [SELF_ID], targetValueSar: 240000, status: 'active' },
    { id: 'p-emergency', name: 'الطوارئ', parentId: 'p-commitments', ownerIds: [SELF_ID], targetValueSar: 120000, status: 'active' },
    { id: 'p-savings', name: 'الادخار', parentId: 'p-root', ownerIds: [SELF_ID], status: 'active' },
    { id: 'p-flex', name: 'ادخار مرن', parentId: 'p-savings', ownerIds: [SELF_ID], targetValueSar: 180000, status: 'active' },
    { id: 'p-invest', name: 'الاستثمار طويل الأجل', parentId: 'p-savings', ownerIds: [SELF_ID], targetValueSar: 350000, status: 'active' },
  ],
  portfolioSlices: [
    { id: 's-emergency', portfolioId: 'p-emergency', holdingId: 'h-alinma-sar', ownerId: SELF_ID, quantity: 100000 },
    { id: 's-monthly-a', portfolioId: 'p-monthly', holdingId: 'h-alinma-sar', ownerId: SELF_ID, quantity: 150000 },
    { id: 's-monthly-r', portfolioId: 'p-monthly', holdingId: 'h-alrajhi-sar', ownerId: SELF_ID, quantity: 50000 },
    { id: 's-flex', portfolioId: 'p-flex', holdingId: 'h-alinma-sar', ownerId: SELF_ID, quantity: 120000 },
    { id: 's-invest-fund', portfolioId: 'p-invest', holdingId: 'h-global-fund', ownerId: SELF_ID, quantity: 1000 },
    { id: 's-invest-gold', portfolioId: 'p-invest', holdingId: 'h-gold', ownerId: SELF_ID, quantity: 25 },
  ],
  ledger: [
    { ...tx('tx-1', '2026-08-01T08:00:00.000Z', 'income', 'دخل شهري', 35000), targetHoldingId: 'h-alrajhi-sar' },
    { ...tx('tx-2', '2026-08-05T13:10:00.000Z', 'expense', 'مصروف منزلي', 3200), sourceHoldingId: 'h-alrajhi-sar' },
    { ...tx('tx-3', '2026-08-07T09:20:00.000Z', 'allocation_settlement', 'تسوية تغطية للطوارئ', 10000), note: 'تغير الخريطة الاقتصادية فقط، بلا حركة مصرفية.' },
  ],
  incomeStreams: [{ id: 'i-salary', name: 'الراتب الشهري', amountSar: 35000, dueDay: 27, targetHoldingId: 'h-alrajhi-sar', ownerId: SELF_ID, status: 'expected' }],
  liabilities: [{ id: 'l-card', name: 'بطاقة ائتمان تجريبية', ownerId: SELF_ID, accountId: 'acc-alrajhi', amountSar: 4200, kind: 'credit_card', status: 'open' }],
  claims: [],
}
