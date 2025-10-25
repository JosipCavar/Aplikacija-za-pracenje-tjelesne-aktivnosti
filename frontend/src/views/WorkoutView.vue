<template>
  <div>
    <!-- Header -->
    <h1 class="text-2xl font-bold">
      {{ workout.title }} — {{ formatDate(workout.workout_date) }}
    </h1>
    <p v-if="workout.notes" class="text-gray-600 mb-4">{{ workout.notes }}</p>

    <!-- Info traka kad je trening zaključan -->
    <div
      v-if="isLocked"
      class="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-6"
    >
      ✅ Trening je zaključan — uređivanje nije moguće
    </div>

    <!-- Dodaj vježbu (skriveno ako je trening zaključan) -->
    <div v-if="!isLocked" class="bg-white border rounded-2xl p-4 mb-6">
      <h2 class="font-semibold mb-2">Dodaj vježbu</h2>
      <div class="flex gap-2">
        <select v-model="exerciseId" class="border rounded-xl px-3 py-2">
          <option v-for="e in ex" :value="e.id" :key="e.id">
            {{ e.name }} ({{ e.body_part }})
          </option>
        </select>
        <input
          v-model.number="planned_sets"
          type="number"
          min="0"
          placeholder="Plan setova"
          class="border rounded-xl px-3 py-2 w-36"
        />
        <input
          v-model.number="planned_reps"
          type="number"
          min="0"
          placeholder="Plan ponavljanja"
          class="border rounded-xl px-3 py-2 w-44"
        />
        <button
          @click="addItem"
          class="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          :disabled="!exerciseId"
        >
          Dodaj
        </button>
      </div>
    </div>

    <!-- Stavke/vježbe -->
    <div
      v-for="it in items"
      :key="it.id"
      class="item bg-white border rounded-2xl p-4 mb-3"
    >
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {{ it.exercise_name }} — plan: {{ it.planned_sets }}x{{ it.planned_reps }}
        </h3>

        <div class="flex items-center gap-2">
          <span v-if="it.locked" class="text-green-600 font-medium">
            ✅ Vježba zaključana
            <span v-if="it.completed_at" class="text-gray-500 text-sm">
              ({{ formatDateTime(it.completed_at) }})
            </span>
          </span>

          <button
            v-if="!it.locked && !isLocked"
            @click="lockExercise(it)"
            class="bg-green-600 text-white rounded-xl px-3 py-1 hover:bg-green-700"
          >
            ✅ Spremi vježbu
          </button>
        </div>
      </div>

      <!-- Setovi -->
      <div class="mt-2">
        <h4 class="font-medium">Setovi</h4>

        <div v-for="s in it.sets" :key="s.id" class="text-sm text-gray-700">
          Set {{ s.set_number }}: {{ s.reps }} rep, težina: {{ s.weight ?? '-' }} kg
        </div>

        <!-- Dodaj set (skriveno kad je vježba ili trening zaključan) -->
        <div class="flex gap-2 mt-2" v-if="!it.locked && !isLocked">
          <input
            v-model.number="newSet[it.id].set_number"
            type="number"
            min="1"
            placeholder="#"
            class="border rounded-xl px-3 py-2 w-24"
          />
          <input
            v-model.number="newSet[it.id].reps"
            type="number"
            min="1"
            placeholder="reps"
            class="border rounded-xl px-3 py-2 w-24"
          />
          <input
            v-model.number="newSet[it.id].weight"
            type="number"
            step="0.5"
            placeholder="kg"
            class="border rounded-xl px-3 py-2 w-28"
          />
          <button
            @click="addSet(it.id)"
            class="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700"
          >
            Dodaj set
          </button>
        </div>
      </div>
    </div>

    <hr class="my-6" />

    <!-- Spremi/zaključa cijeli trening -->
    <div class="flex items-center gap-3 mb-6">
      <button
        v-if="!isLocked"
        @click="lockWorkout"
        class="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700"
      >
        💾 Spremi trening
      </button>
      <span v-else class="text-blue-600 font-semibold">✅ Trening zaključen</span>
    </div>

    <!-- Brzi unos 1RM (skriven kad je zaključano) -->
    <div v-if="!isLocked" class="bg-white border rounded-2xl p-4">
      <h2 class="font-semibold mb-2">Brzi unos 1RM</h2>
      <div class="flex gap-2">
        <select v-model="rm.exercise_id" class="border rounded-xl px-3 py-2">
          <option v-for="e in ex" :value="e.id" :key="'rm-'+e.id">{{ e.name }}</option>
        </select>
        <input
          v-model.number="rm.weight"
          type="number"
          step="0.5"
          placeholder="kg"
          class="border rounded-xl px-3 py-2 w-28"
        />
        <input v-model="rm.record_date" type="date" class="border rounded-xl px-3 py-2" />
        <input v-model="rm.note" placeholder="napomena" class="border rounded-xl px-3 py-2 w-56" />
        <button
          @click="save1RM"
          class="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700"
        >
          Spremi 1RM
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import http from '../api/http'

const route = useRoute()
const id = route.params.id

const workout = ref({ is_locked: 0 })
const items = ref([])
const ex = ref([])

const exerciseId = ref(null)
const planned_sets = ref(0)
const planned_reps = ref(0)

const newSet = reactive({})

const rm = reactive({
  exercise_id: null,
  weight: null,
  record_date: new Date().toISOString().slice(0, 10),
  note: ''
})

/* ✅ computed: je li trening zaključan */
const isLocked = computed(() => Number(workout.value?.is_locked) === 1)

async function load () {
  const w = await http.get(`/workouts/${id}`)
  // backend vraća i is_locked te polje items
  workout.value = {
    title: w.data.title,
    workout_date: w.data.workout_date,
    notes: w.data.notes,
    is_locked: w.data.is_locked || 0,
    id: id
  }
  items.value = w.data.items || []

  // inicijalne vrijednosti za novi set po vježbi
  for (const it of items.value) {
    newSet[it.id] = {
      set_number: (it.sets?.length || 0) + 1,
      reps: 8,
      weight: null
    }
  }

  const { data: exData } = await http.get('/exercises')
  ex.value = exData
  if (!exerciseId.value && ex.value.length) exerciseId.value = ex.value[0].id
  if (!rm.exercise_id && ex.value.length) rm.exercise_id = ex.value[0].id
}

async function addItem () {
  if (isLocked.value) return
  await http.post(`/workouts/${id}/exercises`, {
    exercise_id: exerciseId.value,
    planned_sets: planned_sets.value,
    planned_reps: planned_reps.value
  })
  await load()
}

async function addSet (itemId) {
  const s = newSet[itemId]
  await http.post(`/workouts/exercise-items/${itemId}/sets`, s)
  await load()
}

async function lockExercise (it) {
  await http.put(`/workouts/${id}/exercises/${it.id}/lock`)
  it.locked = 1
  it.completed_at = new Date().toISOString()
}

async function lockWorkout () {
  await http.put(`/workouts/${id}/lock`)
  workout.value.is_locked = 1
}

async function save1RM () {
  if (!rm.exercise_id || !rm.weight) return
  await http.post('/records', rm)
  rm.note = ''
  alert('1RM spremljen')
}

function formatDate (d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('hr-HR')
}
function formatDateTime (d) {
  if (!d) return ''
  return new Date(d).toLocaleString('hr-HR')
}

onMounted(load)
</script>
