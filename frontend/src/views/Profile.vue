<!-- frontend/src/views/Profile.vue -->
<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-bold">Moj profil</h1>

    <!-- Osnovni podaci -->
    <div class="bg-white border rounded-2xl p-6 max-w-2xl">
      <h2 class="font-semibold text-lg mb-4">Osnovni podaci</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Korisničko ime</label>
          <input
            v-model="form.username"
            type="text"
            class="w-full border rounded-xl px-3 py-2"
            placeholder="Ime"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-600 mb-1">Email</label>
          <input
            v-model="form.email"
            type="email"
            class="w-full border rounded-xl px-3 py-2"
            placeholder="email@example.com"
          />
        </div>

        <div class="pt-2 flex items-center gap-3">
          <button
            @click="saveProfile"
            :disabled="savingProfile"
            class="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            💾 Spremi promjene
          </button>
          <span v-if="profileSaved" class="text-green-600">Spremljeno.</span>
          <span v-if="profileError" class="text-red-600">{{ profileError }}</span>
        </div>
      </div>
    </div>

    <!-- Promjena lozinke -->
    <div class="bg-white border rounded-2xl p-6 max-w-2xl">
      <h2 class="font-semibold text-lg mb-4">Promjena lozinke</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Trenutna lozinka</label>
          <input
            v-model="pwd.current_password"
            type="password"
            class="w-full border rounded-xl px-3 py-2"
            placeholder="••••••••"
            autocomplete="current-password"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-600 mb-1">Nova lozinka</label>
          <input
            v-model="pwd.new_password"
            type="password"
            class="w-full border rounded-xl px-3 py-2"
            placeholder="najmanje 6 znakova"
            autocomplete="new-password"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-600 mb-1">Potvrdi novu lozinku</label>
          <input
            v-model="pwd.confirm"
            type="password"
            class="w-full border rounded-xl px-3 py-2"
            placeholder="ponovno nova lozinka"
            autocomplete="new-password"
          />
          <p v-if="pwdMismatch" class="text-sm text-red-600 mt-1">Lozinke se ne podudaraju.</p>
          <p v-if="pwdTooShort" class="text-sm text-red-600 mt-1">Lozinka mora imati barem 6 znakova.</p>
        </div>

        <div class="pt-2 flex items-center gap-3">
          <button
            @click="changePassword"
            :disabled="savingPwd || !canSubmitPwd"
            class="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            🔒 Promijeni lozinku
          </button>
          <span v-if="pwdSaved" class="text-green-600">Lozinka promijenjena.</span>
          <span v-if="pwdError" class="text-red-600">{{ pwdError }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import http from '../api/http'
import { useAuth } from '../stores/auth'

const auth = useAuth()

/* ---------- Profil (ime + email) ---------- */
const form = ref({ username: '', email: '' })
const savingProfile = ref(false)
const profileSaved = ref(false)
const profileError = ref('')

onMounted(loadProfile)

async function loadProfile () {
  profileSaved.value = false
  profileError.value = ''
  const { data } = await http.get('/users/me')
  form.value.username = data.username || ''
  form.value.email = data.email || ''
}

async function saveProfile () {
  savingProfile.value = true
  profileSaved.value = false
  profileError.value = ''
  try {
    const { data } = await http.put('/users/me', {
      username: form.value.username,
      email: form.value.email
    })
    // osvježi auth store (ime u headeru)
    auth.user = { ...(auth.user || {}), ...data }
    profileSaved.value = true
  } catch (e) {
    profileError.value = e?.response?.data?.message || 'Greška pri spremanju'
  } finally {
    savingProfile.value = false
  }
}

/* ---------- Promjena lozinke ---------- */
const pwd = ref({
  current_password: '',
  new_password: '',
  confirm: ''
})
const savingPwd = ref(false)
const pwdSaved = ref(false)
const pwdError = ref('')

const pwdMismatch = computed(() =>
  pwd.value.new_password && pwd.value.confirm && pwd.value.new_password !== pwd.value.confirm
)
const pwdTooShort = computed(() =>
  pwd.value.new_password && String(pwd.value.new_password).length < 6
)
const canSubmitPwd = computed(() =>
  pwd.value.current_password &&
  pwd.value.new_password &&
  !pwdMismatch.value &&
  !pwdTooShort.value
)

async function changePassword () {
  if (!canSubmitPwd.value) return
  savingPwd.value = true
  pwdSaved.value = false
  pwdError.value = ''
  try {
    await http.put('/users/me/password', {
      current_password: pwd.value.current_password,
      new_password: pwd.value.new_password
    })
    pwdSaved.value = true
    // reset polja
    pwd.value.current_password = ''
    pwd.value.new_password = ''
    pwd.value.confirm = ''
  } catch (e) {
    pwdError.value = e?.response?.data?.message || 'Greška pri promjeni lozinke'
  } finally {
    savingPwd.value = false
  }
}
</script>
