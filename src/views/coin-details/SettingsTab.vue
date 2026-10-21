<template>
  <div class="banner banner--info">
    Setari pentru moneda (in lucru: alerte, lista de urmarire). Moneda de afisare se schimba din meniul de sus.
  </div>
</template>

<script>
export default {
  name: 'SettingsTab',
  props: { coinId: { type: String, required: true } }
}
</script>
