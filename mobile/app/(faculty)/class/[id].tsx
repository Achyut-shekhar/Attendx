import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert, RefreshControl, Animated, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import * as Location from 'expo-location';

interface ClassDetails {
  class_id: number;
  class_name: string;
  join_code: string;
  faculty_name: string;
}

interface Session {
  session_id: number;
  class_id: number;
  generated_code: string;
  start_time: string;
  status: 'ACTIVE' | 'CLOSED';
}

interface Student {
  user_id: number;
  name: string;
  email: string;
  roll_number: string;
  section: string;
}

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const navigation = useNavigation();
  const classId = Number(id);

  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: classDetails ? classDetails.class_name : 'Class Details',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  }, [classDetails, navigation]);

  // Start Session Modal States
  const [startSessionVisible, setStartSessionVisible] = useState(false);
  const [useLocation, setUseLocation] = useState(false);
  const [customRadius, setCustomRadius] = useState('500');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState(false);

  // Pulse animation for the live code badge
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (activeSession) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeSession]);

  const fetchData = useCallback(async () => {
    try {
      const [detailsRes, studentsRes, sessionRes] = await Promise.allSettled([
        api.get(`/api/faculty/classes/${classId}/details`),
        api.get(`/api/faculty/classes/${classId}/students`),
        api.get(`/api/faculty/sessions/active?faculty_id=${user?.user_id}`),
      ]);

      if (detailsRes.status === 'fulfilled') setClassDetails(detailsRes.value.data);
      if (studentsRes.status === 'fulfilled') setStudents(studentsRes.value.data);
      if (sessionRes.status === 'fulfilled') {
        const allActive: Session[] = sessionRes.value.data;
        const mine = allActive.find((s) => s.class_id === classId) || null;
        setActiveSession(mine);
      }
    } catch (e) {
      console.error('[ClassDetail]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, user]);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Location Session Handlers
  const handleOpenStartSession = () => {
    setUseLocation(false);
    setCustomRadius('500');
    setLocationData(null);
    setLocationError(null);
    setStartSessionVisible(true);
  };

  const toggleLocationGps = async (val: boolean) => {
    setUseLocation(val);
    if (val) {
      setFetchingLocation(true);
      setLocationError(null);
      setLocationData(null);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location access was denied');
          setUseLocation(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocationData({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        });
      } catch (err: any) {
        setLocationError(err?.message || 'Failed to capture GPS coordinates');
        setUseLocation(false);
      } finally {
        setFetchingLocation(false);
      }
    } else {
      setLocationData(null);
      setLocationError(null);
    }
  };

  const proceedWithSessionStart = async () => {
    let rad = 500;
    if (useLocation) {
      rad = parseInt(customRadius, 10);
      if (isNaN(rad) || rad < 0 || rad > 1000) {
        Alert.alert('Validation Error', 'Radius must be between 0 and 1000 meters.');
        return;
      }
      if (!locationData) {
        Alert.alert('Error', 'GPS location not captured yet.');
        return;
      }
    }

    setStartingSession(true);
    try {
      const res = await api.post(`/api/faculty/classes/${classId}/sessions`, {
        class_id: classId,
        latitude: useLocation && locationData ? locationData.latitude : null,
        longitude: useLocation && locationData ? locationData.longitude : null,
        radius_meters: useLocation ? rad : 50, // Default 50 if no location
      });
      
      setActiveSession(res.data);
      setStartSessionVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not start session.');
    } finally {
      setStartingSession(false);
    }
  };

  const handleEndSession = () => {
    if (!activeSession) return;
    Alert.alert(
      'End Session',
      'This will close the session and mark all absent students. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.put(
                `/api/faculty/classes/${classId}/sessions/${activeSession.session_id}/end`
              );
              // Navigate to the session attendance view
              router.push(`/(faculty)/session/${activeSession.session_id}`);
              setActiveSession(null);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.detail || 'Could not end session.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D6AE0" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D6AE0']} />}
      >
        {/* Class Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="book" size={28} color="#2D6AE0" />
          </View>
          <Text style={styles.headerTitle}>{classDetails?.class_name}</Text>
          <View style={styles.joinCodeRow}>
            <Text style={styles.joinCodeLabel}>Join Code  </Text>
            <View style={styles.joinCodeBadge}>
              <Text style={styles.joinCodeValue}>{classDetails?.join_code}</Text>
            </View>
          </View>
          <Text style={styles.studentCount}>
            {students.length} {students.length === 1 ? 'student' : 'students'} enrolled
          </Text>
        </View>

        {/* ─── ACTIVE SESSION PANEL ─── */}
        {activeSession ? (
          <View style={styles.activeSessionCard}>
            {/* Live indicator */}
            <View style={styles.liveDotRow}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveLabel}>SESSION LIVE</Text>
              <Text style={styles.startedAt}>  ·  Started {formatTime(activeSession.start_time)}</Text>
            </View>

            {/* Generated code */}
            <Text style={styles.codeHeading}>Attendance Code</Text>
            <View style={styles.codeBig}>
              {activeSession.generated_code.split('').map((char, i) => (
                <View key={i} style={styles.codeCharBox}>
                  <Text style={styles.codeChar}>{char}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.codeHint}>Share this code with students in the room</Text>

            {/* View attendance + End session */}
            <TouchableOpacity
              style={styles.viewAttBtn}
              onPress={() => router.push(`/(faculty)/session/${activeSession.session_id}`)}
            >
              <Ionicons name="people-outline" size={18} color="#2D6AE0" />
              <Text style={styles.viewAttText}>  View Live Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.endBtn, actionLoading && { opacity: 0.7 }]}
              onPress={handleEndSession}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="stop-circle-outline" size={20} color="#fff" />
                  <Text style={styles.endBtnText}>  End Session</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ─── NO ACTIVE SESSION ─── */
          <View style={styles.noSessionCard}>
            <Ionicons name="radio-button-off-outline" size={40} color="#C5CEE0" />
            <Text style={styles.noSessionTitle}>No Active Session</Text>
            <Text style={styles.noSessionText}>
              Start a session to generate a code students can use to mark attendance.
            </Text>
            <TouchableOpacity
              style={[styles.startBtn, actionLoading && { opacity: 0.7 }]}
              onPress={handleOpenStartSession}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play-circle-outline" size={20} color="#fff" />
                  <Text style={styles.startBtnText}>  Start Session</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── ENROLLED STUDENTS ─── */}
        <Text style={styles.sectionTitle}>Enrolled Students</Text>
        {students.length === 0 ? (
          <View style={styles.emptyStudents}>
            <Ionicons name="person-add-outline" size={36} color="#C5CEE0" />
            <Text style={styles.emptyStudentsText}>No students enrolled yet.</Text>
            <Text style={styles.emptyStudentsText}>Share the join code above!</Text>
          </View>
        ) : (
          students.map((s, idx) => (
            <View key={s.user_id} style={styles.studentRow}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>{s.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentMeta}>{s.roll_number || 'No roll number'}  ·  {s.section || 'N/A'}</Text>
              </View>
              <Text style={styles.studentIdx}>#{idx + 1}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Start Session Modal */}
      <Modal visible={startSessionVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Start Attendance Session</Text>
            <Text style={styles.modalSubtitle}>
              Configure details for "{classDetails?.class_name}".
            </Text>

            {/* GPS verification toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => toggleLocationGps(!useLocation)}
            >
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleLabel}>GPS Location Verification</Text>
                <Text style={styles.toggleDesc}>Students must be physically in the classroom to check-in.</Text>
              </View>
              <Ionicons
                name={useLocation ? "checkbox" : "square-outline"}
                size={24}
                color={useLocation ? "#2D6AE0" : "#8F9BB3"}
              />
            </TouchableOpacity>

            {useLocation && (
              <View style={styles.gpsConfigWrap}>
                {fetchingLocation ? (
                  <View style={styles.gpsLoading}>
                    <ActivityIndicator size="small" color="#2D6AE0" />
                    <Text style={styles.gpsLoadingText}> Capturing current GPS location...</Text>
                  </View>
                ) : locationError ? (
                  <View style={[styles.gpsBanner, styles.gpsBannerError]}>
                    <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                    <Text style={styles.gpsBannerTextError}> {locationError}</Text>
                  </View>
                ) : locationData ? (
                  <View style={[styles.gpsBanner, styles.gpsBannerSuccess]}>
                    <Ionicons name="checkmark-circle" size={16} color="#00B388" />
                    <Text style={styles.gpsBannerTextSuccess}>
                      {` GPS captured (±${locationData.accuracy ? Math.round(locationData.accuracy) : '?'}m accuracy)`}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Allowed Radius (meters, 0-1000)</Text>
                <View style={styles.radiusInputRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                    keyboardType="number-pad"
                    value={customRadius}
                    onChangeText={setCustomRadius}
                    placeholder="Radius in meters"
                  />
                  <Text style={styles.radiusUnitText}> meters</Text>
                </View>
                <Text style={styles.inputHint}>Recommended: 50m to 200m. 0m means strict accuracy bound.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalConfirmBtn, startingSession && { opacity: 0.7 }]}
              onPress={proceedWithSessionStart}
              disabled={startingSession || (useLocation && !locationData)}
            >
              {startingSession ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalConfirmBtnText}>Start Session</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setStartSessionVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F9' },
  content: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F5F9' },

  // Header card
  headerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 22,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  headerIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#EAF0FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#222B45', textAlign: 'center', marginBottom: 12 },
  joinCodeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  joinCodeLabel: { fontSize: 14, color: '#8F9BB3' },
  joinCodeBadge: {
    backgroundColor: '#EAF0FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  joinCodeValue: { fontSize: 16, fontWeight: '800', color: '#2D6AE0', letterSpacing: 2 },
  studentCount: { fontSize: 13, color: '#8F9BB3', fontWeight: '500' },

  // Active session
  activeSessionCard: {
    backgroundColor: '#1A3A6B', borderRadius: 20, padding: 22,
    marginBottom: 16, alignItems: 'center',
    shadowColor: '#2D6AE0', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 18, elevation: 8,
  },
  liveDotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CD964' },
  liveLabel: { fontSize: 12, fontWeight: '800', color: '#4CD964', letterSpacing: 2, marginLeft: 8 },
  startedAt: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  codeHeading: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 14, letterSpacing: 1 },
  codeBig: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  codeCharBox: {
    width: 40, height: 52, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  codeChar: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0 },
  codeHint: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 22 },
  viewAttBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 12,
    width: '100%', justifyContent: 'center',
  },
  viewAttText: { color: '#A8C4FF', fontWeight: '700', fontSize: 14 },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF3B30', borderRadius: 14,
    paddingVertical: 14, width: '100%',
  },
  endBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // No active session
  noSessionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 28,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  noSessionTitle: { fontSize: 18, fontWeight: '700', color: '#222B45', marginTop: 12, marginBottom: 8 },
  noSessionText: { fontSize: 14, color: '#8F9BB3', textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2D6AE0', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 36,
    shadowColor: '#2D6AE0', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  startBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Students
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#222B45', marginBottom: 12 },
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  studentAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#EAF0FF', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  studentAvatarText: { fontSize: 17, fontWeight: '800', color: '#2D6AE0' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#222B45', marginBottom: 2 },
  studentMeta: { fontSize: 12, color: '#8F9BB3' },
  studentIdx: { fontSize: 13, color: '#C5CEE0', fontWeight: '600' },
  emptyStudents: { alignItems: 'center', paddingVertical: 30 },
  emptyStudentsText: { fontSize: 14, color: '#8F9BB3', marginTop: 8 },

  // Start Session Modal styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#222B45', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#8F9BB3', marginBottom: 20, lineHeight: 20 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E4E9F2', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#222B45', marginBottom: 16,
  },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#222B45', marginBottom: 8 },
  inputHint: { fontSize: 12, color: '#8F9BB3', marginTop: -10, marginBottom: 14 },
  modalConfirmBtn: {
    backgroundColor: '#2D6AE0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  modalConfirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: '#8F9BB3', fontSize: 15 },

  // GPS styles
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  toggleTextWrap: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: '#222B45', marginBottom: 4 },
  toggleDesc: { fontSize: 12, color: '#8F9BB3', lineHeight: 16 },
  gpsConfigWrap: { marginBottom: 16 },
  gpsLoading: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  gpsLoadingText: { fontSize: 13, color: '#2D6AE0', fontWeight: '500' },
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
  },
  gpsBannerSuccess: {
    backgroundColor: '#E6FBFA',
    borderColor: '#00D09E',
  },
  gpsBannerError: {
    backgroundColor: '#FFEAEA',
    borderColor: '#FF3B30',
  },
  gpsBannerTextSuccess: { color: '#00B388', fontSize: 13, fontWeight: '500' },
  gpsBannerTextError: { color: '#FF3B30', fontSize: 13, fontWeight: '500' },
  radiusInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusUnitText: { fontSize: 15, color: '#222B45', fontWeight: '600' },
});
