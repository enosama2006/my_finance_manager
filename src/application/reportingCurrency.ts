import { useEffect, useState } from 'react'
import { reportingCurrencyCode } from '../domain/currencies'

const STORAGE_KEY = 'myfinman-reporting-currency-v1'
const EVENT_NAME = 'myfinman-reporting-currency-change'

export function loadReportingCurrency(storage: Storage = window.localStorage): string {
  try { return reportingCurrencyCode(storage.getItem(STORAGE_KEY)) } catch { return 'SAR' }
}

export function saveReportingCurrency(currency: string, storage: Storage = window.localStorage) {
  const normalized = reportingCurrencyCode(currency)
  storage.setItem(STORAGE_KEY, normalized)
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }))
}

export function useReportingCurrency(): [string, (currency: string) => void] {
  const [currency, setCurrency] = useState(() => loadReportingCurrency())
  useEffect(() => {
    const sync = () => setCurrency(loadReportingCurrency())
    const custom = (event: Event) => setCurrency(reportingCurrencyCode((event as CustomEvent<string>).detail))
    window.addEventListener('storage', sync)
    window.addEventListener(EVENT_NAME, custom)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(EVENT_NAME, custom) }
  }, [])
  return [currency, (next) => { saveReportingCurrency(next); setCurrency(reportingCurrencyCode(next)) }]
}
