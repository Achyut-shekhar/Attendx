import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert, RefreshControl, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

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
  const classId = Number(id);

  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleStartSession = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/api/faculty/classes/${classId}/sessions`, {
        class_id: classId,
        latitude: null,
        longitude: null,
        radius_meters: 50,
      });
      setActiveSession(res.data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not start session.');
    } finally {
      setActionLoading(false);
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
            onPress={handleStartSession}
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
});
