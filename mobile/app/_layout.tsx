import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const { user, isLoading, isDeviceRegistered, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user) {
      if (!isDeviceRegistered) {
        if (!segments.includes('setup-device')) {
          router.replace('/(auth)/setup-device');
        }
      } else {
        // Redirect to correct dashboard if authenticated and registered, and not already there
        const inStudentGroup = segments[0] === '(student)';
        const inFacultyGroup = segments[0] === '(faculty)';

        if (user.role === 'STUDENT' && !inStudentGroup) {
          router.replace('/(student)/dashboard');
        } else if (user.role === 'FACULTY' && !inFacultyGroup) {
          router.replace('/(faculty)/dashboard');
        }
      }
    }
  }, [user, isLoading, isDeviceRegistered, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="(faculty)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
  },
});
