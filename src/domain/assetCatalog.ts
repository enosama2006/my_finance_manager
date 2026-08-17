import type { AssetKind, PerformanceRole, ValuationMethod } from './types'

export type AssetTypeId =
  | 'gold'
  | 'silver'
  | 'stock'
  | 'fund'
  | 'crypto'
  | 'fixed_term'
  | 'land'
  | 'property'
  | 'vehicle'
  | 'collectible'
  | 'receivable'
  | 'other'

export type QuoteStrategy = 'metal' | 'crypto' | 'security' | 'manual_appraisal' | 'contractual' | 'none'

export interface AssetTypeDefinition {
  id: AssetTypeId
  label: string
  groupLabel: string
  kind: AssetKind
  defaultUnit: string
  defaultSymbol?: string
  quoteStrategy: QuoteStrategy
  valuationMethod: ValuationMethod
  defaultPerformanceRole: PerformanceRole
  requiresInstrumentIdentity?: boolean
  helper: string
}

export const assetTypeCatalog: AssetTypeDefinition[] = [
  {
    id: 'gold', label: 'ذهب', groupLabel: 'المعادن', kind: 'metal', defaultUnit: 'غرام', defaultSymbol: 'XAU', quoteStrategy: 'metal',
    valuationMethod: 'market_quote', defaultPerformanceRole: 'investment', helper: 'الكمية بالغرام، والسعر السوقي يُطلب من مزود الأسعار.',
  },
  {
    id: 'silver', label: 'فضة', groupLabel: 'المعادن', kind: 'metal', defaultUnit: 'غرام', defaultSymbol: 'XAG', quoteStrategy: 'metal',
    valuationMethod: 'market_quote', defaultPerformanceRole: 'investment', helper: 'الكمية بالغرام، والسعر السوقي يُطلب من مزود الأسعار.',
  },
  {
    id: 'stock', label: 'سهم', groupLabel: 'الاستثمارات', kind: 'stock', defaultUnit: 'سهم', quoteStrategy: 'security',
    valuationMethod: 'market_quote', defaultPerformanceRole: 'investment', requiresInstrumentIdentity: true, helper: 'اختر سهمًا أو أدخل رمزه/اسمه؛ لا تدخل نوع الأصل يدويًا.',
  },
  {
    id: 'fund', label: 'صندوق استثماري', groupLabel: 'الاستثمارات', kind: 'fund', defaultUnit: 'وحدة', quoteStrategy: 'security',
    valuationMethod: 'market_quote', defaultPerformanceRole: 'investment', requiresInstrumentIdentity: true, helper: 'أدخل اسم الصندوق أو الرمز عند توفره، ثم يتولى مزود الأسعار التقييم.',
  },
  {
    id: 'crypto', label: 'عملة رقمية', groupLabel: 'الاستثمارات', kind: 'crypto', defaultUnit: 'عملة', quoteStrategy: 'crypto',
    valuationMethod: 'market_quote', defaultPerformanceRole: 'investment', requiresInstrumentIdentity: true, helper: 'مثل XRP أو BTC. السعر يُجلب تلقائيًا عندما يدعمه مزود السوق.',
  },
  {
    id: 'fixed_term', label: 'استثمار لأجل / وديعة', groupLabel: 'الاستثمارات', kind: 'fixed_term', defaultUnit: 'عقد', quoteStrategy: 'contractual',
    valuationMethod: 'contractual', defaultPerformanceRole: 'investment', helper: 'القيمة الحالية تعاقدية/مستحقة وليست سعر سوق لحظيًا.',
  },
  {
    id: 'land', label: 'أرض', groupLabel: 'العقارات', kind: 'real_estate', defaultUnit: 'أرض', quoteStrategy: 'manual_appraisal',
    valuationMethod: 'manual_appraisal', defaultPerformanceRole: 'investment', helper: 'الأرض أصل، ومكانها الجغرافي وصف مستقل؛ ليست حسابًا أو حاوية.',
  },
  {
    id: 'property', label: 'عقار / شقة / مبنى', groupLabel: 'العقارات', kind: 'real_estate', defaultUnit: 'عقار', quoteStrategy: 'manual_appraisal',
    valuationMethod: 'manual_appraisal', defaultPerformanceRole: 'investment', helper: 'يُقيّم بالتثمين أو التقييم اليدوي/الخارجي عند توفره.',
  },
  {
    id: 'vehicle', label: 'سيارة / مركبة', groupLabel: 'أصول أخرى', kind: 'vehicle', defaultUnit: 'مركبة', quoteStrategy: 'manual_appraisal',
    valuationMethod: 'manual_appraisal', defaultPerformanceRole: 'investment', helper: 'القيمة الحالية تقديرية/سوقية، والتكلفة التاريخية تبقى مستقلة.',
  },
  {
    id: 'collectible', label: 'مقتنيات', groupLabel: 'أصول أخرى', kind: 'collectible', defaultUnit: 'قطعة', quoteStrategy: 'manual_appraisal',
    valuationMethod: 'manual_appraisal', defaultPerformanceRole: 'investment', helper: 'مقتنيات ذات قيمة يمكن تقييمها دوريًا.',
  },
  {
    id: 'receivable', label: 'مستحق / مطالبة', groupLabel: 'أصول أخرى', kind: 'receivable', defaultUnit: 'مطالبة', quoteStrategy: 'contractual',
    valuationMethod: 'contractual', defaultPerformanceRole: 'investment', helper: 'قيمة حق لك على طرف آخر؛ لا تعامل كمكان حفظ.',
  },
  {
    id: 'other', label: 'أصل آخر', groupLabel: 'أصول أخرى', kind: 'other', defaultUnit: 'وحدة', quoteStrategy: 'none',
    valuationMethod: 'unvalued', defaultPerformanceRole: 'investment', helper: 'استخدمه فقط إن لم ينطبق أحد الأنواع المعرفة مسبقًا.',
  },
]

export function assetTypeById(id: string | undefined): AssetTypeDefinition | undefined {
  return assetTypeCatalog.find(item => item.id === id)
}

export function defaultPerformanceRoleForKind(kind: AssetKind): PerformanceRole {
  return kind === 'cash' ? 'transactional_cash' : 'investment'
}
