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
    // Delete access_token, but LEAVE is_device_registered and locked_user_email intact
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('user_data');
    set({ user: null });
  },
  checkAuth: async () => {
    try {
      // Try reading token normally first (tokens saved by new code).
      let token = await SecureStore.getItemAsync('access_token');

      // If null, the token may have been saved with { requireAuthentication: true }
      // by old code. Try reading it WITH biometric to migrate it.
      if (!token) {
        try {
          token = await SecureStore.getItemAsync('access_token', { requireAuthentication: true });
          if (token) {
            // Re-save without requireAuthentication so the api.ts interceptor can
            // read it freely without triggering a biometric prompt per-request.
            await SecureStore.setItemAsync('access_token', token);
            console.log('[checkAuth] Migrated legacy requireAuthentication token.');
          }
        } catch (_) {
          // Biometric cancelled or failed during migration — treat as logged out.
          token = null;
        }
      }

      const userDataStr = await SecureStore.getItemAsync('user_data');
      const isRegistered = await SecureStore.getItemAsync('is_device_registered');

      if (token && userDataStr) {
        const userData = JSON.parse(userDataStr);

        if (isRegistered === 'true') {
          // Device is registered — explicitly gate app entry with biometric
          const LocalAuthentication = require('expo-local-authentication');
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();

          if (hasHardware && isEnrolled) {
            const authResult = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Verify your identity to unlock AttendX',
              fallbackLabel: 'Use Passcode',
              cancelLabel: 'Cancel',
              disableDeviceFallback: false,
            });

            if (!authResult.success) {
              set({ user: null, isLoading: false, isDeviceRegistered: false });
              return;
            }
          }

          // Biometric passed
          set({ user: userData, isLoading: false, isDeviceRegistered: true });
        } else {
          // Has token but device not registered yet — send to setup
          set({ user: userData, isLoading: false, isDeviceRegistered: false });
        }
      } else {
        set({ user: null, isLoading: false, isDeviceRegistered: false });
      }
    } catch (e) {
      console.error('[checkAuth] error:', e);
      set({ user: null, isLoading: false, isDeviceRegistered: false });
    }
  },
}));
