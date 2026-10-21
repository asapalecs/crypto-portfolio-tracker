import { createStore } from 'vuex'
import portfolio from './modules/portfolio'
import user from './modules/user'

export default createStore({
  modules: { portfolio, user }
})
