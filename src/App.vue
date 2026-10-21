<template>
  <div class="app-shell">
    <NavMenu />
    <main class="container">
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>

<script>
import NavMenu from './components/NavMenu.vue'
import AppFooter from './components/AppFooter.vue'

export default {
  name: 'App',
  components: { NavMenu, AppFooter },
  created() {
    this.$store.dispatch('user/init')
    this.$store.dispatch('portfolio/init')
  },
  mounted() {
    document.body.classList.add('app-mounted')
  }
}
</script>
