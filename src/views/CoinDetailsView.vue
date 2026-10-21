<template>
  <div class="grid">
    <CardWrapper :title="`Detalii: ${coinId}`">
      <template #actions>
        <router-link class="btn btn--ghost" to="/coins">Inapoi</router-link>
      </template>

      <div class="tabs">
        <router-link class="tab" :to="`/coins/${coinId}/overview`">Prezentare</router-link>
        <router-link class="tab" :to="`/coins/${coinId}/history`">Istoric</router-link>
        <router-link class="tab" :to="`/coins/${coinId}/settings`">Setari</router-link>
      </div>

      <router-view :coin-id="coinId" />
    </CardWrapper>
  </div>
</template>

<script>
import CardWrapper from '../components/CardWrapper.vue'

export default {
  name: 'CoinDetailsView',
  components: { CardWrapper },
  computed: {
    coinId() { return this.$route.params.id }
  }
}
</script>
