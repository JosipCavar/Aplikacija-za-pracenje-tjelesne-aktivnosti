import { defineStore } from 'pinia';
import http from '../api/http';

export const useAuth = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
  }),
  getters: {
    isAuthed: (s) => !!s.token,
  },
  actions: {
    async login(email, password) {
      const { data } = await http.post('/auth/login', { email, password });
      this.user = data.user;
      this.token = data.token;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    },
    async register(payload) {
      await http.post('/auth/register', payload);
    },
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
