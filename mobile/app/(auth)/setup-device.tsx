import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { StatusBar } from 'expo-status-bar';

export default function SetupDeviceScreen() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const { user, setUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware && isEnrolled);
    setChecking(false);
  };

  const handleSetup = async () => {
    setLoading(true);
    try {
      let biometricEnrolled = false;

      // 1. Verify Biometric strictly
      if (!biometricAvailable) {
        Alert.alert('Security Requirement', 'You must set up Face ID or Touch ID in your phone settings to use AttendX.');
        setLoading(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to permanently link this device',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });
      if (!result.success) {
        setLoading(false);
        return;
      }
      biometricEnrolled = true;

      // 2. Generate or fetch unique device ID
      let deviceId = await SecureStore.getItemAsync('device_id');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await SecureStore.setItemAsync('device_id', deviceId);
      }

      // 3. Register device with backend
      await api.post('/auth/register-device', {
        device_id: deviceId,
        platform: Platform.OS,
        biometric_enrolled: biometricEnrolled,
        expo_push_token: null // Push notifications will be Phase 5
      });

      // 4. Update SecureStore and state to mark device as registered and locked
      await SecureStore.setItemAsync('is_device_registered', 'true');
      await SecureStore.setItemAsync('locked_user_email', user?.email || '');
      await SecureStore.setItemAsync('locked_user_id', user?.user_id?.toString() || '');

      // Setting user again with true triggers layout redirect to Dashboard
      setUser(user, true);

    } catch (error: any) {
      console.error(error);
      Alert.alert('Registration Failed', 'Could not link your device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="phone-portrait-outline" size={60} color="#6C63FF" />
        </View>
        <Text style={styles.title}>Secure Your Account</Text>
        <Text style={styles.subtitle}>
          Link this device to your AttendX account for secure, seamless attendance tracking.
        </Text>

        {biometricAvailable ? (
          <View style={styles.featureBox}>
            <Ionicons name="finger-print-outline" size={24} color="#00D09E" />
            <Text style={styles.featureText}>Biometrics will be enabled for faster logins and secure attendance marking.</Text>
          </View>
        ) : (
          <View style={[styles.featureBox, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' }]}>
            <Ionicons name="warning-outline" size={24} color="#F57C00" />
            <Text style={[styles.featureText, { color: '#F57C00' }]}>
              Biometrics not found or not set up on this device. Attendance will use standard verification.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.setupButton, !biometricAvailable && { backgroundColor: '#A0A0A0' }]}
          onPress={handleSetup}
          disabled={loading || !biometricAvailable}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.setupButtonText}>Link Device & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F9',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EAE9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#222B45',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8F9BB3',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  featureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FBFA',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00D09E',
  },
  featureText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 14,
    color: '#00B388',
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  setupButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
