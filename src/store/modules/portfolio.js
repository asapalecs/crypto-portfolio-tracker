import { loadJson, saveJson } from "../../utils/storage";
import {
  fetchSimplePriceEur,
  fetchMarketChartEur,
  searchCoins,
} from "../../services/coingecko";
import { fetchCryptoNews } from "../../services/news";

const LS_KEY = "crypto_holdings_v1";

function normalizeHolding(input) {
  return {
    id: String(input?.id ?? "").trim(),
    name: String(input?.name || "").trim(),
    symbol: String(input?.symbol || "").trim(),
    qty: Number(input?.qty),
  };
}

export default {
  namespaced: true,
  state: () => ({
    holdings: [],
    pricesEurById: {},
    marketChartCache: {},
    lastPricesUpdatedAt: null,
    priceError: null,
    pricePollingHandle: null,
    lastSearch: { q: "", results: [], at: 0 },
    newsItems: [],
    newsLastFetchedAt: null,
    newsError: null,
    newsPollingHandle: null,
  }),
  getters: {
    holdingById: (s) => (id) => s.holdings.find((h) => h.id === id) || null,
    holdingValueEur: (s) => (id) => {
      const h = s.holdings.find((x) => x.id === id);
      if (!h) return 0;
      const p = s.pricesEurById[id]?.eur ?? 0;
      return p * h.qty;
    },
    totalValueEur: (s) => {
      return s.holdings.reduce((sum, h) => {
        const p = s.pricesEurById[h.id]?.eur ?? 0;
        return sum + p * h.qty;
      }, 0);
    },
  },
  mutations: {
    SET_HOLDINGS(state, holdings) {
      state.holdings = holdings;
    },
    UPSERT_HOLDING(state, holding) {
      const idx = state.holdings.findIndex((h) => h.id === holding.id);
      if (idx >= 0) state.holdings.splice(idx, 1, holding);
      else state.holdings.push(holding);
    },
    REMOVE_HOLDING(state, id) {
      state.holdings = state.holdings.filter((h) => h.id !== id);
    },
    SET_PRICES(state, pricesEurById) {
      state.pricesEurById = { ...state.pricesEurById, ...pricesEurById };
      state.lastPricesUpdatedAt = Date.now();
      state.priceError = null;
    },
    SET_PRICE_ERROR(state, msg) {
      state.priceError = msg;
    },
    SET_POLLING_HANDLE(state, handle) {
      state.pricePollingHandle = handle;
    },
    SET_MARKET_CHART_CACHE(state, { key, payload }) {
      state.marketChartCache[key] = payload;
    },
    SET_LAST_SEARCH(state, payload) {
      state.lastSearch = payload;
    },
    SET_NEWS(state, items) {
      state.newsItems = items
      state.newsLastFetchedAt = Date.now()
      state.newsError = null
    },
    SET_NEWS_ERROR(state, msg) {
      state.newsError = msg
    },
    SET_NEWS_POLLING_HANDLE(state, handle) {
      state.newsPollingHandle = handle
    },
    
  },
  actions: {
    async refreshNews({ commit }) {
      try {
        const items = await fetchCryptoNews({ max: 20, timespan: '1day' })
        commit('SET_NEWS', items)
      } catch (e) {
        commit('SET_NEWS_ERROR', e?.message || 'Eroare la incarcarea stirilor.')
      }
    },
    
    startNewsPolling({ state, commit, dispatch }) {
      if (state.newsPollingHandle) return
      dispatch('refreshNews')
      const handle = window.setInterval(() => dispatch('refreshNews'), 5 * 60_000)
      commit('SET_NEWS_POLLING_HANDLE', handle)
    },
    
    stopNewsPolling({ state, commit }) {
      if (!state.newsPollingHandle) return
      window.clearInterval(state.newsPollingHandle)
      commit('SET_NEWS_POLLING_HANDLE', null)
    },    
    init({ commit, dispatch }) {
      const stored = loadJson(LS_KEY, []);
      const holdings = (Array.isArray(stored) ? stored : [])
        .filter((h) => h && typeof h === "object")
        .map(normalizeHolding)
        .filter((h) => h.id && Number.isFinite(h.qty) && h.qty > 0);

      commit("SET_HOLDINGS", holdings);

      dispatch("refreshPrices");
      dispatch("startPricePolling");
      dispatch('startNewsPolling')
    
    },

    persist({ state }) {
      saveJson(LS_KEY, state.holdings);
    },

    async refreshPrices({ state, commit }) {
      try {
        const ids = state.holdings.map((h) => h.id);
        if (!ids.length) return;
        const data = await fetchSimplePriceEur(ids);
        commit("SET_PRICES", data);
      } catch (e) {
        commit(
          "SET_PRICE_ERROR",
          e?.message || "Eroare la incarcarea preturilor."
        );
      }
    },

    startPricePolling({ state, commit, dispatch }) {
      if (state.pricePollingHandle) return;
      const handle = window.setInterval(
        () => dispatch("refreshPrices"),
        60_000
      );
      commit("SET_POLLING_HANDLE", handle);
    },

    stopPricePolling({ state, commit }) {
      if (!state.pricePollingHandle) return;
      window.clearInterval(state.pricePollingHandle);
      commit("SET_POLLING_HANDLE", null);
    },

    addHolding({ commit, dispatch }, holdingInput) {
      const holding = normalizeHolding(holdingInput);
      commit("UPSERT_HOLDING", holding);
      dispatch("persist");
      dispatch("refreshPrices");
    },

    updateHolding({ commit, dispatch }, holdingInput) {
      const holding = normalizeHolding(holdingInput);
      commit("UPSERT_HOLDING", holding);
      dispatch("persist");
      dispatch("refreshPrices");
    },

    deleteHolding({ commit, dispatch }, id) {
      commit("REMOVE_HOLDING", id);
      dispatch("persist");
      dispatch("refreshPrices");
    },

    async getMarketChart({ state, commit }, { coinId, days }) {
      const d = Number(days);
      const key = `${coinId}__${d}`;
      const now = Date.now();

      const cached = state.marketChartCache[key];
      if (cached && cached.expiresAt > now) return cached.points;

      const points = await fetchMarketChartEur(coinId, d);
      commit("SET_MARKET_CHART_CACHE", {
        key,
        payload: { expiresAt: now + 10 * 60_000, points },
      });
      return points;
    },

    async search({ state, commit }, q) {
      const query = String(q || "").trim();
      if (!query) {
        commit("SET_LAST_SEARCH", { q: "", results: [], at: Date.now() });
        return [];
      }

      if (
        state.lastSearch.q === query &&
        Date.now() - state.lastSearch.at < 15_000
      ) {
        return state.lastSearch.results;
      }

      const results = await searchCoins(query);
      commit("SET_LAST_SEARCH", { q: query, results, at: Date.now() });
      return results;
    },
  },
};
