import type { Holding } from './types'

export interface CurrencyDefinition {
  code: string
  label: string
  symbol: string
  /** SAR value of one native currency unit when a deterministic reference is available. */
  referenceSar?: number
  referenceNote?: string
}

export const currencyCatalog: CurrencyDefinition[] = [
  { code: 'SAR', label: 'الريال السعودي', symbol: 'ر.س', referenceSar: 1, referenceNote: 'عملة التقييم الداخلية الحالية.' },
  { code: 'USD', label: 'الدولار الأمريكي', symbol: '$', referenceSar: 3.75, referenceNote: 'مرجع الربط: 1 USD = 3.75 SAR.' },
  { code: 'AED', label: 'الدرهم الإماراتي', symbol: 'د.إ', referenceSar: 3.75 / 3.6725, referenceNote: 'مرجع مشتق من ربط USD/AED.' },
  { code: 'QAR', label: 'الريال القطري', symbol: 'ر.ق', referenceSar: 3.75 / 3.64, referenceNote: 'مرجع مشتق من ربط USD/QAR.' },
  { code: 'BHD', label: 'الدينار البحريني', symbol: 'د.ب', referenceSar: 3.75 / 0.376, referenceNote: 'مرجع مشتق من ربط USD/BHD.' },
  { code: 'OMR', label: 'الريال العماني', symbol: 'ر.ع', referenceSar: 3.75 / 0.384497, referenceNote: 'مرجع مشتق من ربط USD/OMR.' },
  { code: 'JOD', label: 'الدينار الأردني', symbol: 'د.أ', referenceSar: 3.75 / 0.709, referenceNote: 'مرجع مشتق من ربط USD/JOD.' },
  { code: 'EUR', label: 'اليورو', symbol: '€' },
  { code: 'GBP', label: 'الجنيه الإسترليني', symbol: '£' },
  { code: 'TRY', label: 'الليرة التركية', symbol: '₺' },
  { code: 'SYP', label: 'الليرة السورية', symbol: 'ل.س' },
]

export const reportingCurrencyCatalog = currencyCatalog.filter(currency => currency.referenceSar != null)

export function normalizeCurrencyCode(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const ascii = [...value.toUpperCase()].filter(ch => ch >= 'A' && ch <= 'Z').join('')
  return ascii || value.trim().toUpperCase()
}

export function currencyByCode(code: string | null | undefined): CurrencyDefinition | undefined {
  const normalized = normalizeCurrencyCode(code)
  return currencyCatalog.find(currency => currency.code === normalized)
}

export function currencyReferenceRateSar(code: string | null | undefined): number | null {
  return currencyByCode(code)?.referenceSar ?? null
}

/**
 * Current unit value in SAR. For cash currencies with a deterministic reference,
 * the currency identity is authoritative over a stale/manual marketPriceSar.
 */
export function holdingUnitValueSar(holding: Holding): number {
  if (holding.kind === 'cash') {
    const reference = currencyReferenceRateSar(holding.symbol)
    if (reference != null) return reference
  }
  return holding.marketPriceSar
}

export function reportingCurrencyCode(value: string | null | undefined): string {
  const normalized = normalizeCurrencyCode(value) ?? 'SAR'
  return reportingCurrencyCatalog.some(currency => currency.code === normalized) ? normalized : 'SAR'
}

export function sarToReporting(valueSar: number, reportingCurrency: string): number {
  const code = reportingCurrencyCode(reportingCurrency)
  const rate = currencyReferenceRateSar(code) ?? 1
  return valueSar / rate
}

export function reportingUnitLabel(code: string): string {
  const currency = currencyByCode(code)
  return currency?.symbol || reportingCurrencyCode(code)
}

export function formatReportingValue(valueSar: number, reportingCurrency: string, locale = 'ar-SA'): string {
  const code = reportingCurrencyCode(reportingCurrency)
  const value = sarToReporting(valueSar, code)
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
  return `${number} ${reportingUnitLabel(code)}`
}
