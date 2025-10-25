<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Moji treninzi</h1>

    <router-link
      to="/workouts/new"
      class="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700"
    >
      ➕ Novi trening
    </router-link>

    <ul class="space-y-3 mt-4">
      <li
        v-for="w in workouts"
        :key="w.id"
        class="bg-white border rounded-2xl p-4 hover:shadow"
      >
        <router-link :to="`/workouts/${w.id}`" class="flex justify-between gap-4">
          <div>
            <div class="font-semibold flex items-center gap-2">
              {{ w.title }}
              <span
                v-if="Number(w.is_locked) === 1"
                class="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5"
              >🔒 zaključan</span>
            </div>
            <div class="text-sm text-gray-500" v-if="w.body_parts_summary">
              ({{ w.body_parts_summary }})
            </div>
          </div>

          <div class="text-gray-600 whitespace-nowrap">
            {{ formatDate(w.workout_date) }}
          </div>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import http from '../api/http'

const workouts = ref([])

async function load () {
  try {
    const { data } = await http.get('/workouts')
    workouts.value = data
  } catch (e) {
    workouts.value = []
  }
}

/** Prikaži npr. "23. 10. 2025. (Četvrtak)" */
function formatDate (dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const dayName = d.toLocaleDateString('hr-HR', { weekday: 'long' })
  const dateOnly = d.toLocaleDateString('hr-HR') // samo datum, bez vremena
  // veliko prvo slovo dana
  const prettyDay = dayName ? dayName.charAt(0).toUpperCase() + dayName.slice(1) : ''
  return `${dateOnly} (${prettyDay})`
}

onMounted(load)
</script>
