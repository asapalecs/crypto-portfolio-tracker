import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/services/http', () => ({ http: { get: vi.fn() } }))

import { http } from '../src/services/http'
import { fetchSimplePriceEur, fetchMarketChartEur, searchCoins } from '../src/services/coingecko'
import { fetchFxRatesFromEur } from '../src/services/fx'
import { fetchCryptoNews } from '../src/services/news'

beforeEach(() => {
  http.get.mockReset()
})

describe('fetchSimplePriceEur', () => {
  it('nu face cererea cand nu exista ID-uri', async () => {
    expect(await fetchSimplePriceEur([])).toEqual({})
    expect(await fetchSimplePriceEur([null, '', undefined])).toEqual({})
    expect(http.get).not.toHaveBeenCalled()
  })

  it('elimina duplicatele, sorteaza ID-urile si pastreaza doar campurile necesare', async () => {
    http.get.mockResolvedValue({
      data: { bitcoin: { eur: 50000, eur_24h_change: 1.5, last_updated_at: 1, extra: 'x' } }
    })

    const r = await fetchSimplePriceEur(['bitcoin', 'ethereum', 'bitcoin'])

    expect(http.get.mock.calls[0][1].params.ids).toBe('bitcoin,ethereum')
    expect(r).toEqual({ bitcoin: { eur: 50000, eur_24h_change: 1.5, last_updated_at: 1 } })
  })

  it('foloseste cache-ul 20s, apoi cere din nou', async () => {
    vi.useFakeTimers()
    http.get.mockResolvedValue({ data: { bitcoin: { eur: 1 } } })

    await fetchSimplePriceEur(['bitcoin'])
    await fetchSimplePriceEur(['bitcoin'])
    expect(http.get).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(20_001)
    await fetchSimplePriceEur(['bitcoin'])
    expect(http.get).toHaveBeenCalledTimes(2)
  })

  it('rezista la un cache corupt in localStorage', async () => {
    localStorage.setItem('crypto_cache_prices_eur_v1', 'null')
    http.get.mockResolvedValue({ data: { bitcoin: { eur: 1 } } })
    await expect(fetchSimplePriceEur(['bitcoin'])).resolves.toEqual({
      bitcoin: { eur: 1, eur_24h_change: undefined, last_updated_at: undefined }
    })

    localStorage.setItem('crypto_cache_prices_eur_v1', JSON.stringify({ bitcoin: 'garbage' }))
    await expect(fetchSimplePriceEur(['bitcoin'])).resolves.toHaveProperty('bitcoin')
  })

  it('trateaza un raspuns gol de la API', async () => {
    http.get.mockResolvedValue({ data: null })
    expect(await fetchSimplePriceEur(['bitcoin'])).toEqual({})
  })

  it('transmite erorile de retea', async () => {
    http.get.mockRejectedValue(new Error('Network Error'))
    await expect(fetchSimplePriceEur(['bitcoin'])).rejects.toThrow('Network Error')
  })
})

describe('fetchMarketChartEur', () => {
  it('transforma punctele in numere si le pune in cache', async () => {
    http.get.mockResolvedValue({ data: { prices: [['1', '2.5'], [3, 4]] } })

    expect(await fetchMarketChartEur('bitcoin', '7')).toEqual([[1, 2.5], [3, 4]])
    expect(await fetchMarketChartEur('bitcoin', 7)).toEqual([[1, 2.5], [3, 4]])
    expect(http.get).toHaveBeenCalledTimes(1)
  })

  it('codifica ID-ul monedei in URL', async () => {
    http.get.mockResolvedValue({ data: {} })
    await fetchMarketChartEur('a/b', 1)
    expect(http.get.mock.calls[0][0]).toContain('/coins/a%2Fb/market_chart')
  })

  it('returneaza [] cand lipsesc preturile', async () => {
    http.get.mockResolvedValue({ data: {} })
    expect(await fetchMarketChartEur('x', 30)).toEqual([])
  })
})

describe('searchCoins', () => {
  it('returneaza [] pentru o cautare goala, fara apel la API', async () => {
    expect(await searchCoins('   ')).toEqual([])
    expect(await searchCoins(null)).toEqual([])
    expect(http.get).not.toHaveBeenCalled()
  })

  it('limiteaza la 8 rezultate si scrie simbolurile cu majuscule', async () => {
    const coins = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, name: `C${i}`, symbol: 'abc', thumb: 't' }))
    coins[0].symbol = undefined
    http.get.mockResolvedValue({ data: { coins } })

    const r = await searchCoins(' btc ')
    expect(http.get.mock.calls[0][1].params.query).toBe('btc')
    expect(r).toHaveLength(8)
    expect(r[0].symbol).toBe('')
    expect(r[1]).toEqual({ id: 'c1', name: 'C1', symbol: 'ABC', thumb: 't' })
  })
})

describe('fetchFxRatesFromEur', () => {
  it('returneaza cursurile si le tine in cache 12h', async () => {
    http.get.mockResolvedValue({ data: { rates: { USD: 1.1, RON: 4.97 } } })

    expect(await fetchFxRatesFromEur()).toEqual({ USD: 1.1, RON: 4.97 })
    await fetchFxRatesFromEur()
    expect(http.get).toHaveBeenCalledTimes(1)
  })

  it('foloseste 1 pentru cursurile lipsa', async () => {
    http.get.mockResolvedValue({ data: {} })
    expect(await fetchFxRatesFromEur()).toEqual({ USD: 1, RON: 1 })
  })

  it('cere din nou dupa expirarea cache-ului', async () => {
    localStorage.setItem('crypto_cache_fx_v1', JSON.stringify({ expiresAt: 0, data: { USD: 9, RON: 9 } }))
    http.get.mockResolvedValue({ data: { rates: { USD: 2, RON: 5 } } })
    expect(await fetchFxRatesFromEur()).toEqual({ USD: 2, RON: 5 })
  })
})

describe('fetchCryptoNews', () => {
  it('transforma articolele si le pune in cache', async () => {
    http.get.mockResolvedValue({
      data: { articles: [{ title: 'T', url: 'u', domain: 'd', seendate: '20250101T120000Z', socialimage: 'i' }] }
    })

    const r = await fetchCryptoNews()
    expect(r[0]).toMatchObject({ title: 'T', url: 'u', domain: 'd', publishedAt: '20250101T120000Z', image: 'i' })

    await fetchCryptoNews()
    expect(http.get).toHaveBeenCalledTimes(1)
  })

  it('returneaza [] cand GDELT nu raspunde cu JSON', async () => {
    http.get.mockResolvedValue({ data: 'Please limit requests' })
    expect(await fetchCryptoNews()).toEqual([])
  })
})
