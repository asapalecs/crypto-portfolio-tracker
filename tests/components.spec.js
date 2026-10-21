import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../src/services/coingecko', () => ({
  fetchSimplePriceEur: vi.fn(),
  fetchMarketChartEur: vi.fn(),
  searchCoins: vi.fn()
}))
vi.mock('../src/services/news', () => ({ fetchCryptoNews: vi.fn() }))
vi.mock('../src/services/fx', () => ({ fetchFxRatesFromEur: vi.fn() }))
// jsdom nu are canvas; verificam doar datele trimise graficului
vi.mock('vue-chartjs', () => ({ Line: { props: ['data', 'options'], template: '<canvas class="chart-stub" />' } }))

import { fetchSimplePriceEur, fetchMarketChartEur, searchCoins } from '../src/services/coingecko'
import { fetchCryptoNews } from '../src/services/news'
import { fetchFxRatesFromEur } from '../src/services/fx'
import { makeStore, flush } from './helpers'

import App from '../src/App.vue'
import ConfirmModal from '../src/components/ConfirmModal.vue'
import CurrencySelect from '../src/components/CurrencySelect.vue'
import FormComponent from '../src/components/FormComponent.vue'
import ItemComponent from '../src/components/ItemComponent.vue'
import ListComponent from '../src/components/ListComponent.vue'
import NavMenu from '../src/components/NavMenu.vue'
import NewsList from '../src/components/NewList.vue'
import PriceSparkline from '../src/components/PriceSparkline.vue'
import AssetFormView from '../src/views/AssetFormView.vue'
import CoinsView from '../src/views/CoinsView.vue'
import HomeView from '../src/views/HomeView.vue'
import LoginView from '../src/views/LoginView.vue'
import RegisterView from '../src/views/RegisterView.vue'
import OverviewTab from '../src/views/coin-details/OverviewTab.vue'
import HistoryTab from '../src/views/coin-details/HistoryTab.vue'

const btc = { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', qty: 2 }
const eth = { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', qty: 10 }
const doge = { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', qty: 1000 }

const Dummy = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Dummy },
      { path: '/login', name: 'login', component: Dummy },
      { path: '/register', name: 'register', component: Dummy },
      { path: '/coins', name: 'coins', component: Dummy },
      { path: '/coins/:id', component: Dummy },
      { path: '/asset/new', name: 'asset-new', component: Dummy },
      { path: '/asset/:id/edit', name: 'asset-edit', component: Dummy }
    ]
  })
}

let store, router
beforeEach(async () => {
  fetchSimplePriceEur.mockReset().mockResolvedValue({})
  fetchMarketChartEur.mockReset().mockResolvedValue([[Date.UTC(2025, 0, 1), 1], [Date.UTC(2025, 0, 2), 2]])
  searchCoins.mockReset().mockResolvedValue([])
  fetchCryptoNews.mockReset().mockResolvedValue([])
  fetchFxRatesFromEur.mockReset().mockResolvedValue({ USD: 2, RON: 5 })
  store = makeStore()
  router = makeRouter()
  await router.push('/')
})

function mountWith(component, options = {}) {
  return mount(component, {
    ...options,
    global: {
      plugins: [store, router],
      ...options.global
    }
  })
}

describe('ConfirmModal', () => {
  it('nu afiseaza nimic cand e inchis', () => {
    const w = mountWith(ConfirmModal, { props: { open: false } })
    expect(w.find('.modal').exists()).toBe(false)
  })

  it('afiseaza textele si emite confirm / cancel', async () => {
    const w = mountWith(ConfirmModal, {
      props: { open: true, title: 'T', message: 'M', confirmText: 'Da', cancelText: 'Nu' }
    })
    expect(w.text()).toContain('T')
    expect(w.text()).toContain('M')

    const [cancel, ok] = w.findAll('.modal__actions button')
    expect(cancel.text()).toBe('Nu')
    await ok.trigger('click')
    await cancel.trigger('click')
    expect(w.emitted('confirm')).toHaveLength(1)
    expect(w.emitted('cancel')).toHaveLength(1)
  })

  it('click pe fundal anuleaza, click in modal nu', async () => {
    const w = mountWith(ConfirmModal, { props: { open: true } })
    await w.find('.modal').trigger('click')
    expect(w.emitted('cancel')).toBeUndefined()
    await w.find('.modal-backdrop').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)
  })
})

describe('CurrencySelect', () => {
  it('afiseaza valoarea primita si emite valoarea noua', async () => {
    const w = mountWith(CurrencySelect, { props: { fiat: 'USD' } })
    expect(w.find('select').element.value).toBe('USD')
    await w.find('select').setValue('RON')
    expect(w.emitted('change')[0]).toEqual(['RON'])
  })
})

describe('ItemComponent / ListComponent', () => {
  it('converteste pretul si valoarea cu cursul valutar', () => {
    const w = mountWith(ItemComponent, { props: { holding: btc, priceEur: 100, fiat: 'USD', fxRate: 2 } })
    expect(w.find('.item__price').text()).toMatch(/200,00/)
    expect(w.find('.item__value').text()).toMatch(/400,00/)
  })

  it('emite select / edit / delete', async () => {
    const w = mountWith(ItemComponent, { props: { holding: btc, priceEur: 0, fiat: 'EUR', fxRate: 1 } })
    await w.find('.item__main').trigger('click')
    const [edit, del] = w.findAll('.item__actions button')
    await edit.trigger('click')
    await del.trigger('click')
    expect(Object.keys(w.emitted())).toEqual(expect.arrayContaining(['select', 'edit', 'delete']))
  })

  it('afiseaza starea goala', () => {
    const w = mountWith(ListComponent, { props: { items: [], pricesEurById: {}, fiat: 'EUR', fxRate: 1 } })
    expect(w.find('.empty').exists()).toBe(true)
  })

  it('afiseaza 0 pentru monedele fara pret', () => {
    const w = mountWith(ListComponent, {
      props: { items: [btc, eth], pricesEurById: { bitcoin: { eur: 1 } }, fiat: 'EUR', fxRate: 1 }
    })
    expect(w.findAll('.item')).toHaveLength(2)
    expect(w.findAll('.item__price')[1].text()).toMatch(/0,00/)
  })

  it('trimite moneda mai departe la evenimente', async () => {
    const w = mountWith(ListComponent, { props: { items: [btc], pricesEurById: {}, fiat: 'EUR', fxRate: 1 } })
    await w.find('.item__actions .btn--danger').trigger('click')
    expect(w.emitted('delete')[0]).toEqual([btc])
  })
})

describe('FormComponent', () => {
  it('afiseaza toate erorile la trimiterea unui formular gol', async () => {
    const w = mountWith(FormComponent)
    await w.find('form').trigger('submit')
    expect(w.findAll('.field__error')).toHaveLength(3)
    expect(w.emitted('submit')).toBeUndefined()
  })

  it.each([0, -1, '', 'abc'])('respinge cantitatea %j', async (qty) => {
    const w = mountWith(FormComponent)
    await w.setData({ query: 'btc', coinId: 'bitcoin', qty })
    await w.find('form').trigger('submit')
    expect(w.text()).toContain('Cantitatea trebuie sa fie un numar pozitiv.')
    expect(w.emitted('submit')).toBeUndefined()
  })

  it('nu cauta pentru mai putin de 2 caractere', async () => {
    const w = mountWith(FormComponent)
    await w.find('input').setValue('b')
    expect(searchCoins).not.toHaveBeenCalled()
  })

  it('cauta, selecteaza o moneda si trimite datele curate', async () => {
    searchCoins.mockResolvedValue([{ id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' }])
    const w = mountWith(FormComponent)

    await w.find('input').setValue('bit')
    await flush()
    await w.find('.result').trigger('click')
    expect(w.find('.results').exists()).toBe(false)

    await w.findAll('input')[2].setValue('0.5')
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')[0][0]).toEqual({ id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', qty: 0.5 })
  })

  it('goleste rezultatele cand cautarea esueaza', async () => {
    searchCoins.mockRejectedValue(new Error('429'))
    const w = mountWith(FormComponent)
    await w.setData({ results: [{ id: 'x', name: 'X', symbol: 'X' }] })
    await w.find('input').setValue('bitcoin')
    await flush()
    expect(w.findAll('.result')).toHaveLength(0)
  })

  it('deduce numele si simbolul din ID-ul introdus manual', async () => {
    const w = mountWith(FormComponent)
    await w.setData({ query: 'x', coinId: 'solana', qty: 3 })
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')[0][0]).toEqual({ id: 'solana', name: 'solana', symbol: 'SOLANA', qty: 3 })
  })

  it('precompleteaza campurile la editare', () => {
    const w = mountWith(FormComponent, { props: { mode: 'edit', initial: btc } })
    expect(w.text()).toContain('Editeaza moneda')
    expect(w.findAll('input')[1].element.value).toBe('bitcoin')
    expect(w.findAll('input')[2].element.value).toBe('2')
  })

  it('emite cancel', async () => {
    const w = mountWith(FormComponent)
    await w.find('.btn--ghost').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)
  })
})

describe('AssetFormView', () => {
  async function submitForm(w, payload) {
    w.findComponent(FormComponent).vm.$emit('submit', payload)
    await flush()
  }

  it('adauga doar dupa confirmare, apoi merge la portofoliu', async () => {
    await router.push('/asset/new')
    const w = mountWith(AssetFormView)

    await submitForm(w, btc)
    expect(store.state.portfolio.holdings).toEqual([])
    expect(w.find('.modal').text()).toContain('Adaugi Bitcoin (BTC)')

    await w.find('.modal .btn--danger').trigger('click')
    await flush()
    expect(store.state.portfolio.holdings).toEqual([btc])
    expect(router.currentRoute.value.name).toBe('coins')
  })

  it('anularea confirmarii nu schimba nimic', async () => {
    await router.push('/asset/new')
    const w = mountWith(AssetFormView)
    await submitForm(w, btc)
    await w.find('.modal .btn--ghost').trigger('click')
    await flush()
    expect(store.state.portfolio.holdings).toEqual([])
    expect(router.currentRoute.value.name).toBe('asset-new')
  })

  it('editarea actualizeaza cantitatea pe loc', async () => {
    store.commit('portfolio/SET_HOLDINGS', [btc])
    await router.push('/asset/bitcoin/edit')
    const w = mountWith(AssetFormView)
    await submitForm(w, { ...btc, qty: 9 })
    await w.find('.modal .btn--danger').trigger('click')
    expect(store.state.portfolio.holdings).toEqual([{ ...btc, qty: 9 }])
  })

  it('schimbarea monedei la editare o inlocuieste pe cea veche, fara duplicat', async () => {
    store.commit('portfolio/SET_HOLDINGS', [btc, doge])
    await router.push('/asset/bitcoin/edit')
    const w = mountWith(AssetFormView)
    await submitForm(w, eth)
    await w.find('.modal .btn--danger').trigger('click')
    expect(store.state.portfolio.holdings.map(h => h.id).sort()).toEqual(['dogecoin', 'ethereum'])
  })

  it('pagina de editare se afiseaza si pentru o moneda inexistenta', async () => {
    await router.push('/asset/ghost/edit')
    const w = mountWith(AssetFormView)
    expect(w.text()).toContain('Editeaza moneda')
  })
})

describe('CoinsView', () => {
  beforeEach(() => {
    store.commit('portfolio/SET_HOLDINGS', [btc, eth, doge])
    store.commit('portfolio/SET_PRICES', { bitcoin: { eur: 100 }, ethereum: { eur: 10 }, dogecoin: { eur: 0.1 } })
  })

  const names = (w) => w.findAll('.item__title').map(n => n.text())

  it('sorteaza implicit descrescator dupa valoare', () => {
    const w = mountWith(CoinsView)
    expect(names(w)).toEqual(['Bitcoin', 'Ethereum', 'Dogecoin'])
  })

  it('sorteaza dupa cantitate si nume in ambele sensuri', async () => {
    const w = mountWith(CoinsView)
    const [sortKey, sortDir] = w.findAll('select')

    await sortKey.setValue('qty')
    expect(names(w)).toEqual(['Dogecoin', 'Ethereum', 'Bitcoin'])

    await sortKey.setValue('name')
    await sortDir.setValue('asc')
    expect(names(w)).toEqual(['Bitcoin', 'Dogecoin', 'Ethereum'])
  })

  it('filtreaza dupa nume sau simbol, fara diferenta de majuscule', async () => {
    const w = mountWith(CoinsView)
    await w.find('input').setValue('ETH')
    expect(names(w)).toEqual(['Ethereum'])
    await w.find('input').setValue('doge')
    expect(names(w)).toEqual(['Dogecoin'])
    await w.find('input').setValue('zzz')
    expect(w.find('.empty').exists()).toBe(true)
  })

  it('sortarea nu schimba ordinea din store', async () => {
    const w = mountWith(CoinsView)
    await w.findAll('select')[0].setValue('name')
    expect(store.state.portfolio.holdings.map(h => h.id)).toEqual(['bitcoin', 'ethereum', 'dogecoin'])
  })

  it('sterge doar dupa confirmare', async () => {
    const w = mountWith(CoinsView)
    await w.findAll('.item__actions .btn--danger')[0].trigger('click')
    expect(store.state.portfolio.holdings).toHaveLength(3)
    await w.find('.modal .btn--danger').trigger('click')
    expect(store.state.portfolio.holdings.map(h => h.id)).not.toContain('bitcoin')
  })

  it('confirmarea editarii duce la pagina de editare', async () => {
    const w = mountWith(CoinsView)
    await w.findAll('.item__actions .btn--ghost')[0].trigger('click')
    await w.find('.modal .btn--danger').trigger('click')
    await flush()
    expect(router.currentRoute.value.fullPath).toBe('/asset/bitcoin/edit')
  })

  it('click pe o moneda deschide detaliile', async () => {
    const w = mountWith(CoinsView)
    await w.findAll('.item__main')[1].trigger('click')
    await flush()
    expect(router.currentRoute.value.fullPath).toBe('/coins/ethereum')
  })
})

describe('LoginView / RegisterView', () => {
  it('inregistrarea reusita autentifica si duce la pagina principala', async () => {
    await router.push('/register')
    const w = mountWith(RegisterView)
    await w.find('input[type=email]').setValue('a@b.c')
    await w.find('input[type=password]').setValue('1234')
    await w.find('form').trigger('submit')
    await flush()
    expect(store.getters['user/isAuthed']).toBe(true)
    expect(router.currentRoute.value.name).toBe('home')
    store.dispatch('portfolio/stopPricePolling')
  })

  it('inregistrarea cu email existent afiseaza eroarea si ramane pe pagina', async () => {
    store.dispatch('user/register', { email: 'a@b.c', password: 'x' })
    store.dispatch('user/logout')
    await router.push('/register')
    const w = mountWith(RegisterView)
    await w.find('input[type=email]').setValue('a@b.c')
    await w.find('input[type=password]').setValue('1234')
    await w.find('form').trigger('submit')
    expect(w.find('.banner--error').text()).toBe('Email deja inregistrat.')
    expect(router.currentRoute.value.name).toBe('register')
  })

  it('autentificarea gresita afiseaza eroarea si ramane pe pagina', async () => {
    await router.push('/login')
    const w = mountWith(LoginView)
    await w.find('input[type=email]').setValue('x@y.z')
    await w.find('input[type=password]').setValue('nope')
    await w.find('form').trigger('submit')
    expect(w.find('.banner--error').text()).toBe('Credentiale invalide.')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('autentificarea sterge eroarea anterioara si reuseste', async () => {
    store.dispatch('user/register', { email: 'a@b.c', password: 'pw' })
    store.dispatch('user/logout')
    await router.push('/login')
    const w = mountWith(LoginView)
    await w.find('input[type=email]').setValue('a@b.c')
    await w.find('input[type=password]').setValue('bad')
    await w.find('form').trigger('submit')
    await w.find('input[type=password]').setValue('pw')
    await w.find('form').trigger('submit')
    await flush()
    expect(w.find('.banner--error').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('home')
    store.dispatch('portfolio/stopPricePolling')
  })
})

describe('NavMenu', () => {
  it('afiseaza Autentificare/Inregistrare cand nu esti logat', () => {
    const w = mountWith(NavMenu)
    expect(w.text()).toContain('Autentificare')
    expect(w.find('nav').exists()).toBe(false)
  })

  it('schimba moneda si deconecteaza', async () => {
    store.dispatch('user/register', { email: 'a@b.c', password: 'x' })
    store.dispatch('portfolio/startPricePolling')
    const w = mountWith(NavMenu)

    await w.find('select').setValue('RON')
    expect(store.getters['user/fiat']).toBe('RON')

    await w.find('button.btn--ghost').trigger('click')
    await flush()
    expect(store.getters['user/isAuthed']).toBe(false)
    expect(store.state.portfolio.pricePollingHandle).toBeNull()
    expect(router.currentRoute.value.name).toBe('login')
  })
})

describe('NewsList', () => {
  it('afiseaza incarcarea, eroarea si stirile', () => {
    expect(mountWith(NewsList, { props: { items: [] } }).text()).toContain('Se incarca stirile')
    expect(mountWith(NewsList, { props: { items: [], error: 'boom' } }).text()).toContain('boom')

    const w = mountWith(NewsList, {
      props: { items: [{ title: 'T', url: 'https://x', domain: 'x.com', publishedAt: '20250101T120000Z' }, { title: 'U', url: 'https://y' }] }
    })
    const links = w.findAll('a')
    expect(links).toHaveLength(2)
    expect(links[0].attributes('target')).toBe('_blank')
    expect(links[0].attributes('rel')).toContain('noreferrer')
    expect(links[0].text()).toContain('20250101 120000Z')
    expect(links[1].text()).toContain('—')
  })
})

describe('grafice', () => {
  it('PriceSparkline se afiseaza dupa incarcarea datelor', async () => {
    const w = mountWith(PriceSparkline, { props: { coinId: 'bitcoin' } })
    expect(w.text()).toContain('Se incarca graficul')
    await flush()
    expect(w.find('.chart-stub').exists()).toBe(true)
    expect(fetchMarketChartEur).toHaveBeenCalledWith('bitcoin', 7)
  })

  it('PriceSparkline afiseaza eroare, nu incarcare infinita, cand API-ul pica', async () => {
    fetchMarketChartEur.mockRejectedValue(new Error('429'))
    const w = mountWith(PriceSparkline, { props: { coinId: 'bitcoin' } })
    await flush()
    expect(w.text()).toContain('Grafic indisponibil.')
  })

  it('PriceSparkline se reincarca la schimbarea monedei', async () => {
    const w = mountWith(PriceSparkline, { props: { coinId: 'bitcoin' } })
    await flush()
    await w.setProps({ coinId: 'ethereum' })
    await flush()
    expect(fetchMarketChartEur).toHaveBeenLastCalledWith('ethereum', 7)
  })

  it('HistoryTab incarca 30 de zile si trateaza erorile', async () => {
    const ok = mountWith(HistoryTab, { props: { coinId: 'bitcoin' } })
    await flush()
    expect(ok.find('.chart-stub').exists()).toBe(true)
    expect(fetchMarketChartEur).toHaveBeenCalledWith('bitcoin', 30)

    fetchMarketChartEur.mockRejectedValue(new Error('down'))
    const bad = mountWith(HistoryTab, { props: { coinId: 'solana' } })
    await flush()
    expect(bad.text()).toContain('Grafic indisponibil.')
  })
})

describe('OverviewTab', () => {
  it('afiseaza cantitatea, pretul si valoarea in moneda aleasa', async () => {
    store.commit('portfolio/SET_HOLDINGS', [btc])
    store.commit('portfolio/SET_PRICES', { bitcoin: { eur: 100 } })
    store.commit('user/SET_FX', { rates: { USD: 2, RON: 5 }, at: 1 })
    store.commit('user/SET_FIAT', 'RON')

    const w = mountWith(OverviewTab, { props: { coinId: 'bitcoin' } })
    const values = w.findAll('.detail__value').map(v => v.text())
    expect(values[0]).toBe('2')
    expect(values[1]).toMatch(/500,00/)
    expect(values[2]).toMatch(/1\.000,00/)
  })

  it('trateaza o moneda care nu e in portofoliu', () => {
    const w = mountWith(OverviewTab, { props: { coinId: 'unknown' } })
    expect(w.findAll('.detail__value')[0].text()).toBe('0')
  })
})

describe('HomeView', () => {
  it('afiseaza totalul in moneda aleasa si starea goala', async () => {
    const w = mountWith(HomeView)
    expect(w.text()).toContain('Nu ai monede')
    expect(w.find('.kpi__meta').text()).toContain('—')

    store.commit('portfolio/SET_HOLDINGS', [btc])
    store.commit('portfolio/SET_PRICES', { bitcoin: { eur: 100 } })
    store.commit('user/SET_FX', { rates: { USD: 2, RON: 5 }, at: 1 })
    store.commit('user/SET_FIAT', 'USD')
    await flush()
    expect(w.find('.kpi__value').text()).toMatch(/400,00/)
    expect(w.findAll('.mini')).toHaveLength(1)
  })

  it('semnaleaza problemele de API', async () => {
    store.commit('portfolio/SET_PRICE_ERROR', 'down')
    const w = mountWith(HomeView)
    expect(w.find('.pill--warn').exists()).toBe(true)
  })
})

describe('App', () => {
  it('porneste cu localStorage gol', async () => {
    const w = mountWith(App)
    await flush()
    expect(w.find('.topbar').exists()).toBe(true)
    expect(w.find('.footer').text()).toContain(String(new Date().getFullYear()))
    store.dispatch('portfolio/stopPricePolling')
    store.dispatch('portfolio/stopNewsPolling')
    store.dispatch('user/stopFxPolling')
  })

  it('porneste cu localStorage complet corupt', async () => {
    for (const k of ['crypto_holdings_v1', 'crypto_auth_users_v1', 'crypto_auth_session_v1', 'crypto_user_prefs_v1']) {
      localStorage.setItem(k, '{corrupt')
    }
    const w = mountWith(App)
    await flush()
    expect(w.find('.topbar').exists()).toBe(true)
    store.dispatch('portfolio/stopPricePolling')
    store.dispatch('portfolio/stopNewsPolling')
    store.dispatch('user/stopFxPolling')
  })
})
