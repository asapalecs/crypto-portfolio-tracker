<template>
  <div class="spark">
    <Line v-if="chartData" :data="chartData" :options="options" />
    <div v-else-if="error" class="spark__loading">{{ error }}</div>
    <div v-else class="spark__loading">Se incarca graficul…</div>
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
  Tooltip
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

const props = defineProps({
  coinId: { type: String, required: true },
  days: { type: Number, default: 7 }
})

const store = useStore()
const chartData = ref(null)
const error = ref('')


const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { point: { radius: 0 } }
}

async function load() {
  chartData.value = null
  error.value = ''
  let points
  try {
    points = await store.dispatch('portfolio/getMarketChart', { coinId: props.coinId, days: props.days })
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
    backgroundColor: 'rgba(110,168,254,0.18)',
    fill: true,
    tension: 0.35,
    borderWidth: 2
  }]
}
}

onMounted(load)
watch(() => props.coinId, load)
</script>

<style scoped>
.spark { height: 64px; }
.spark__loading { font-size: 12px; opacity: 0.7; padding: 6px 0; }
</style>
