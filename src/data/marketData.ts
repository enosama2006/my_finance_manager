import type { AssetTypeId, QuoteStrategy } from '../domain/assetCatalog'

export interface MarketQuoteRequest { assetTypeId: AssetTypeId; symbol: string; quoteStrategy: QuoteStrategy }
export interface MarketQuote { unitPriceSar: number; source: string; asOf: string; isLive: boolean; note?: string }

const SAR_PER_USD_REFERENCE = 3.75
const GRAMS_PER_TROY_OUNCE = 31.1034768
const QUOTE_CACHE_MS = 15_000
const quoteCache = new Map<string, { at: number; promise: Promise<MarketQuote | null> }>()

function envValue(name: string): string | undefined {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return env?.[name]
}

async function tryConfiguredProxy(request: MarketQuoteRequest): Promise<MarketQuote | null> {
  const configuredUrl = envValue('VITE_MARKET_QUOTE_PROXY_URL')
  const enabled = envValue('VITE_MARKET_QUOTE_PROXY_ENABLED') === 'true' || Boolean(configuredUrl)
  if (!enabled) return null
  try {
    const params = new URLSearchParams({ assetType: request.assetTypeId, symbol: request.symbol.toUpperCase(), reportingCurrency: 'SAR' })
    const base = configuredUrl || '/api/market/quote'
    const separator = base.includes('?') ? '&' : '?'
    const response = await fetch(`${base}${separator}${params.toString()}`, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const data = await response.json() as { unitPriceSar?: number; source?: string; asOf?: string; note?: string }
    if (!Number.isFinite(data.unitPriceSar) || (data.unitPriceSar ?? 0) <= 0) return null
    return { unitPriceSar: data.unitPriceSar!, source: data.source || 'Configured market provider', asOf: data.asOf || new Date().toISOString(), isLive: true, note: data.note }
  } catch { return null }
}

async function quoteMetalFromGoldApi(symbol: string): Promise<MarketQuote | null> {
  const normalized = symbol.trim().toUpperCase()
  if (normalized !== 'XAU' && normalized !== 'XAG') return null
  try {
    const response = await fetch(`https://api.gold-api.com/price/${normalized}`, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const data = await response.json() as { price?: number; updatedAt?: string }
    const usdPerTroyOunce = Number(data.price)
    if (!Number.isFinite(usdPerTroyOunce) || usdPerTroyOunce <= 0) return null
    return {
      unitPriceSar: usdPerTroyOunce / GRAMS_PER_TROY_OUNCE * SAR_PER_USD_REFERENCE,
      source: 'Gold API spot market data', asOf: data.updatedAt || new Date().toISOString(), isLive: true,
      note: `السعر الفوري المصدر بالدولار/الأونصة الترويسية حُوّل إلى ريال/غرام باستخدام ${GRAMS_PER_TROY_OUNCE} غرام/أونصة ومرجع 3.75 ر.س/دولار.`,
    }
  } catch { return null }
}

async function quoteCryptoFromBinance(symbol: string): Promise<MarketQuote | null> {
  const normalized = symbol.trim().toUpperCase()
  if (!normalized || normalized === 'USDT' || normalized === 'USD') return null
  try {
    const response = await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${encodeURIComponent(`${normalized}USDT`)}`)
    if (!response.ok) return null
    const data = await response.json() as { price?: string }
    const usdPrice = Number(data.price)
    if (!Number.isFinite(usdPrice) || usdPrice <= 0) return null
    return { unitPriceSar: usdPrice * SAR_PER_USD_REFERENCE, source: 'Binance public market data', asOf: new Date().toISOString(), isLive: true, note: 'تم تحويل سعر USDT إلى الريال باستخدام مرجع 3.75 ر.س لكل دولار لأغراض العرض.' }
  } catch { return null }
}

async function fetchQuoteUncached(request: MarketQuoteRequest): Promise<MarketQuote | null> {
  if (!request.symbol.trim() || request.quoteStrategy === 'none' || request.quoteStrategy === 'manual_appraisal' || request.quoteStrategy === 'contractual') return null
  const configured = await tryConfiguredProxy(request)
  if (configured) return configured
  if (request.quoteStrategy === 'metal') return quoteMetalFromGoldApi(request.symbol)
  if (request.quoteStrategy === 'crypto') return quoteCryptoFromBinance(request.symbol)
  return null
}

export async function fetchMarketQuote(request: MarketQuoteRequest): Promise<MarketQuote | null> {
  const key = `${request.assetTypeId}:${request.symbol.trim().toUpperCase()}:${request.quoteStrategy}`
  const cached = quoteCache.get(key)
  if (cached && Date.now() - cached.at < QUOTE_CACHE_MS) return cached.promise
  const promise = fetchQuoteUncached(request)
  quoteCache.set(key, { at: Date.now(), promise })
  return promise
}
