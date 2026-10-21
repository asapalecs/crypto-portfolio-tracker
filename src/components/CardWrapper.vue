<template>
  <section class="card">
    <header v-if="title" class="card__header">
      <h2 class="card__title">{{ title }}</h2>
      <div class="card__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="card__body">
      <slot />
    </div>
  </section>
</template>

<script>
export default {
  name: 'CardWrapper',
  props: {
    title: { type: String, default: '' }
  }
}
</script>
