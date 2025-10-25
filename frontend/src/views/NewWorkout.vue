<template>
  <div class="max-w-xl">
    <h1 class="text-2xl font-bold mb-4">Novi trening</h1>

    <div class="bg-white border rounded-2xl p-4 space-y-3">
      <div>
        <label class="block text-sm text-gray-600 mb-1">Naziv</label>
        <input v-model="form.title" type="text" class="border rounded-xl px-3 py-2 w-full" placeholder="npr. Trening 1" />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Datum</label>
        <input v-model="form.workout_date" type="date" :min="today" class="border rounded-xl px-3 py-2" />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Bilješke</label>
        <textarea v-model="form.notes" rows="3" class="border rounded-xl px-3 py-2 w-full"></textarea>
      </div>

      <div class="pt-2">
        <button @click="create" class="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700">
          Kreiraj
        </button>
      </div>

      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../api/http'

const router = useRouter()
const today = new Date().toISOString().slice(0,10)

const form = ref({
  title: '',
  workout_date: today,
  notes: ''
})

const error = ref('')

async function create () {
  error.value = ''

  // client-side zaštita: bez prošlih datuma
  const d = new Date(form.value.workout_date)
  const now = new Date()
  d.setHours(0,0,0,0); now.setHours(0,0,0,0)
  if (d < now) {
    error.value = 'Ne možeš kreirati trening u prošlosti'
    return
  }

  try {
    const { data } = await http.post('/workouts', form.value)
    router.push(`/workouts/${data.id}`)
  } catch (e) {
    error.value = e?.response?.data?.message || 'Greška pri kreiranju'
  }
}
</script>
