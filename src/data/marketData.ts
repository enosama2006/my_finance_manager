import type { AssetTypeId, QuoteStrategy } from '../domain/assetCatalog'

export interface MarketQuoteRequest {
  assetTypeId: AssetTypeId
  symbol: string
  quoteStrategy: QuoteStrategy
}

export interface MarketQuote {
  unitPriceSar: number
  source: string
  asOf: string
  isLive: boolean
  note?: string
}

const SAR_PER_USD_REFERENCE = 3.75

async function tryConfiguredProxy(request: MarketQuoteRequest): Promise<MarketQuote | null> {
  try {
    const params = new URLSearchParams({
      assetType: request.assetTypeId,
      symbol: request.symbol.toUpperCase(),
      reportingCurrency: 'SAR',
    })
    const response = await fetch(`/api/market/quote?${params.toString()}`, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const data = await response.json() as { unitPriceSar?: number; source?: string; asOf?: string; note?: string }
    if (!Number.isFinite(data.unitPriceSar) || (data.unitPriceSar ?? 0) <= 0) return null
    return {
      unitPriceSar: data.unitPriceSar!,
      source: data.source || 'Configured market provider',
      asOf: data.asOf || new Date().toISOString(),
      isLive: true,
      note: data.note,
    }
  } catch {
    return null
  }
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
    return {
      unitPriceSar: usdPrice * SAR_PER_USD_REFERENCE,
      source: 'Binance public market data',
      asOf: new Date().toISOString(),
      isLive: true,
      note: 'تم تحويل سعر USDT إلى الريال باستخدام مرجع 3.75 ر.س لكل دولار لأغراض العرض.',
    }
  } catch {
    return null
  }
}

export async function fetchMarketQuote(request: MarketQuoteRequest): Promise<MarketQuote | null> {
  if (!request.symbol.trim() || request.quoteStrategy === 'none' || request.quoteStrategy === 'manual_appraisal' || request.quoteStrategy === 'contractual') return null

  const configured = await tryConfiguredProxy(request)
  if (configured) return configured

  if (request.quoteStrategy === 'crypto') return quoteCryptoFromBinance(request.symbol)
  return null
}
