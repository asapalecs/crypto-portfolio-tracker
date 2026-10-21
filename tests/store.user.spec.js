import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/services/fx', () => ({ fetchFxRatesFromEur: vi.fn() }))

import { fetchFxRatesFromEur } from '../src/services/fx'
import { makeStore, flush } from './helpers'

const LS_PREFS = 'crypto_user_prefs_v1'
const LS_USERS = 'crypto_auth_users_v1'
const LS_SESSION = 'crypto_auth_session_v1'

let store
beforeEach(() => {
  fetchFxRatesFromEur.mockReset().mockResolvedValue({ USD: 1.1, RON: 5 })
  store = makeStore()
})
afterEach(() => {
  store.dispatch('user/stopFxPolling')
})

describe('inregistrare', () => {
  it('creeaza utilizatorul, il autentifica si salveaza datele', () => {
    store.dispatch('user/register', { email: '  Ana@Mail.com ', password: 'pass' })

    expect(store.getters['user/isAuthed']).toBe(true)
    expect(store.state.user.session.email).toBe('ana@mail.com')
    const users = JSON.parse(localStorage.getItem(LS_USERS))
    expect(users).toHaveLength(1)
    expect(users[0].passwordHash).not.toContain('pass::')
    expect(JSON.parse(localStorage.getItem(LS_SESSION)).userId).toBe(users[0].id)
  })

  it.each([
    [{ email: '', password: 'x' }],
    [{ email: 'a@b.c', password: '' }],
    [{}],
    [undefined]
  ])('respinge campurile lipsa %j', (payload) => {
    expect(() => store.dispatch('user/register', payload)).toThrow('Email si parola sunt obligatorii.')
    expect(store.getters['user/isAuthed']).toBe(false)
  })

  it('respinge emailurile duplicate, fara diferenta de majuscule', () => {
    store.dispatch('user/register', { email: 'a@b.c', password: 'x' })
    expect(() => store.dispatch('user/register', { email: 'A@B.C', password: 'y' })).toThrow('Email deja inregistrat.')
  })

  it('accepta parole cu caractere unicode', () => {
    expect(() => store.dispatch('user/register', { email: 'a@b.c', password: 'parola🔐' })).not.toThrow()
    store.dispatch('user/logout')
    expect(() => store.dispatch('user/login', { email: 'a@b.c', password: 'parola🔐' })).not.toThrow()
  })

  it('functioneaza fara crypto.randomUUID (http pe IP din retea)', () => {
    vi.stubGlobal('crypto', {})
    try {
      store.dispatch('user/register', { email: 'a@b.c', password: 'x' })
      expect(store.state.user.users[0].id).toBeTruthy()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('da fiecarui utilizator un ID unic', () => {
    store.dispatch('user/register', { email: 'a@b.c', password: 'x' })
    store.dispatch('user/register', { email: 'd@e.f', password: 'x' })
    const [u1, u2] = store.state.user.users
    expect(u1.id).not.toBe(u2.id)
  })
})

describe('autentificare / deconectare', () => {
  beforeEach(() => {
    store.dispatch('user/register', { email: 'a@b.c', password: 'secret' })
    store.dispatch('user/logout')
  })

  it('autentifica cu datele corecte, ignorand majusculele si spatiile din email', () => {
    store.dispatch('user/login', { email: ' A@B.C ', password: 'secret' })
    expect(store.getters['user/isAuthed']).toBe(true)
  })

  it('respinge o parola gresita', () => {
    expect(() => store.dispatch('user/login', { email: 'a@b.c', password: 'nope' })).toThrow('Credentiale invalide.')
    expect(store.getters['user/isAuthed']).toBe(false)
  })

  it('respinge un email necunoscut cu acelasi mesaj', () => {
    expect(() => store.dispatch('user/login', { email: 'x@y.z', password: 'secret' })).toThrow('Credentiale invalide.')
  })

  it('parola tine cont de majuscule', () => {
    expect(() => store.dispatch('user/login', { email: 'a@b.c', password: 'SECRET' })).toThrow()
  })

  it('deconectarea sterge sesiunea salvata', () => {
    store.dispatch('user/login', { email: 'a@b.c', password: 'secret' })
    store.dispatch('user/logout')
    expect(store.getters['user/isAuthed']).toBe(false)
    expect(JSON.parse(localStorage.getItem(LS_SESSION))).toBeNull()
  })

  it('un store reincarcat restaureaza sesiunea', () => {
    store.dispatch('user/login', { email: 'a@b.c', password: 'secret' })
    const fresh = makeStore()
    fresh.dispatch('user/init')
    expect(fresh.getters['user/isAuthed']).toBe(true)
    fresh.dispatch('user/stopFxPolling')
  })
})

describe('initializare cu date salvate', () => {
  it('restaureaza moneda salvata', () => {
    localStorage.setItem(LS_PREFS, JSON.stringify({ fiat: 'RON' }))
    store.dispatch('user/init')
    expect(store.getters['user/fiat']).toBe('RON')
  })

  it.each([
    [LS_PREFS, '{broken'],
    [LS_PREFS, 'null'],
    [LS_PREFS, JSON.stringify({ fiat: 'not-a-currency' })],
    [LS_USERS, '{}'],
    [LS_USERS, '"x"'],
    [LS_USERS, JSON.stringify([null, 1, { email: 'ok@x.y', passwordHash: 'h', id: '1' }])],
    [LS_SESSION, '"x"'],
    [LS_SESSION, '{}']
  ])('nu crapa cu datele corupte %s = %s', (key, raw) => {
    localStorage.setItem(key, raw)
    expect(() => store.dispatch('user/init')).not.toThrow()
    expect(['EUR', 'USD', 'RON']).toContain(store.getters['user/fiat'])
    expect(Array.isArray(store.state.user.users)).toBe(true)
    expect(() => store.dispatch('user/register', { email: 'n@x.y', password: 'p' })).not.toThrow()
  })

  it('o sesiune invalida nu inseamna utilizator logat', () => {
    localStorage.setItem(LS_SESSION, '"x"')
    store.dispatch('user/init')
    expect(store.getters['user/isAuthed']).toBe(false)
  })
})

describe('moneda si curs valutar', () => {
  it('setFiat salveaza monedele valide si le ignora pe cele invalide', () => {
    store.dispatch('user/setFiat', 'USD')
    expect(store.getters['user/fiat']).toBe('USD')
    expect(JSON.parse(localStorage.getItem(LS_PREFS))).toEqual({ fiat: 'USD' })

    store.dispatch('user/setFiat', 'BTC!')
    expect(store.getters['user/fiat']).toBe('USD')
  })

  it('fxRateForFiat: EUR e mereu 1, monedele necunoscute primesc 1', async () => {
    await store.dispatch('user/refreshFx')
    expect(store.getters['user/fxRateForFiat']('EUR')).toBe(1)
    expect(store.getters['user/fxRateForFiat']('USD')).toBe(1.1)
    expect(store.getters['user/fxRateForFiat']('RON')).toBe(5)
    expect(store.getters['user/fxRateForFiat']('GBP')).toBe(1)
  })

  it('pastreaza cursurile anterioare cand API-ul FX pica', async () => {
    await store.dispatch('user/refreshFx')
    fetchFxRatesFromEur.mockRejectedValue(new Error('down'))
    await expect(store.dispatch('user/refreshFx')).resolves.toBeUndefined()
    expect(store.state.user.fxRates).toEqual({ USD: 1.1, RON: 5 })
  })

  it('init cere cursul valutar si porneste actualizarea o singura data', async () => {
    const spy = vi.spyOn(window, 'setInterval')
    store.dispatch('user/init')
    store.dispatch('user/startFxPolling')
    await flush()
    expect(fetchFxRatesFromEur).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
