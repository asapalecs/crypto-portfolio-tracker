<template>
  <header class="topbar">
    <div class="container topbar__inner">
      <div class="brand" @click="goHome" role="button" tabindex="0">
        <span class="brand__mark">CP</span>
        <span class="brand__name">Crypto Portfolio</span>
      </div>

      <nav v-if="authed" class="nav">
        <router-link class="nav__link" to="/">Acasa</router-link>
        <router-link class="nav__link" to="/coins">Portofoliu</router-link>
        <router-link class="nav__link" to="/asset/new">Adauga</router-link>
      </nav>

      <div class="topbar__right">
        <CurrencySelect v-if="authed" :fiat="fiat" @change="setFiat" />

        <router-link v-if="!authed" class="btn btn--ghost" to="/login">Autentificare</router-link>
        <router-link v-if="!authed" class="btn btn--primary" to="/register">Inregistrare</router-link>

        <button v-if="authed" class="btn btn--ghost" @click="logout">Deconectare</button>
      </div>
    </div>
  </header>
</template>

<script>
import CurrencySelect from './CurrencySelect.vue'

export default {
  name: 'NavMenu',
  components: { CurrencySelect },
  computed: {
    authed() { return this.$store.getters['user/isAuthed'] },
    fiat() { return this.$store.getters['user/fiat'] }
  },
  methods: {
    setFiat(fiat) { this.$store.dispatch('user/setFiat', fiat) },
    logout() {
      this.$store.dispatch('user/logout')
      this.$store.dispatch('portfolio/stopPricePolling')
      this.$router.push({ name: 'login' })
    },
    goHome() {
      if (this.authed) this.$router.push({ name: 'home' })
    }
  }
}
</script>
