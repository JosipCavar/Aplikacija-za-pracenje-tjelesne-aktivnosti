<template>
  <div class="w-full h-[260px]">
    <Line :data="data" :options="options" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  CategoryScale
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  CategoryScale
)

const props = defineProps({
  title: { type: String, default: 'Line' },
  unit:  { type: String, default: 'kg' },          // 👈 opcionalna jedinica
  points:{ type: Array,  default: () => [] },      // A) [{ x, y }] ili [{ date, weight }]
  labels:{ type: Array,  default: () => [] },      // B) ručni način
  series:{ type: Array,  default: () => [] }       // B)
})

function fmtDate(d) {
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleDateString('hr-HR')
}

const labels = computed(() => {
  if (props.points?.length) {
    // podrži i x/date
    return props.points.map(p => fmtDate(p.x ?? p.date))
  }
  return props.labels
})

const values = computed(() => {
  if (props.points?.length) {
    // podrži i y/weight
    return props.points.map(p => Number(p.y ?? p.weight))
  }
  return props.series.map(Number)
})

const data = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: props.title,
      data: values.value,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.15)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2
    }
  ]
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.parsed.y}${props.unit ? ' ' + props.unit : ''}`
      }
    }
  },
  scales: {
    x: { ticks: { maxRotation: 0 }, grid: { display: false } },
    y: { beginAtZero: false, grid: { color: '#e5e7eb' } }
  }
}))
</script>
