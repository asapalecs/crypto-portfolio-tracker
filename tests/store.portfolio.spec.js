import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/services/coingecko', () => ({
  fetchSimplePriceEur: vi.fn(),
  fetchMarketChartEur: vi.fn(),
  searchCoins: vi.fn()
}))
vi.mock('../src/services/news', () => ({ fetchCryptoNews: vi.fn() }))

import { fetchSimplePriceEur, fetchMarketChartEur, searchCoins } from '../src/services/coingecko'
import { fetchCryptoNews } from '../src/services/news'
import { makeStore, flush } from './helpers'

const LS_KEY = 'crypto_holdings_v1'
const btc = { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', qty: 2 }
const eth = { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', qty: 10 }

let store
beforeEach(() => {
  fetchSimplePriceEur.mockReset().mockResolvedValue({})
  fetchMarketChartEur.mockReset().mockResolvedValue([])
  searchCoins.mockReset().mockResolvedValue([])
  fetchCryptoNews.mockReset().mockResolvedValue([])
  store = makeStore()
})

describe('getteri', () => {
  beforeEach(() => {
    store.commit('portfolio/SET_HOLDINGS', [btc, eth])
    store.commit('portfolio/SET_PRICES', { bitcoin: { eur: 100 } })
  })

  it('holdingById returneaza moneda sau null', () => {
    expect(store.getters['portfolio/holdingById']('bitcoin')).toEqual(btc)
    expect(store.getters['portfolio/holdingById']('nope')).toBeNull()
  })

  it('holdingValueEur considera 0 preturile si monedele lipsa', () => {
    expect(store.getters['portfolio/holdingValueEur']('bitcoin')).toBe(200)
    expect(store.getters['portfolio/holdingValueEur']('ethereum')).toBe(0)
    expect(store.getters['portfolio/holdingValueEur']('nope')).toBe(0)
  })

  it('totalValueEur aduna doar monedele cu pret', () => {
    expect(store.getters['portfolio/totalValueEur']).toBe(200)
    store.commit('portfolio/SET_PRICES', { ethereum: { eur: 5 } })
    expect(store.getters['portfolio/totalValueEur']).toBe(250)
  })
})

describe('mutatii', () => {
  it('UPSERT_HOLDING inlocuieste pe loc, fara duplicat', () => {
    store.commit('portfolio/UPSERT_HOLDING', btc)
    store.commit('portfolio/UPSERT_HOLDING', { ...btc, qty: 5 })
    expect(store.state.portfolio.holdings).toEqual([{ ...btc, qty: 5 }])
  })

  it('SET_PRICES combina preturile si sterge eroarea', () => {
    store.commit('portfolio/SET_PRICE_ERROR', 'x')
    store.commit('portfolio/SET_PRICES', { a: { eur: 1 } })
    store.commit('portfolio/SET_PRICES', { b: { eur: 2 } })
    expect(Object.keys(store.state.portfolio.pricesEurById)).toEqual(['a', 'b'])
    expect(store.state.portfolio.priceError).toBeNull()
    expect(store.state.portfolio.lastPricesUpdatedAt).toBeTypeOf('number')
  })
})

describe('initializare', () => {
  afterEach(() => {
    store.dispatch('portfolio/stopPricePolling')
    store.dispatch('portfolio/stopNewsPolling')
  })

  it('incarca monedele valide si le ignora pe cele invalide', () => {
    localStorage.setItem(LS_KEY, JSON.stringify([
      btc,
      { id: '', qty: 1 },
      { name: 'no id', qty: 1 },
      { id: 'zero', qty: 0 },
      { id: 'neg', qty: -1 },
      { id: 'nan', qty: 'abc' },
      { id: 'inf', qty: 'Infinity' },
      null,
      'string',
      { id: ' padded ', qty: '1.5' }
    ]))

    store.dispatch('portfolio/init')

    expect(store.state.portfolio.holdings.map(h => h.id)).toEqual(['bitcoin', 'padded'])
    expect(store.state.portfolio.holdings[1].qty).toBe(1.5)
  })

  it.each(['{}', '"text"', 'null', '42', '{broken'])('nu crapa cu datele corupte %s', (raw) => {
    localStorage.setItem(LS_KEY, raw)
    expect(() => store.dispatch('portfolio/init')).not.toThrow()
    expect(store.state.portfolio.holdings).toEqual([])
  })

  it('porneste o singura data actualizarea preturilor si a stirilor', () => {
    const spy = vi.spyOn(window, 'setInterval')
    store.dispatch('portfolio/init')
    store.dispatch('portfolio/startPricePolling')
    store.dispatch('portfolio/startNewsPolling')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

describe('CRUD monede', () => {
  it('addHolding normalizeaza, salveaza si actualizeaza preturile', async () => {
    fetchSimplePriceEur.mockResolvedValue({ bitcoin: { eur: 1 } })
    await store.dispatch('portfolio/addHolding', { id: ' bitcoin ', name: ' Bitcoin ', symbol: 'BTC', qty: '2' })
    await flush()

    expect(store.state.portfolio.holdings).toEqual([btc])
    expect(JSON.parse(localStorage.getItem(LS_KEY))).toEqual([btc])
    expect(fetchSimplePriceEur).toHaveBeenCalledWith(['bitcoin'])
    expect(store.state.portfolio.pricesEurById.bitcoin.eur).toBe(1)
  })

  it('updateHolding suprascrie moneda existenta', async () => {
    await store.dispatch('portfolio/addHolding', btc)
    await store.dispatch('portfolio/updateHolding', { ...btc, qty: 7 })
    expect(store.state.portfolio.holdings).toEqual([{ ...btc, qty: 7 }])
    expect(JSON.parse(localStorage.getItem(LS_KEY))[0].qty).toBe(7)
  })

  it('deleteHolding sterge si salveaza', async () => {
    await store.dispatch('portfolio/addHolding', btc)
    await store.dispatch('portfolio/addHolding', eth)
    await store.dispatch('portfolio/deleteHolding', 'bitcoin')
    expect(store.state.portfolio.holdings).toEqual([eth])
    expect(JSON.parse(localStorage.getItem(LS_KEY))).toEqual([eth])
  })

  it('un store reincarcat vede datele salvate', async () => {
    await store.dispatch('portfolio/addHolding', btc)
    const fresh = makeStore()
    fresh.dispatch('portfolio/init')
    expect(fresh.state.portfolio.holdings).toEqual([btc])
    fresh.dispatch('portfolio/stopPricePolling')
    fresh.dispatch('portfolio/stopNewsPolling')
  })
})

describe('refreshPrices', () => {
  it('nu face nimic cu portofoliul gol', async () => {
    await store.dispatch('portfolio/refreshPrices')
    expect(fetchSimplePriceEur).not.toHaveBeenCalled()
  })

  it('salveaza mesajul de eroare cand API-ul pica, fara exceptie', async () => {
    store.commit('portfolio/SET_HOLDINGS', [btc])
    fetchSimplePriceEur.mockRejectedValue(new Error('429 Too Many Requests'))
    await expect(store.dispatch('portfolio/refreshPrices')).resolves.toBeUndefined()
    expect(store.state.portfolio.priceError).toBe('429 Too Many Requests')
  })

  it('foloseste un mesaj implicit cand eroarea nu are mesaj', async () => {
    store.commit('portfolio/SET_HOLDINGS', [btc])
    fetchSimplePriceEur.mockRejectedValue({})
    await store.dispatch('portfolio/refreshPrices')
    expect(store.state.portfolio.priceError).toBe('Eroare la incarcarea preturilor.')
  })

  it('actualizeaza la 60s si se opreste corect', async () => {
    vi.useFakeTimers()
    store.commit('portfolio/SET_HOLDINGS', [btc])
    store.dispatch('portfolio/startPricePolling')
    vi.advanceTimersByTime(120_000)
    expect(fetchSimplePriceEur).toHaveBeenCalledTimes(2)

    store.dispatch('portfolio/stopPricePolling')
    expect(store.state.portfolio.pricePollingHandle).toBeNull()
    vi.advanceTimersByTime(120_000)
    expect(fetchSimplePriceEur).toHaveBeenCalledTimes(2)
  })
})

describe('stiri', () => {
  it('salveaza stirile', async () => {
    fetchCryptoNews.mockResolvedValue([{ title: 'a', url: 'u' }])
    await store.dispatch('portfolio/refreshNews')
    expect(store.state.portfolio.newsItems).toHaveLength(1)
    expect(store.state.portfolio.newsError).toBeNull()
  })

  it('salveaza mesajul de eroare', async () => {
    fetchCryptoNews.mockRejectedValue(new Error('boom'))
    await store.dispatch('portfolio/refreshNews')
    expect(store.state.portfolio.newsError).toBe('boom')
  })
})

describe('getMarketChart', () => {
  it('tine in cache rezultatele pe moneda si interval', async () => {
    fetchMarketChartEur.mockResolvedValue([[1, 2]])
    expect(await store.dispatch('portfolio/getMarketChart', { coinId: 'bitcoin', days: 7 })).toEqual([[1, 2]])
    await store.dispatch('portfolio/getMarketChart', { coinId: 'bitcoin', days: '7' })
    await store.dispatch('portfolio/getMarketChart', { coinId: 'bitcoin', days: 30 })
    expect(fetchMarketChartEur).toHaveBeenCalledTimes(2)
  })

  it('arunca eroare cand API-ul pica', async () => {
    fetchMarketChartEur.mockRejectedValue(new Error('down'))
    await expect(store.dispatch('portfolio/getMarketChart', { coinId: 'x', days: 7 })).rejects.toThrow('down')
  })
})

describe('cautare', () => {
  it('returneaza [] pentru cautari goale', async () => {
    expect(await store.dispatch('portfolio/search', '  ')).toEqual([])
    expect(searchCoins).not.toHaveBeenCalled()
  })

  it('refoloseste ultimul rezultat pentru aceeasi cautare in 15s', async () => {
    searchCoins.mockResolvedValue([{ id: 'bitcoin' }])
    await store.dispatch('portfolio/search', 'btc')
    expect(await store.dispatch('portfolio/search', ' btc ')).toEqual([{ id: 'bitcoin' }])
    expect(searchCoins).toHaveBeenCalledTimes(1)

    await store.dispatch('portfolio/search', 'eth')
    expect(searchCoins).toHaveBeenCalledTimes(2)
  })
})
