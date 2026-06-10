import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  user_id: number;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isDeviceRegistered: boolean;
  setUser: (user: User | null, registered?: boolean) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isDeviceRegistered: false,
  setUser: (user, registered = true) => set({ user, isDeviceRegistered: registered }),
  logout: async () => {
    // Delete access_token, but LEAVE is_device_registered and locked_user_email intact in production
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('user_data');
    if (__DEV__) {
      await SecureStore.deleteItemAsync('is_device_registered');
      await SecureStore.deleteItemAsync('locked_user_email');
      set({ user: null, isDeviceRegistered: false });
    } else {
      set({ user: null });
    }
  },
  checkAuth: async () => {
    console.log('[checkAuth] Starting checkAuth...');
    try {
      console.log('[checkAuth] Reading access_token...');
      // Try reading token normally first (tokens saved by new code).
      let token = await SecureStore.getItemAsync('access_token');
      console.log('[checkAuth] access_token result:', token ? 'exists' : 'null');

      // If null, the token may have been saved with { requireAuthentication: true }
      // by old code. Try reading it WITH biometric to migrate it.
      if (!token) {
        try {
          console.log('[checkAuth] Token null, trying requireAuthentication path...');
          token = await SecureStore.getItemAsync('access_token', { requireAuthentication: true });
          console.log('[checkAuth] Legacy token read:', token ? 'exists' : 'null');
          if (token) {
            // Re-save without requireAuthentication so the api.ts interceptor can
            // read it freely without triggering a biometric prompt per-request.
            await SecureStore.setItemAsync('access_token', token);
            console.log('[checkAuth] Migrated legacy requireAuthentication token.');
          }
        } catch (_) {
          console.log('[checkAuth] Failed to migrate requireAuthentication token:', _);
          // Biometric cancelled or failed during migration — treat as logged out.
          token = null;
        }
      }

      console.log('[checkAuth] Reading user_data and is_device_registered...');
      const userDataStr = await SecureStore.getItemAsync('user_data');
      const isRegistered = await SecureStore.getItemAsync('is_device_registered');
      console.log('[checkAuth] user_data exists:', !!userDataStr, 'isRegistered:', isRegistered);

      if (token && userDataStr) {
        const userData = JSON.parse(userDataStr);

        if (isRegistered === 'true') {
          console.log('[checkAuth] Device is registered, requiring local auth...');
          // Device is registered — explicitly gate app entry with biometric
          const LocalAuthentication = require('expo-local-authentication');
          console.log('[checkAuth] Checking hardware/enrollment...');
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          console.log('[checkAuth] hasHardware:', hasHardware, 'isEnrolled:', isEnrolled);

          if (hasHardware && isEnrolled) {
            console.log('[checkAuth] Authenticating...');
            const authResult = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Verify your identity to unlock AttendX',
              fallbackLabel: 'Use Passcode',
              cancelLabel: 'Cancel',
              disableDeviceFallback: false,
            });
            console.log('[checkAuth] Auth result success:', authResult.success);

            if (!authResult.success) {
              console.log('[checkAuth] Auth failed, setting user to null');
              set({ user: null, isLoading: false, isDeviceRegistered: false });
              return;
            }
          }

          // Biometric passed
          console.log('[checkAuth] Local auth passed or not available, logged in as:', userData.email);
          set({ user: userData, isLoading: false, isDeviceRegistered: true });
        } else {
          // Has token but device not registered yet — send to setup
          console.log('[checkAuth] Logged in but device not registered, going to setup. Email:', userData.email);
          set({ user: userData, isLoading: false, isDeviceRegistered: false });
        }
      } else {
        console.log('[checkAuth] No valid token or user data found, logging out');
        set({ user: null, isLoading: false, isDeviceRegistered: false });
      }
    } catch (e) {
      console.error('[checkAuth] error:', e);
      set({ user: null, isLoading: false, isDeviceRegistered: false });
    }
  },
}));
