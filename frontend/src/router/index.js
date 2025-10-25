import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth'

// Views
import Dashboard from '../views/Dashboard.vue'
import Exercises from '../views/Exercises.vue'
import Workouts from '../views/Workouts.vue'
import WorkoutNew from '../views/NewWorkout.vue'
import WorkoutView from '../views/WorkoutView.vue'
import AdminExercises from '../views/AdminExercises.vue'
import Records from '../views/Records.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Profile from '../views/Profile.vue' // 👤 NOVO — profil korisnika

const routes = [
  // public
  { path: '/',              name: 'dashboard',       component: Dashboard },
  { path: '/exercises',     name: 'exercises',       component: Exercises },

  // private
  { path: '/workouts/new',  name: 'workout-new',     component: WorkoutNew,  meta: { requiresAuth: true } },
  { path: '/workouts',      name: 'workouts',        component: Workouts,    meta: { requiresAuth: true } },
  { path: '/workouts/:id',  name: 'workout-view',    component: WorkoutView, props: true, meta: { requiresAuth: true } },
  { path: '/records',       name: 'records',         component: Records,     meta: { requiresAuth: true } },
  { path: '/profile',       name: 'profile',         component: Profile,     meta: { requiresAuth: true } }, // 👤 NOVO

  // admin
  {
    path: '/admin/exercises',
    name: 'admin-exercises',
    component: AdminExercises,
    meta: { requiresAuth: true, requiresAdmin: true }
  },

  // auth
  { path: '/login',         name: 'login',           component: Login },
  { path: '/register',      name: 'register',        component: Register },

  // fallback
  { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior () {
    // vraća prikaz na vrh kad se promijeni stranica
    return { top: 0 }
  }
})

// global guard
router.beforeEach((to) => {
  const auth = useAuth()

  // ako ruta traži login, a korisnik nije prijavljen
  if (to.meta.requiresAuth && !auth.isAuthed) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // ako ruta traži admina, a korisnik nije admin
  if (to.meta.requiresAdmin && auth.user?.role !== 'ADMIN') {
    return { name: 'dashboard' }
  }

  // ako je već prijavljen, a ide na login ili register
  if (auth.isAuthed && (to.name === 'login' || to.name === 'register')) {
    return { name: 'dashboard' }
  }

  return true
})

// log svih grešaka pri navigaciji
router.onError((err) => {
  console.error('[router error]', err)
})

export default router
