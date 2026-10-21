<template>
  <div class="detail">
    <div class="detail__row">
      <div class="detail__label">Detii in portofoliu</div>
      <div class="detail__value">
        <strong>{{ holding ? holding.qty : 0 }}</strong>
      </div>
    </div>

    <div class="detail__row">
      <div class="detail__label">Pret ({{ fiat }})</div>
      <div class="detail__value">
        <strong>{{ priceFiat }}</strong>
      </div>
    </div>

    <div class="detail__row">
      <div class="detail__label">Valoare ({{ fiat }})</div>
      <div class="detail__value">
        <strong>{{ valueFiat }}</strong>
      </div>
    </div>

    <div class="banner banner--info">
      Sfat: graficul de pret il gasesti in tab-ul Istoric.
    </div>
  </div>
</template>

<script>
import { formatMoney } from '../../utils/format'

export default {
  name: 'OverviewTab',
  props: { coinId: { type: String, required: true } },
  computed: {
    holding() { return this.$store.getters['portfolio/holdingById'](this.coinId) },
    fiat() { return this.$store.getters['user/fiat'] },
    fxRate() { return this.$store.getters['user/fxRateForFiat'](this.fiat) },
    priceEur() { return this.$store.state.portfolio.pricesEurById[this.coinId]?.eur ?? 0 },
    priceFiat() { return formatMoney(this.priceEur * this.fxRate, this.fiat) },
    valueFiat() {
      const qty = this.holding?.qty ?? 0
      return formatMoney(this.priceEur * this.fxRate * qty, this.fiat)
    }
  }
}
</script>
