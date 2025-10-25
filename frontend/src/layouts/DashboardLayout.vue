<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside class="w-64 bg-white shadow-sm border-r">
      <div class="p-6 text-xl font-bold text-blue-700">🏋️ Fitness Tracker</div>

      <nav class="flex flex-col space-y-2 px-4">
        <RouterLink to="/" class="nav-link">📊 Dashboard</RouterLink>
        <RouterLink to="/exercises" class="nav-link">💪 Vježbe</RouterLink>

        <template v-if="auth.isAuthed">
          <RouterLink to="/workouts" class="nav-link">📅 Treninzi</RouterLink>
          <RouterLink to="/workouts/new" class="nav-link">➕ Novi trening</RouterLink>
          <RouterLink to="/records" class="nav-link">🏆 Rekordi</RouterLink>
          <RouterLink to="/profile" class="nav-link">👤 Profil</RouterLink>

          <RouterLink
            v-if="auth.user?.role === 'ADMIN'"
            to="/admin/exercises"
            class="nav-link"
          >
            🛠️ Admin Panel
          </RouterLink>

          <button @click="onLogout" class="nav-link text-red-600 hover:bg-red-50">
            🚪 Odjava
          </button>
        </template>

        <template v-else>
          <RouterLink to="/login" class="nav-link">🔐 Prijava</RouterLink>
          <RouterLink to="/register" class="nav-link">🧾 Registracija</RouterLink>
        </template>
      </nav>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col">
      <header class="h-16 bg-white border-b shadow-sm flex items-center justify-between px-6">
        <div class="text-gray-600">
          <template v-if="auth.isAuthed">Dobrodošao 👋</template>
          <template v-else>Dobrodošao gostu 👋</template>
        </div>

        <div class="flex items-center gap-3">
          <template v-if="auth.isAuthed">
            <span class="font-semibold text-gray-700">{{ displayName }}</span>
          </template>
          <img :src="avatarSrc" :key="avatarSrc" alt="avatar" class="w-9 h-9 rounded-full border" />
        </div>
      </header>

      <main class="p-6 flex-1 overflow-y-auto max-w-6xl">
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="$route.fullPath" />
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { RouterLink, useRouter } from 'vue-router';
import { computed } from 'vue';
import { useAuth } from '../stores/auth';

const auth = useAuth();
const router = useRouter();

function onLogout() {
  auth.logout();
  router.push('/login');
}

const displayName = computed(() =>
  auth.user?.username || auth.user?.email || 'Korisnik'
);

const avatarSrc = computed(() => {
  if (auth.user?.avatar) {
    return auth.user.avatar.startsWith('/uploads')
      ? `http://localhost:4000${auth.user.avatar}`
      : auth.user.avatar;
  }
  const name = displayName.value;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
});
</script>

<style scoped>
.nav-link { @apply px-4 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition; }
.router-link-active { @apply bg-blue-100 text-blue-700; }
</style>
