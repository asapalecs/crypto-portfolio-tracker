import { createRouter, createWebHistory } from 'vue-router'
import store from '../store'

import HomeView from '../views/HomeView.vue'
import CoinsView from '../views/CoinsView.vue'
import CoinDetailsView from '../views/CoinDetailsView.vue'
import AssetFormView from '../views/AssetFormView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'

import OverviewTab from '../views/coin-details/OverviewTab.vue'
import HistoryTab from '../views/coin-details/HistoryTab.vue'
import SettingsTab from '../views/coin-details/SettingsTab.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { public: true } },

  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/coins', name: 'coins', component: CoinsView, meta: { requiresAuth: true } },

  {
    path: '/coins/:id',
    component: CoinDetailsView,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'coin-overview' } },
      { path: 'overview', name: 'coin-overview', component: OverviewTab },
      { path: 'history', name: 'coin-history', component: HistoryTab },
      { path: 'settings', name: 'coin-settings', component: SettingsTab }
    ]
  },

  { path: '/asset/new', name: 'asset-new', component: AssetFormView, meta: { requiresAuth: true } },
  { path: '/asset/:id/edit', name: 'asset-edit', component: AssetFormView, meta: { requiresAuth: true } },

  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to) => {
  const isPublic = !!to.meta.public
  const authed = store.getters['user/isAuthed']

  if (!isPublic && !authed) return { name: 'login' }
  if (isPublic && authed) return { name: 'home' }
  return true
})

export default router
