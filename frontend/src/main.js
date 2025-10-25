// frontend/src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router/index.js';
import App from './App.vue';
import './assets/tailwind.css';

const app = createApp(App);

// Globalni error & warn log (jako korisno kad “ne mijenja view”)
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err, info, instance);
};
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('[Vue Warn]', msg, instance, trace);
};

app.use(createPinia());
app.use(router);

// ✅ Mount tek kad je router spreman
router.isReady().then(() => {
  app.mount('#app');
}).catch((e) => {
  console.error('Router init error:', e);
});
