<template>
  <div class="list">
    <ItemComponent
      v-for="h in items"
      :key="h.id"
      :holding="h"
      :price-eur="pricesEurById[h.id]?.eur ?? 0"
      :fiat="fiat"
      :fx-rate="fxRate"
      @select="$emit('select', h)"
      @edit="$emit('edit', h)"
      @delete="$emit('delete', h)"
    />
    <div v-if="!items.length" class="empty">
      Nu ai monede in portofoliu. Adauga prima moneda din „Adauga”.
    </div>
  </div>
</template>

<script>
import ItemComponent from './ItemComponent.vue'

export default {
  name: 'ListComponent',
  components: { ItemComponent },
  props: {
    items: { type: Array, required: true },
    pricesEurById: { type: Object, required: true },
    fiat: { type: String, required: true },
    fxRate: { type: Number, required: true }
  },
  emits: ['select', 'edit', 'delete']
}
</script>
