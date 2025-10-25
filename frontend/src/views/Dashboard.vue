<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Dobrodošao nazad 👋</h1>

    <!-- Stat kartice -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white border rounded-2xl p-4">
        <div class="text-gray-500">Ukupno treninga:</div>
        <div class="text-2xl font-semibold">{{ totals.workouts }}</div>
      </div>

      <div class="bg-white border rounded-2xl p-4">
        <div class="text-gray-500">Vježbi u bazi:</div>
        <div class="text-2xl font-semibold">{{ totals.exercises }}</div>
      </div>

      <div class="bg-white border rounded-2xl p-4">
        <div class="text-gray-500">Personalni rekordi:</div>
        <div class="text-2xl font-semibold">{{ totals.pbExercises }}</div>
      </div>

      <div class="bg-white border rounded-2xl p-4">
        <div class="text-gray-500">Ukupno setova (30d):</div>
        <div class="text-2xl font-semibold">
          {{ totalSets30d === null ? '—' : totalSets30d }}
        </div>
      </div>
    </div>

    <!-- Grafovi -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white border rounded-2xl p-4">
        <h3 class="font-semibold text-lg mb-2">
          Napredak 1RM ({{ chartTitle1RM }})
        </h3>
        <div v-if="linePoints.length < 2" class="text-gray-500">Nema dovoljno podataka.</div>
        <LineChart v-else :points="linePoints" :title="`1RM — ${chartTitle1RM}`"/>
      </div>

      <div class="bg-white border rounded-2xl p-4">
        <h3 class="font-semibold text-lg mb-2">
          Treninzi po datumu (posljednjih 14d)
        </h3>
        <div v-if="barPoints.length === 0" class="text-gray-500">Nema podataka.</div>
        <!-- BarChart sada očekuje bars: [{ label: '24. 10. 2025.', count: 2 }, ...] -->
        <BarChart v-else :bars="barPoints" :title="'Treninzi po danima'"/>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import http from '../api/http'
import LineChart from '../components/LineChart.vue'
import BarChart from '../components/BarChart.vue'

const totals = ref({
  workouts: 0,
  exercises: 0,
  pbExercises: 0,
})

const totalSets30d = ref(null) // broj, ili null dok ne učitamo

// graf 1RM
const linePoints = ref([]) // [{ date: Date, weight: Number }]
const chartTitle1RM = ref('Bench')

// graf treninzi po datumu (koristimo prethodno formatirane labele)
const barPoints = ref([])  // [{ label: 'dd. mm. yyyy.', count: Number }]

onMounted(loadAll)

async function loadAll () {
  try {
    // paralelno dohvaćanje
    const [exRes, woRes, recRes] = await Promise.all([
      http.get('/exercises'),
      http.get('/workouts', { params: { from: daysAgoISO(14) } }),
      http.get('/records')
    ])

    const exercises = exRes.data || []
    const workouts = woRes.data || []
    const records = (recRes.data || []).map(r => ({ ...r, weight: Number(r.weight) }))

    // kartice
    totals.value.exercises = exercises.length
    totals.value.workouts  = workouts.length
    totals.value.pbExercises = countPBExercises(records)

    // 1RM serija
    const { title, points } = build1RMSeries(records, exercises)
    chartTitle1RM.value = title
    linePoints.value = points

    // treninzi po danu (sigurni prikaz – bez Date parsinga)
    barPoints.value = groupWorkoutsByDateSafe(workouts)

    // ukupno setova u zadnjih 30 dana
    totalSets30d.value = await calcTotalSetsLast30Days()
  } catch (e) {
    console.error('Dashboard load error', e)
    totalSets30d.value = null
  }
}

/* ---------- Helpers ---------- */

function daysAgoISO (n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function formatHR(dateIso) {
  // očekuje YYYY-MM-DD; fallback na raw
  try {
    return new Date(dateIso + 'T00:00:00').toLocaleDateString('hr-HR')
  } catch { return dateIso }
}

function countPBExercises (records) {
  const set = new Set(records.map(r => r.exercise_id))
  return set.size
}

function build1RMSeries (records, exercises) {
  if (!records.length) return { title: 'Bench', points: [] }

  const bench = exercises.find(e => /bench/i.test(e.name || ''))
  let exId = bench?.id ?? records[0].exercise_id
  const exName = exercises.find(e => e.id === exId)?.name || '1RM'

  const series = records
    .filter(r => r.exercise_id === exId)
    .slice()
    .sort((a, b) => new Date(a.record_date) - new Date(b.record_date))
    .map(r => ({ date: new Date(r.record_date), weight: Number(r.weight) }))

  return { title: exName, points: series }
}

/* ✅ SIGURNO grupiranje po datumu – bez Date parsinga
   Uzimamo samo prvih 10 znakova (YYYY-MM-DD), formatiramo labelu za prikaz */
function groupWorkoutsByDateSafe (workouts) {
  const map = new Map()
  for (const w of workouts) {
    const raw = String(w.workout_date || '').slice(0, 10) // YYYY-MM-DD
    if (!raw) continue
    map.set(raw, (map.get(raw) || 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))         // sort po ISO stringu
    .map(([iso, count]) => ({ label: formatHR(iso), count }))
}

/* Ukupno setova u zadnjih 30 dana (stvarni zbroj) */
async function calcTotalSetsLast30Days () {
  const { data: workouts } = await http.get('/workouts', { params: { from: daysAgoISO(30) } })
  if (!workouts?.length) return 0
  let total = 0
  // za svaki trening dohvatimo detalj i zbrojimo setove
  for (const w of workouts) {
    const { data: detail } = await http.get(`/workouts/${w.id}`)
    for (const it of (detail.items || [])) {
      total += (it.sets || []).length
    }
  }
  return total
}
</script>
