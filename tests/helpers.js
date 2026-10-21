import { createStore } from 'vuex'
import portfolio from '../src/store/modules/portfolio'
import user from '../src/store/modules/user'

// store nou pentru fiecare test, fara stare comuna
export function makeStore() {
  return createStore({ modules: { portfolio, user } })
}

export function flush() {
  return new Promise(r => setTimeout(r, 0))
}
