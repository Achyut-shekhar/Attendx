import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── REQUEST INTERCEPTOR ──────────────────────────────────────────────────────
// Attach JWT token to every request. Wrapped in try/catch so a corrupt or
// biometric-locked token doesn't crash the entire request pipeline.
api.interceptors.request.use(
  async (config) => {
    try {
      // Always read WITHOUT requireAuthentication — biometric gate is at app-open only.
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // If SecureStore throws (e.g. old token stored with requireAuthentication
      // that is now being read without it), ignore and send request unauthenticated.
      // checkAuth / the 401 handler below will force re-login if needed.
      console.warn('[api] Could not read token from SecureStore:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────────────────────
// Catch 401 Unauthorized globally. This handles expired tokens without needing
// try/catch in every screen component.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      // Token is expired or invalid — clear it so checkAuth sends user to login.
      try {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('user_data');
      } catch (_) {}
      // The authStore will detect the missing token on next checkAuth / app focus.
    }
    return Promise.reject(error);
  }
);
