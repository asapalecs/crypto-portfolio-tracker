<template>
  <div class="grid">
    <CardWrapper title="Portofoliu">
      <template #actions>
        <router-link class="btn btn--primary" to="/asset/new">Adauga</router-link>
      </template>

      <div class="toolbar">
        <label class="field field--inline">
          <span class="field__label">Cauta</span>
          <input class="field__control" v-model.trim="q" placeholder="nume / simbol" />
        </label>

        <label class="field field--inline">
          <span class="field__label">Sortare</span>
          <select class="field__control" v-model="sortKey">
            <option value="value">Valoare</option>
            <option value="qty">Cantitate</option>
            <option value="name">Nume</option>
          </select>
        </label>

        <label class="field field--inline">
          <span class="field__label">Ordine</span>
          <select class="field__control" v-model="sortDir">
            <option value="desc">Descrescator</option>
            <option value="asc">Crescator</option>
          </select>
        </label>
      </div>

      <ListComponent
        :items="filteredSorted"
        :prices-eur-by-id="pricesEurById"
        :fiat="fiat"
        :fx-rate="fxRate"
        @select="goDetails"
        @edit="askEdit"
        @delete="askDelete"
      />
    </CardWrapper>

    <ConfirmModal
      :open="confirm.open"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-text="confirm.confirmText"
      @confirm="confirmYes"
      @cancel="confirmNo"
    />
  </div>
</template>

<script>
import CardWrapper from '../components/CardWrapper.vue'
import ListComponent from '../components/ListComponent.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

export default {
  name: 'CoinsView',
  components: { CardWrapper, ListComponent, ConfirmModal },
  data() {
    return {
      q: '',
      sortKey: 'value',
      sortDir: 'desc',
      confirm: {
        open: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        action: null,
        payload: null
      }
    }
  },
  computed: {
    holdings() { return this.$store.state.portfolio.holdings },
    pricesEurById() { return this.$store.state.portfolio.pricesEurById },
    fiat() { return this.$store.getters['user/fiat'] },
    fxRate() { return this.$store.getters['user/fxRateForFiat'](this.fiat) },

    filteredSorted() {
      const q = this.q.trim().toLowerCase()
      const fx = this.fxRate
      const prices = this.pricesEurById

      let list = this.holdings.filter(h => {
        if (!q) return true
        return (h.name || '').toLowerCase().includes(q) || (h.symbol || '').toLowerCase().includes(q)
      })

      const getVal = (h) => (prices[h.id]?.eur ?? 0) * fx * h.qty

      list.sort((a, b) => {
        let A, B
        if (this.sortKey === 'qty') { A = a.qty; B = b.qty }
        else if (this.sortKey === 'name') { A = a.name; B = b.name }
        else { A = getVal(a); B = getVal(b) }

        if (A < B) return this.sortDir === 'asc' ? -1 : 1
        if (A > B) return this.sortDir === 'asc' ? 1 : -1
        return 0
      })

      return list
    }
  },
  methods: {
    goDetails(h) {
      this.$router.push(`/coins/${h.id}`)
    },
    askEdit(h) {
      this.confirm = {
        open: true,
        title: 'Confirmare editare',
        message: `Vrei sa editezi ${h.name} (${h.symbol})?`,
        confirmText: 'Editeaza',
        action: 'edit',
        payload: h
      }
    },
    askDelete(h) {
      this.confirm = {
        open: true,
        title: 'Confirmare stergere',
        message: `Sigur stergi ${h.name} (${h.symbol}) din portofoliu?`,
        confirmText: 'Sterge',
        action: 'delete',
        payload: h
      }
    },
    confirmNo() {
      this.confirm.open = false
    },
    confirmYes() {
      const { action, payload } = this.confirm
      this.confirm.open = false

      if (action === 'edit') this.$router.push(`/asset/${payload.id}/edit`)
      if (action === 'delete') this.$store.dispatch('portfolio/deleteHolding', payload.id)
    }
  }
}
</script>
