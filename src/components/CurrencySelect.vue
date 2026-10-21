<template>
  <label class="select">
    <span class="select__label">Moneda</span>
    <select class="select__control" :value="fiat" @change="$emit('change', $event.target.value)">
      <option value="EUR">EUR</option>
      <option value="USD">USD</option>
      <option value="RON">RON</option>
    </select>
  </label>
</template>

<script>
export default {
  name: 'CurrencySelect',
  props: { fiat: { type: String, required: true } },
  emits: ['change']
}
</script>
