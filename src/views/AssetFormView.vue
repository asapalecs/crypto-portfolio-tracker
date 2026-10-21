<template>
  <div class="grid">
    <FormComponent
      :mode="mode"
      :initial="initial"
      @submit="askSubmit"
      @cancel="cancel"
    />

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
import FormComponent from '../components/FormComponent.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

export default {
  name: 'AssetFormView',
  components: { FormComponent, ConfirmModal },
  data() {
    return {
      pending: null,
      confirm: { open: false, title: '', message: '', confirmText: 'Confirm' }
    }
  },
  computed: {
    id() { return this.$route.params.id || null },
    mode() { return this.id ? 'edit' : 'add' },
    initial() {
      if (!this.id) return null
      return this.$store.getters['portfolio/holdingById'](this.id)
    }
  },
  methods: {
    askSubmit(payload) {
      this.pending = payload
      this.confirm = {
        open: true,
        title: this.mode === 'edit' ? 'Confirmare modificare' : 'Confirmare adaugare',
        message: this.mode === 'edit'
          ? `Salvezi modificarile pentru ${payload.name} (${payload.symbol})?`
          : `Adaugi ${payload.name} (${payload.symbol}) in portofoliu?`,
        confirmText: this.mode === 'edit' ? 'Salveaza' : 'Adauga'
      }
    },
    confirmNo() {
      this.confirm.open = false
      this.pending = null
    },
    confirmYes() {
      this.confirm.open = false
      const p = this.pending
      this.pending = null

      if (!p) return
      if (this.mode === 'edit') {
        if (p.id !== this.id) this.$store.dispatch('portfolio/deleteHolding', this.id)
        this.$store.dispatch('portfolio/updateHolding', p)
      } else this.$store.dispatch('portfolio/addHolding', p)

      this.$router.push({ name: 'coins' })
    },
    cancel() {
      this.$router.push({ name: 'coins' })
    }
  }
}
</script>
