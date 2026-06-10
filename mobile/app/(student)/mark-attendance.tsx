import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';

export default function MarkAttendanceScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepText, setStepText] = useState('');
  const { user } = useAuthStore();

  const handleAttendanceSubmit = async () => {
    if (!code || code.length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid attendance code.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Verify GPS Location
      setStepText('Verifying location...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to mark attendance.');
        setLoading(false);
        return;
      }

      // get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Step 2: Verify Biometrics
      setStepText('Verifying biometrics...');
      let biometric_verified = false;
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const bioResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify to mark attendance',
          fallbackLabel: 'Use Passcode',
        });

        if (!bioResult.success) {
          Alert.alert('Verification Failed', 'Biometric verification is required to mark attendance.');
          setLoading(false);
          return;
        }
        biometric_verified = true;
      } else {
        Alert.alert('Warning', 'Biometrics are not set up on this device. Your attendance will be marked as unverified.');
      }

      // Step 3: Submit to Backend
      setStepText('Submitting...');
      const payload = {
        student_id: user?.user_id,
        code: code.trim().toUpperCase(),
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        biometric_verified,
      };

      const response = await api.post('/attendance/submit-code', payload);

      const resData = response.data;
      if (resData.status === 'PRESENT') {
        Alert.alert('Success', `Attendance marked successfully! Distance: ${resData.distance}m`);
        setCode('');
      } else {
        Alert.alert('Marked as Absent', resData.message || 'You were marked absent, possibly due to being out of range.');
      }

    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || 'Failed to submit attendance.';
      Alert.alert('Error', detail);
    } finally {
      setLoading(false);
      setStepText('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="scan-circle" size={80} color="#6C63FF" />
        </View>
        <Text style={styles.title}>Mark Attendance</Text>
        <Text style={styles.subtitle}>Enter the code provided by your professor. Location and biometrics will be verified.</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="ENTER CODE"
            placeholderTextColor="#8F9BB3"
            autoCapitalize="characters"
            maxLength={10}
            value={code}
            onChangeText={setCode}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleAttendanceSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" style={{ marginRight: 10 }} />
              <Text style={styles.submitButtonText}>{stepText}</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Attendance</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 20,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#222B45',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#8F9BB3',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E4E9F2',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  input: {
    height: 70,
    fontSize: 28,
    fontWeight: '700',
    color: '#222B45',
    textAlign: 'center',
    letterSpacing: 4,
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9A94FF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
