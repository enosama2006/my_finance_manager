import type { FinanceState } from '../domain/types'

export const SELF_ID = 'party-self'

export const seedState: FinanceState = {
  parties: [
    { id: SELF_ID, name: 'أنا', type: 'self' },
    { id: 'party-owner-2', name: 'مالك 2', type: 'person' },
    { id: 'party-ahmad', name: 'أحمد', type: 'person' },
    { id: 'party-alinma', name: 'مصرف الإنماء', type: 'bank' },
    { id: 'party-alrajhi', name: 'مصرف الراجحي', type: 'bank' },
    { id: 'party-broker', name: 'منصة الاستثمار', type: 'broker' }
  ],
  holdings: [
    {
      id: 'h-alinma-sar', symbol: 'SAR', name: 'سيولة الإنماء', kind: 'currency', nativeUnit: 'ر.س',
      quantity: 1000000, marketPriceSar: 1, averageCostSar: 1, container: 'حساب الإنماء',
      custodianId: 'party-alinma', location: 'مصرف الإنماء', ownership: [{ ownerId: SELF_ID, quantity: 1000000 }]
    },
    {
      id: 'h-alrajhi-sar', symbol: 'SAR', name: 'سيولة الراجحي', kind: 'currency', nativeUnit: 'ر.س',
      quantity: 80000, marketPriceSar: 1, averageCostSar: 1, container: 'حساب الراجحي',
      custodianId: 'party-alrajhi', location: 'مصرف الراجحي', ownership: [{ ownerId: SELF_ID, quantity: 80000 }]
    },
    {
      id: 'h-usd', symbol: 'USD', name: 'دولار أمريكي', kind: 'currency', nativeUnit: 'USD',
      quantity: 12000, marketPriceSar: 3.75, averageCostSar: 3.74, container: 'محفظة العملات',
      custodianId: SELF_ID, location: 'الخزنة', ownership: [{ ownerId: SELF_ID, quantity: 12000 }]
    },
    {
      id: 'h-silver-ahmad', symbol: 'XAG', name: 'فضة محفوظة لدى أحمد', kind: 'metal', nativeUnit: 'غرام',
      quantity: 500, marketPriceSar: 8.1, averageCostSar: 7.55, container: 'معادن شخصية',
      custodianId: 'party-ahmad', location: 'لدى أحمد', ownership: [{ ownerId: SELF_ID, quantity: 500 }]
    },
    {
      id: 'h-gold', symbol: 'XAU', name: 'ذهب', kind: 'metal', nativeUnit: 'غرام',
      quantity: 25, marketPriceSar: 545, averageCostSar: 530, container: 'معادن شخصية',
      custodianId: SELF_ID, location: 'الخزنة', ownership: [{ ownerId: SELF_ID, quantity: 25 }]
    },
    {
      id: 'h-shared-silver', symbol: 'XAG', name: 'فضة مشتركة', kind: 'metal', nativeUnit: 'غرام',
      quantity: 1000, marketPriceSar: 8.1, averageCostSar: 7.7, container: 'حيازة مشتركة',
      custodianId: 'party-broker', location: 'مستودع الحفظ', ownership: [
        { ownerId: SELF_ID, quantity: 700 },
        { ownerId: 'party-owner-2', quantity: 300 }
      ]
    },
    {
      id: 'h-global-fund', symbol: 'GLB', name: 'صندوق أسهم عالمي', kind: 'fund', nativeUnit: 'وحدة',
      quantity: 1000, marketPriceSar: 103, averageCostSar: 100, container: 'محفظة الاستثمار',
      custodianId: 'party-broker', location: 'منصة الاستثمار', ownership: [{ ownerId: SELF_ID, quantity: 1000 }]
    }
  ],
  allocations: [
    { id: 'a-emergency', name: 'الطوارئ', amountSar: 120000, fundedSar: 100000, ownerId: SELF_ID, sourceHoldingIds: ['h-alinma-sar'], group: 'emergency' },
    { id: 'a-monthly', name: 'المصاريف الشهرية', amountSar: 240000, fundedSar: 200000, ownerId: SELF_ID, sourceHoldingIds: ['h-alinma-sar', 'h-alrajhi-sar'], group: 'monthly' },
    { id: 'a-invest', name: 'الاستثمار طويل الأجل', amountSar: 350000, fundedSar: 250000, ownerId: SELF_ID, sourceHoldingIds: ['h-global-fund', 'h-gold'], group: 'investment' },
    { id: 'a-saving', name: 'ادخار مرن', amountSar: 180000, fundedSar: 120000, ownerId: SELF_ID, sourceHoldingIds: ['h-alinma-sar'], group: 'saving' }
  ],
  ledger: [
    { id: 'tx-1', at: '2026-08-01T08:00:00.000Z', kind: 'income', title: 'دخل شهري', amountSar: 35000, ownerId: SELF_ID, targetHoldingId: 'h-alrajhi-sar' },
    { id: 'tx-2', at: '2026-08-05T13:10:00.000Z', kind: 'expense', title: 'مصروف منزلي', amountSar: 3200, ownerId: SELF_ID, sourceHoldingId: 'h-alrajhi-sar' },
    { id: 'tx-3', at: '2026-08-07T09:20:00.000Z', kind: 'reallocation', title: 'إعادة تخصيص للطوارئ', amountSar: 10000, ownerId: SELF_ID, note: 'لا توجد حركة نقدية حقيقية ولا ربح/خسارة.' }
  ],
  incomeStreams: [
    { id: 'i-salary', name: 'الدخل الشهري', amountSar: 35000, dueDay: 27, targetHoldingId: 'h-alrajhi-sar', status: 'expected' }
  ]
}
