<template>
  <div class="auth">
    <CardWrapper title="Inregistrare">
      <form class="form" @submit.prevent="submit">
        <label class="field">
          <span class="field__label">Email</span>
          <input class="field__control" v-model.trim="email" type="email" required />
        </label>

        <label class="field">
          <span class="field__label">Parola</span>
          <input class="field__control" v-model="password" type="password" required minlength="4" />
        </label>

        <div v-if="error" class="banner banner--error">{{ error }}</div>

        <div class="form__actions">
          <button class="btn btn--primary" type="submit">Creeaza cont</button>
          <router-link class="btn btn--ghost" to="/login">Am deja cont</router-link>
        </div>
      </form>
    </CardWrapper>
  </div>
</template>

<script>
import CardWrapper from '../components/CardWrapper.vue'

export default {
  name: 'RegisterView',
  components: { CardWrapper },
  data() {
    return { email: '', password: '', error: '' }
  },
  methods: {
    submit() {
      this.error = ''
      try {
        this.$store.dispatch('user/register', { email: this.email, password: this.password })
        this.$store.dispatch('portfolio/startPricePolling')
        this.$router.push({ name: 'home' })
      } catch (e) {
        this.error = e?.message || 'Eroare.'
      }
    }
  }
}
</script>
