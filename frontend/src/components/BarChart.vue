<template>
  <div class="h-[260px]">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import {
  Chart,
  BarController, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps({
  /* Stari način: [{ x, y }] */
  data:  { type: Array, default: () => [] },
  /* Novi način (koristimo na Dashboardu): [{ label, count }] */
  bars:  { type: Array, default: () => [] },
  title: { type: String, default: 'Treninzi' },
})

const labels = computed(() => {
  if (props.data?.length) return props.data.map(p => String(p.x))
  return (props.bars || []).map(b => String(b.label))
})

const values = computed(() => {
  if (props.data?.length) return props.data.map(p => Number(p.y) || 0)
  return (props.bars || []).map(b => Number(b.count) || 0)
})

const canvas = ref(null)
let chart

function render () {
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  if (chart) chart.destroy()

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.value,
      datasets: [{
        label: props.title,
        data: values.value,
        borderWidth: 1,
        backgroundColor: 'rgba(37,99,235,0.18)',
        borderColor: 'rgba(37,99,235,1)',
        hoverBackgroundColor: 'rgba(37,99,235,0.28)',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }, // cijeli brojevi
        },
      },
    },
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch([labels, values], () => {
  if (!chart) return
  chart.data.labels = labels.value
  chart.data.datasets[0].data = values.value
  chart.update()
})
</script>
