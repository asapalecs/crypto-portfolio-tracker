import { http } from './http'
import { loadJson, saveJson } from '../utils/storage'

const CG_BASE = 'https://api.coingecko.com/api/v3'
const LS_PRICES = 'crypto_cache_prices_eur_v1'
const LS_CHART = 'crypto_cache_market_chart_v1'

function loadCacheObject(lsKey) {
  const raw = loadJson(lsKey, {})
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
}

function getCache(lsKey, key) {
  const entry = loadCacheObject(lsKey)[key]
  if (!entry || typeof entry !== 'object') return null
  if (entry.expiresAt <= Date.now()) return null
  return entry.data
}

function setCache(lsKey, key, data, ttlMs) {
  const raw = loadCacheObject(lsKey)
  raw[key] = { expiresAt: Date.now() + ttlMs, data }
  saveJson(lsKey, raw)
}

export async function fetchSimplePriceEur(ids) {
  const coinIds = Array.from(new Set(ids)).filter(Boolean)
  if (!coinIds.length) return {}

  const key = coinIds.sort().join(',')
  const cached = getCache(LS_PRICES, key)
  if (cached) return cached

  const { data } = await http.get(`${CG_BASE}/simple/price`, {
    params: {
      ids: key,
      vs_currencies: 'eur',
      include_24hr_change: true,
      include_last_updated_at: true
    }
  })

  const normalized = Object.fromEntries(
    Object.entries(data || {}).map(([id, obj]) => [
      id,
      {
        eur: obj.eur,
        eur_24h_change: obj.eur_24h_change,
        last_updated_at: obj.last_updated_at
      }
    ])
  )

  setCache(LS_PRICES, key, normalized, 20_000)
  return normalized
}

export async function fetchMarketChartEur(coinId, days) {
  const d = Number(days)
  const key = `${coinId}__${d}`
  const cached = getCache(LS_CHART, key)
  if (cached) return cached

  const { data } = await http.get(`${CG_BASE}/coins/${encodeURIComponent(coinId)}/market_chart`, {
    params: { vs_currency: 'eur', days: d }
  })

  const points = (data?.prices || []).map(([ts, price]) => [Number(ts), Number(price)])
  setCache(LS_CHART, key, points, 10 * 60_000)
  return points
}

export async function searchCoins(query) {
  const q = String(query || '').trim()
  if (!q) return []
  const { data } = await http.get(`${CG_BASE}/search`, { params: { query: q } })
  return (data?.coins || []).slice(0, 8).map(c => ({
    id: c.id,
    name: c.name,
    symbol: (c.symbol || '').toUpperCase(),
    thumb: c.thumb
  }))
}
