<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Rekordi (1RM)</h1>

    <!-- Personal Best po vježbi -->
    <div class="bg-white border rounded-2xl p-4">
      <h2 class="font-semibold text-lg mb-3">Personal Best po vježbi</h2>

      <div v-if="bests.length === 0" class="text-gray-500">Nema podataka.</div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-gray-500">
            <th class="py-2">Vježba</th>
            <th class="py-2">Dio tijela</th>
            <th class="py-2">1RM (kg)</th>
            <th class="py-2">Datum</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in bests" :key="b.exercise_id" class="border-t">
            <td class="py-2">{{ b.exercise_name }}</td>
            <td class="py-2">{{ b.body_part }}</td>
            <td class="py-2 font-semibold">{{ Number(b.weight).toFixed(2) }}</td>
            <td class="py-2">{{ formatDate(b.record_date) }}</td>
            <td class="py-2">
              <button class="text-blue-600 hover:underline" @click="selectExercise(b.exercise_id)">
                Povijest
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Povijest odabrane vježbe -->
    <div v-if="selectedExercise" class="bg-white border rounded-2xl p-4">
      <h2 class="font-semibold text-lg mb-3">
        Povijest — {{ selectedName }}
      </h2>

      <!-- Graf (Chart.js) -->
      <LineChart :points="chartData" :title="selectedName || '1RM'" />

      <!-- Lista zapisa -->
      <ul class="space-y-1 text-sm mt-3">
        <li v-for="r in sortedForSelected" :key="r.id">
          {{ formatDate(r.record_date) }} — <b>{{ Number(r.weight).toFixed(2) }}</b> kg
          <span v-if="r.note" class="text-gray-500">({{ r.note }})</span>
        </li>
      </ul>
    </div>

    <!-- Novi 1RM zapis -->
    <div class="bg-white border rounded-2xl p-4">
      <h2 class="font-semibold mb-2">Novi 1RM zapis</h2>
      <div class="flex flex-wrap gap-2">
        <select v-model="form.exercise_id" class="border rounded-xl px-3 py-2">
          <option v-for="e in exercises" :key="e.id" :value="e.id">
            {{ e.name }}
          </option>
        </select>
        <input
          v-model.number="form.weight"
          type="number"
          step="0.5"
          placeholder="kg"
          class="border rounded-xl px-3 py-2 w-28"
        />
        <input v-model="form.record_date" type="date" class="border rounded-xl px-3 py-2" />
        <input v-model="form.note" placeholder="napomena" class="border rounded-xl px-3 py-2 w-56" />
        <button
          @click="createRecord"
          :disabled="isDuplicateLocally"
          class="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          title="Duplicate zapis je onemogućen"
        >
          Spremi 1RM
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import http from '../api/http'
import LineChart from '../components/LineChart.vue'

const exercises = ref([])
const records = ref([])        // svi 1RM zapisi
const selectedExercise = ref(null)

const form = ref({
  exercise_id: null,
  weight: null,
  record_date: new Date().toISOString().slice(0, 10),
  note: ''
})

onMounted(async () => {
  const ex = await http.get('/exercises')
  exercises.value = ex.data || []
  if (exercises.value.length && !form.value.exercise_id) {
    form.value.exercise_id = exercises.value[0].id
  }
  await loadRecords()
})

// ako još nije odabrano, selektiraj prvu dostupnu vježbu
watch(records, (val) => {
  if (!selectedExercise.value && val.length) {
    selectedExercise.value = val[0].exercise_id
  }
})

async function loadRecords () {
  const { data } = await http.get('/records')
  // normalizacija brojeva
  records.value = (data || []).map(r => ({
    ...r,
    weight: Number(r.weight)
  }))
}

/* Personal best po vježbi (max težina; ako su iste, noviji datum) */
const bests = computed(() => {
  const map = new Map()
  for (const r of records.value) {
    const cur = map.get(r.exercise_id)
    if (!cur || Number(r.weight) > Number(cur.weight)) {
      map.set(r.exercise_id, r)
    } else if (cur && Number(r.weight) === Number(cur.weight)) {
      if (new Date(r.record_date) > new Date(cur.record_date)) {
        map.set(r.exercise_id, r)
      }
    }
  }
  return Array.from(map.values())
})

/* Lista zapisa za odabranu vježbu — SORTIRANA ASC po datumu */
const sortedForSelected = computed(() => {
  if (!selectedExercise.value) return []
  return records.value
    .filter(r => r.exercise_id === selectedExercise.value)
    .slice()
    .sort((a, b) => new Date(a.record_date) - new Date(b.record_date))
})

/* Podaci za graf (x=date, y=weight), sortirano ASC */
const chartData = computed(() =>
  sortedForSelected.value.map(r => ({
    date: new Date(r.record_date),   // LineChart formatira u hr-HR
    weight: Number(r.weight)
  }))
)

const selectedName = computed(() => {
  const ex = exercises.value.find(e => e.id === selectedExercise.value)
  return ex ? ex.name : ''
})

function selectExercise (id) {
  selectedExercise.value = id
}

/* Disable gumba ako već u records postoji ISTA kombinacija (exercise + date + weight) */
const isDuplicateLocally = computed(() =>
  records.value.some(r =>
    r.exercise_id === form.value.exercise_id &&
    new Date(r.record_date).toISOString().slice(0,10) === form.value.record_date &&
    Number(r.weight) === Number(form.value.weight)
  )
)

async function createRecord () {
  if (!form.value.exercise_id || !form.value.weight || !form.value.record_date) return

  try {
    await http.post('/records', form.value)
    await loadRecords()
    if (!selectedExercise.value) selectedExercise.value = form.value.exercise_id
    form.value.note = ''
  } catch (e) {
    if (e?.response?.status === 409) {
      alert('Već postoji isti 1RM za tu vježbu s istim datumom i težinom.')
    } else {
      alert('Greška pri spremanju 1RM zapisa.')
    }
  }
}

function formatDate (d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('hr-HR')
}
</script>
