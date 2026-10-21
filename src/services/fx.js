import { http } from './http'
import { loadJson, saveJson } from '../utils/storage'

const FX_URL = 'https://api.frankfurter.dev/v1/latest'
const LS_FX = 'crypto_cache_fx_v1'

export async function fetchFxRatesFromEur() {
  const cached = loadJson(LS_FX, null)
  if (cached?.expiresAt > Date.now()) return cached.data

  const { data } = await http.get(FX_URL, { params: { from: 'EUR', to: 'USD,RON' } })

  const rates = {
    USD: Number(data?.rates?.USD || 1),
    RON: Number(data?.rates?.RON || 1)
  }

  saveJson(LS_FX, { expiresAt: Date.now() + 12 * 60 * 60_000, data: rates })
  return rates
}
