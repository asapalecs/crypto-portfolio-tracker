<template>
  <div class="grid">
    <CardWrapper title="Valoare totala portofoliu">
      <template #actions>
        <router-link class="btn btn--primary" to="/asset/new"
          >Adauga moneda</router-link
        >
      </template>

      <motion.div
        class="kpi"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
      >
        <div class="kpi__value">{{ totalFiat }}</div>
        <div class="kpi__meta">
          Actualizat: <strong>{{ lastUpdatedText }}</strong>
          <span v-if="priceError" class="pill pill--warn">Problema API</span>
        </div>
      </motion.div>
    </CardWrapper>

    <CardWrapper title="Evolutie (7 zile) pentru fiecare moneda">
      <div class="cards">
        <motion.div
          v-for="h in holdings"
          :key="h.id"
          class="mini"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
        >
          <div class="mini__head">
            <div class="mini__name">{{ h.name }}</div>
            <router-link class="mini__link" :to="`/coins/${h.id}`"
              >Detalii</router-link
            >
          </div>
          <PriceSparkline :coin-id="h.id" :days="7" />
        </motion.div>

        <div v-if="!holdings.length" class="empty">
          Nu ai monede. Adauga o moneda ca sa vezi graficele.
        </div>
      </div>
    </CardWrapper>
    <CardWrapper title="Stiri crypto (ultimele 24h)">
      <NewsList :items="newsItems" :error="newsError" />
    </CardWrapper>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { motion } from "motion-v";
import { useStore } from "vuex";
import CardWrapper from "../components/CardWrapper.vue";
import PriceSparkline from "../components/PriceSparkline.vue";
import { formatMoney } from "../utils/format";
import NewsList from "../components/NewList.vue";

const store = useStore();

const holdings = computed(() => store.state.portfolio.holdings);
const totalEur = computed(() => store.getters["portfolio/totalValueEur"]);
const fiat = computed(() => store.getters["user/fiat"]);
const fxRate = computed(() => store.getters["user/fxRateForFiat"](fiat.value));
const priceError = computed(() => store.state.portfolio.priceError);
const lastAt = computed(() => store.state.portfolio.lastPricesUpdatedAt);
const newsItems = computed(() => store.state.portfolio.newsItems)
const newsError = computed(() => store.state.portfolio.newsError)


const totalFiat = computed(() =>
  formatMoney(totalEur.value * fxRate.value, fiat.value)
);

const lastUpdatedText = computed(() => {
  if (!lastAt.value) return "—";
  return new Date(lastAt.value).toLocaleString("ro-RO");
});
</script>
