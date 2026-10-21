<template>
  <footer class="footer">
    <div class="container footer__inner">
      <div>
        <div class="footer__title">Crypto Portfolio Tracker</div>
        <div class="footer__meta">
          Monitorizare portofoliu crypto cu actualizare periodica a preturilor, grafice si conversie valutara.
        </div>
      </div>

      <div class="footer__cols">
        <div class="footer__col">
          <div class="footer__colTitle">Surse date</div>
          <div class="footer__link">CoinGecko (preturi si grafice de piata)</div>
          <div class="footer__link">Frankfurter (curs valutar EUR→USD/RON)</div>
        </div>

        <div class="footer__col">
          <div class="footer__colTitle">Tehnologii</div>
          <div class="footer__link">Vue 3 + Vue Router + Vuex</div>
          <div class="footer__link">Axios + Chart.js</div>
          <div class="footer__link">Motion (Motion for Vue)</div>
        </div>
      </div>

      <div class="footer__copyright">
        © {{ year }} Crypto Portfolio Tracker.
        Realizat de Alexandru Cristinescu
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'AppFooter',
  computed: {
    year() { return new Date().getFullYear() }
  }
}
</script>
