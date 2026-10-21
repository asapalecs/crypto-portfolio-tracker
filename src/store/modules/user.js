import { loadJson, saveJson } from '../../utils/storage'
import { fetchFxRatesFromEur } from '../../services/fx'

const LS_PREFS = 'crypto_user_prefs_v1'
const LS_USERS = 'crypto_auth_users_v1'
const LS_SESSION = 'crypto_auth_session_v1'
const FIATS = ['EUR', 'USD', 'RON']

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function hashPassword(pw) {
  // doar pentru demo, nu e un hash sigur
  const s = 'crypto_portfolio_salt_v1'
  return btoa(unescape(encodeURIComponent(`${s}::${pw}`)))
}

export default {
  namespaced: true,
  state: () => ({
    fiat: 'EUR',
    fxRates: { USD: 1, RON: 1 },
    fxLastFetchedAt: null,
    session: null,
    users: [],
    fxPollingHandle: null
  }),
  getters: {
    isAuthed: (s) => !!s.session,
    fiat: (s) => s.fiat,
    fxRateForFiat: (s) => (fiat) => {
      if (fiat === 'EUR') return 1
      return s.fxRates[fiat] || 1
    }
  },
  mutations: {
    SET_FIAT(state, fiat) {
      state.fiat = fiat
    },
    SET_FX(state, payload) {
      state.fxRates = payload.rates
      state.fxLastFetchedAt = payload.at
    },
    SET_USERS(state, users) {
      state.users = users
    },
    SET_SESSION(state, session) {
      state.session = session
    },
    SET_FX_POLLING_HANDLE(state, handle) {
      state.fxPollingHandle = handle
    }
  },
  actions: {
    init({ commit, dispatch }) {
      const prefs = loadJson(LS_PREFS, { fiat: 'EUR' })
      commit('SET_FIAT', FIATS.includes(prefs?.fiat) ? prefs.fiat : 'EUR')

      const users = loadJson(LS_USERS, [])
      commit('SET_USERS', Array.isArray(users) ? users.filter(u => u && u.email) : [])

      const session = loadJson(LS_SESSION, null)
      commit('SET_SESSION', session && session.userId ? session : null)

      dispatch('refreshFx')
      dispatch('startFxPolling')
    },

    persistPrefs({ state }) {
      saveJson(LS_PREFS, { fiat: state.fiat })
    },

    async refreshFx({ commit }) {
      try {
        const rates = await fetchFxRatesFromEur()
        commit('SET_FX', { rates, at: Date.now() })
      } catch {
        // pastram cursurile anterioare
      }
    },

    startFxPolling({ state, commit, dispatch }) {
      if (state.fxPollingHandle) return
      const handle = window.setInterval(() => dispatch('refreshFx'), 12 * 60 * 60_000)
      commit('SET_FX_POLLING_HANDLE', handle)
    },

    stopFxPolling({ state, commit }) {
      if (!state.fxPollingHandle) return
      window.clearInterval(state.fxPollingHandle)
      commit('SET_FX_POLLING_HANDLE', null)
    },

    setFiat({ commit, dispatch }, fiat) {
      if (!FIATS.includes(fiat)) return
      commit('SET_FIAT', fiat)
      dispatch('persistPrefs')
    },

    register({ state, commit }, { email, password } = {}) {
      const e = String(email || '').trim().toLowerCase()
      const p = String(password || '')

      if (!e || !p) throw new Error('Email si parola sunt obligatorii.')
      if (state.users.some(u => u.email === e)) throw new Error('Email deja inregistrat.')

      const user = { id: newId(), email: e, passwordHash: hashPassword(p) }
      const next = [...state.users, user]
      commit('SET_USERS', next)
      saveJson(LS_USERS, next)

      const session = { userId: user.id, email: user.email }
      commit('SET_SESSION', session)
      saveJson(LS_SESSION, session)
    },

    login({ state, commit }, { email, password } = {}) {
      const e = String(email || '').trim().toLowerCase()
      const p = String(password || '')
      const user = state.users.find(u => u.email === e)

      if (!user) throw new Error('Credentiale invalide.')
      if (user.passwordHash !== hashPassword(p)) throw new Error('Credentiale invalide.')

      const session = { userId: user.id, email: user.email }
      commit('SET_SESSION', session)
      saveJson(LS_SESSION, session)
    },

    logout({ commit }) {
      commit('SET_SESSION', null)
      saveJson(LS_SESSION, null)
    }
  }
}
