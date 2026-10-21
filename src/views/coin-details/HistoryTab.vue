<template>
  <div class="history">
    <div class="history__head">
      <div class="pill">Grafic pret (EUR) · 30 zile</div>
    </div>

    <div class="history__chart">
      <Line v-if="chartData" :data="chartData" :options="options" />
      <div v-else-if="error" class="empty">{{ error }}</div>
      <div v-else class="empty">Se incarca graficul…</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

const props = defineProps({ coinId: { type: String, required: true } })

const store = useStore()
const chartData = ref(null)
const error = ref('')

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  elements: { point: { radius: 0 } }
}

async function load() {
  chartData.value = null
  error.value = ''
  let points
  try {
    points = await store.dispatch('portfolio/getMarketChart', { coinId: props.coinId, days: 30 })
  } catch {
    error.value = 'Grafic indisponibil.'
    return
  }
  const labels = points.map(p => new Date(p[0]).toLocaleDateString('ro-RO', { month: 'short', day: '2-digit' }))
  const values = points.map(p => p[1])
  chartData.value = {
  labels,
  datasets: [{
    data: values,
    borderColor: '#9b7bff',
    backgroundColor: 'rgba(155,123,255,0.18)',
    fill: true,
    tension: 0.25,
    borderWidth: 2
  }]
}

}

onMounted(load)
watch(() => props.coinId, load)
</script>

<style scoped>
.history__chart { height: 320px; }
</style>
