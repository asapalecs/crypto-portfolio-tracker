<template>
  <CardWrapper :title="modeTitle">
    <form class="form" @submit.prevent="onSubmit">
      <label class="field">
        <span class="field__label">Cauta moneda (nume/simbol)</span>
        <input
          ref="qInput"
          class="field__control"
          v-model.trim="query"
          placeholder="ex: bitcoin / BTC / ethereum"
          @input="doSearch"
          autocomplete="off"
        />
        <span v-if="errors.query" class="field__error">{{ errors.query }}</span>
      </label>

      <div v-if="results.length" class="results">
        <button
          v-for="c in results"
          :key="c.id"
          class="result"
          type="button"
          @click="selectCoin(c)"
        >
          <span class="result__name">{{ c.name }}</span>
          <span class="result__sym">{{ c.symbol }}</span>
        </button>
      </div>

      <label class="field">
        <span class="field__label">ID moneda selectata</span>
        <input class="field__control" v-model.trim="coinId" placeholder="ex: bitcoin" />
        <span v-if="errors.coinId" class="field__error">{{ errors.coinId }}</span>
      </label>

      <label class="field">
        <span class="field__label">Cantitate</span>
        <input class="field__control" v-model.number="qty" type="number" step="0.00000001" min="0" />
        <span v-if="errors.qty" class="field__error">{{ errors.qty }}</span>
      </label>

      <div class="form__actions">
        <button class="btn btn--ghost" type="button" @click="$emit('cancel')">Renunta</button>
        <button class="btn btn--primary" type="submit">{{ submitText }}</button>
      </div>
    </form>
  </CardWrapper>
</template>

<script>
import CardWrapper from './CardWrapper.vue'

export default {
  name: 'FormComponent',
  components: { CardWrapper },
  props: {
    mode: { type: String, default: 'add' },
    initial: { type: Object, default: null }
  },
  emits: ['submit', 'cancel'],
  data() {
    return {
      query: '',
      results: [],
      coinId: '',
      coinName: '',
      coinSymbol: '',
      qty: 0,
      errors: {}
    }
  },
  computed: {
    modeTitle() {
      return this.mode === 'edit' ? 'Editeaza moneda' : 'Adauga moneda'
    },
    submitText() {
      return this.mode === 'edit' ? 'Salveaza' : 'Adauga'
    }
  },
  created() {
    if (this.initial) {
      this.coinId = this.initial.id
      this.coinName = this.initial.name
      this.coinSymbol = this.initial.symbol
      this.qty = this.initial.qty
      this.query = `${this.initial.name} (${this.initial.symbol})`
    }
  },
  mounted() {
    this.$refs.qInput?.focus()
  },
  methods: {
    async doSearch() {
      if (!this.query || this.query.length < 2) {
        this.results = []
        return
      }
      try {
        const r = await this.$store.dispatch('portfolio/search', this.query)
        this.results = r
      } catch {
        this.results = []
      }
    },
    selectCoin(c) {
      this.coinId = c.id
      this.coinName = c.name
      this.coinSymbol = c.symbol
      this.query = `${c.name} (${c.symbol})`
      this.results = []
    },
    validate() {
      const e = {}
      if (!this.query) e.query = 'Cautarea este obligatorie.'
      if (!this.coinId) e.coinId = 'ID-ul monedei este obligatoriu.'
      if (!(Number(this.qty) > 0)) e.qty = 'Cantitatea trebuie sa fie un numar pozitiv.'
      this.errors = e
      return Object.keys(e).length === 0
    },
    onSubmit() {
      if (!this.validate()) return
      this.$emit('submit', {
        id: this.coinId.trim(),
        name: this.coinName?.trim() || this.coinId.trim(),
        symbol: this.coinSymbol?.trim() || this.coinId.slice(0, 6).toUpperCase(),
        qty: Number(this.qty)
      })
    }
  }
}
</script>
