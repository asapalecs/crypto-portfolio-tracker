<template>
  <motion.div
    class="item"
    :initial="{ opacity: 0, y: 8 }"
    :animate="{ opacity: 1, y: 0 }"
    :whileHover="{ scale: 1.01 }"
    :transition="{ duration: 0.2 }"
  >
    <button class="item__main" @click="$emit('select')">
      <div class="item__name">
        <div class="item__title">{{ holding.name }}</div>
        <div class="item__sub">{{ holding.symbol }} · Cantitate: {{ holding.qty }}</div>
      </div>

      <div class="item__vals">
        <div class="item__price">{{ money(priceFiat) }}</div>
        <div class="item__value">Valoare: {{ money(valueFiat) }}</div>
      </div>
    </button>

    <div class="item__actions">
      <button class="btn btn--ghost" @click="$emit('edit')">Editeaza</button>
      <button class="btn btn--danger" @click="$emit('delete')">Sterge</button>
    </div>
  </motion.div>
</template>

<script setup>
import { computed } from 'vue'
import { motion } from 'motion-v'
import { formatMoney } from '../utils/format'

const props = defineProps({
  holding: { type: Object, required: true },
  priceEur: { type: Number, required: true },
  fiat: { type: String, required: true },
  fxRate: { type: Number, required: true }
})

defineEmits(['select', 'edit', 'delete'])

const priceFiat = computed(() => props.priceEur * props.fxRate)
const valueFiat = computed(() => props.priceEur * props.fxRate * props.holding.qty)

function money(v) {
  return formatMoney(v, props.fiat)
}
</script>
