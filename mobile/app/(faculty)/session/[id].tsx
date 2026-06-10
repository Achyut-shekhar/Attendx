import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, TextInput, Alert, Clipboard, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

interface AttendanceRecord {
  student_id: number;
  student_name: string;
  roll_number: string;
  section: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  marked_at: string | null;
  biometric_verified?: boolean;
}

export default function SessionAttendanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const { user } = useAuthStore();
  const router = useRouter();
  const navigation = useNavigation();

  const [session, setSession] = useState<any>(null);
  const [classDetails, setClassDetails] = useState<any>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'manual'>('code');
  const [searchQuery, setSearchQuery] = useState('');
  const [rowLoading, setRowLoading] = useState<Record<number, boolean>>({});
  const [endingSession, setEndingSession] = useState(false);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const sessionRes = await api.get(`/api/faculty/sessions/${sessionId}`);
      const sessionData = sessionRes.data;
      setSession(sessionData);

      if (sessionData.class_id) {
        const classRes = await api.get(`/api/faculty/classes/${sessionData.class_id}/details`);
        setClassDetails(classRes.data);
      }

      const attendanceRes = await api.get(`/api/faculty/sessions/${sessionId}/attendance/flat`);
      setRecords(attendanceRes.data);
    } catch (e) {
      console.error('[SessionAttendance] loadData error:', e);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (user) {
      loadData(true);
    }
  }, [loadData, user]);

  useEffect(() => {
    if (!user) return;
    if (session && session.status !== 'ACTIVE') return;

    const interval = setInterval(() => {
      loadData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [session, loadData, user]);

  useEffect(() => {
    navigation.setOptions({
      title: classDetails ? classDetails.class_name : 'Session Attendance',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  }, [classDetails, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  const handleCopyCode = () => {
    if (session?.generated_code) {
      Clipboard.setString(session.generated_code);
      Alert.alert('Success', 'Session code copied to clipboard!');
    }
  };

  const handleEndSession = () => {
    if (!session) return;
    Alert.alert(
      'End Session',
      `Are you sure you want to end the session for "${classDetails?.class_name || 'this class'}"? All unmarked students will be marked absent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            setEndingSession(true);
            try {
              await api.put(`/api/faculty/classes/${session.class_id}/sessions/${sessionId}/end`);
              Alert.alert('Success', 'Session ended successfully.');
              loadData(false);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.detail || 'Could not end session.');
            } finally {
              setEndingSession(false);
            }
          },
        },
      ]
    );
  };

  const toggleAttendance = async (studentId: number, currentStatus: string) => {
    if (rowLoading[studentId]) return;

    const nextStatus = (currentStatus === 'PRESENT' || currentStatus === 'LATE') ? 'ABSENT' : 'PRESENT';

    setRowLoading(prev => ({ ...prev, [studentId]: true }));
    try {
      await api.post(`/session/${sessionId}/attendance`, {
        session_id: sessionId,
        student_id: studentId,
        status: nextStatus,
      });

      setRecords(prev =>
        prev.map(r =>
          r.student_id === studentId
            ? { ...r, status: nextStatus, marked_at: nextStatus === 'PRESENT' ? new Date().toISOString() : null }
            : r
        )
      );
    } catch (err: any) {
      console.error('[toggleAttendance] Error:', err);
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to update attendance status.');
    } finally {
      setRowLoading(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.student_name && r.student_name.toLowerCase().includes(q)) ||
      (r.roll_number && r.roll_number.toLowerCase().includes(q)) ||
      (r.section && r.section.toLowerCase().includes(q))
    );
  });

  const presentCount = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const absentCount = records.filter(r => r.status === 'ABSENT').length;
  const lateCount = records.filter(r => r.status === 'LATE').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D6AE0" />
      </View>
    );
  }

  const renderCodeTab = () => {
    const code = session?.generated_code || "";
    const isClosed = session?.status === "CLOSED";

    return (
      <View style={{ flex: 1 }}>
        {/* Code display card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeTitle}>Session Attendance Code</Text>
          <View style={styles.codeRow}>
            {code ? (
              code.split('').map((char, index) => (
                <View key={index} style={[styles.codeBox, isClosed && styles.codeBoxClosed]}>
                  <Text style={[styles.codeChar, isClosed && styles.codeCharClosed]}>{char}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noCodeText}>No Code</Text>
            )}
          </View>
          
          <View style={styles.codeActions}>
            <TouchableOpacity
              style={[styles.codeBtn, styles.codeBtnOutline, isClosed && { opacity: 0.5 }]}
              onPress={handleCopyCode}
              disabled={isClosed}
            >
              <Ionicons name="copy-outline" size={18} color="#2D6AE0" />
              <Text style={styles.codeBtnTextOutline}> Copy Code</Text>
            </TouchableOpacity>

            {session?.status === 'ACTIVE' && (
              <TouchableOpacity
                style={[styles.codeBtn, styles.codeBtnDanger]}
                onPress={handleEndSession}
                disabled={endingSession}
              >
                {endingSession ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="stop-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.codeBtnTextPrimary}> End Session</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List header */}
        <View style={styles.listHeaderContainer}>
          <Text style={styles.listHeaderTitle}>Enrolled Students ({filteredRecords.length})</Text>
          <Text style={styles.listHeaderSub}>Present: {presentCount}  ·  Absent: {absentCount}</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#8F9BB3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, roll number, section..."
            placeholderTextColor="#8F9BB3"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#8F9BB3" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List */}
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.student_id.toString()}
          renderItem={({ item }) => {
            const isPresent = item.status === 'PRESENT' || item.status === 'LATE';
            const isLate = item.status === 'LATE';
            const statusStyle = isPresent
              ? isLate
                ? { bg: '#FFF3E0', text: '#FF9500', label: 'LATE' }
                : { bg: '#E6FBFA', text: '#00B388', label: 'PRESENT' }
              : { bg: '#FFEBE9', text: '#FF3B30', label: 'ABSENT' };

            return (
              <View style={styles.studentRecordRow}>
                <View style={[styles.avatarCircle, { backgroundColor: isPresent ? '#EAF0FF' : '#F4F5F9' }]}>
                  <Text style={[styles.avatarText, { color: isPresent ? '#2D6AE0' : '#8F9BB3' }]}>
                    {item.student_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfoCol}>
                  <Text style={styles.studentNameText}>{item.student_name}</Text>
                  <Text style={styles.studentMetaText}>
                    {item.roll_number || 'No Roll'} · Section {item.section || 'N/A'}
                  </Text>
                </View>
                <View style={[styles.statusBadgeRow, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusBadgeTextRow, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D6AE0']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={48} color="#C5CEE0" />
              <Text style={styles.emptyText}>No students found matching search query.</Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderManualTab = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Help Banner */}
        <View style={styles.helpBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#2D6AE0" />
          <Text style={styles.helpText}>
            Check/uncheck students below to mark them present or absent. Updates are saved in real-time.
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#8F9BB3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, roll number, section..."
            placeholderTextColor="#8F9BB3"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#8F9BB3" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List */}
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.student_id.toString()}
          renderItem={({ item }) => {
            const isChecked = item.status === 'PRESENT' || item.status === 'LATE';
            const isLoadingRow = !!rowLoading[item.student_id];

            return (
              <TouchableOpacity
                style={styles.manualRecordRow}
                onPress={() => toggleAttendance(item.student_id, item.status)}
                disabled={isLoadingRow}
                activeOpacity={0.7}
              >
                <View style={[styles.avatarCircle, { backgroundColor: isChecked ? '#EAF0FF' : '#F4F5F9' }]}>
                  <Text style={[styles.avatarText, { color: isChecked ? '#2D6AE0' : '#8F9BB3' }]}>
                    {item.student_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfoCol}>
                  <Text style={styles.studentNameText}>{item.student_name}</Text>
                  <Text style={styles.studentMetaText}>
                    {item.roll_number || 'No Roll'} · Section {item.section || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.checkboxWrapper}>
                  {isLoadingRow ? (
                    <ActivityIndicator size="small" color="#2D6AE0" />
                  ) : (
                    <Ionicons
                      name={isChecked ? "checkbox" : "square-outline"}
                      size={24}
                      color={isChecked ? "#2D6AE0" : "#8F9BB3"}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D6AE0']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={48} color="#C5CEE0" />
              <Text style={styles.emptyText}>No students found matching search query.</Text>
            </View>
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Session summary header */}
      <View style={styles.sessionCard}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{classDetails?.class_name || 'Loading...'}</Text>
          <View style={[styles.statusBadge, session?.status === 'ACTIVE' ? styles.statusActive : styles.statusClosed]}>
            {session?.status === 'ACTIVE' && <View style={styles.pulseDot} />}
            <Text style={[styles.statusText, session?.status === 'ACTIVE' ? { color: '#00B388' } : { color: '#FF3B30' }]}>
              {session?.status || '...'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>
          Class ID: {session?.class_id || '—'}  ·  Session ID: {sessionId}
        </Text>
        
        <View style={styles.cardStats}>
          <View style={styles.cardStatItem}>
            <Text style={styles.statLabel}>Started</Text>
            <Text style={styles.statVal}>{session?.start_time ? formatTime(session.start_time) : '—'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.cardStatItem}>
            <Text style={styles.statLabel}>Enrolled</Text>
            <Text style={styles.statVal}>{records.length} Students</Text>
          </View>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'code' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('code');
            setSearchQuery('');
          }}
        >
          <Ionicons name="key" size={16} color={activeTab === 'code' ? '#FFFFFF' : '#2D6AE0'} />
          <Text style={[styles.tabText, activeTab === 'code' && styles.tabTextActive]}> Code Gen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'manual' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('manual');
            setSearchQuery('');
          }}
        >
          <Ionicons name="checkmark-circle" size={16} color={activeTab === 'manual' ? '#FFFFFF' : '#2D6AE0'} />
          <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}> Manual Attendance</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'code' ? renderCodeTab() : renderManualTab()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F5F9' },

  // Session summary card
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#8F9BB3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#222B45', flex: 1, marginRight: 8 },
  cardSubtitle: { fontSize: 12, color: '#8F9BB3', fontWeight: '500', marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#E6FBFA' },
  statusClosed: { backgroundColor: '#FFEAEA' },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00B388', marginRight: 6 },
  
  cardStats: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F2F5', alignItems: 'center' },
  cardStatItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statVal: { fontSize: 14, fontWeight: '700', color: '#222B45' },
  statDivider: { width: 1, height: 24, backgroundColor: '#F0F2F5' },

  // Tab container
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAF0FF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#2D6AE0',
    shadowColor: '#2D6AE0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: '#2D6AE0' },
  tabTextActive: { color: '#FFFFFF' },

  // Code card tab
  codeCard: {
    backgroundColor: '#1A3A6B',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#2D6AE0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  codeTitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  codeRow: { flexDirection: 'row', gap: 6, marginBottom: 16, justifyContent: 'center' },
  codeBox: {
    width: 38,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  codeBoxClosed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  codeChar: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  codeCharClosed: { color: 'rgba(255,255,255,0.3)' },
  noCodeText: { fontSize: 16, color: '#FFFFFF', opacity: 0.6 },
  
  codeActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  codeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  codeBtnOutline: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  codeBtnDanger: {
    backgroundColor: '#FF3B30',
  },
  codeBtnTextOutline: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  codeBtnTextPrimary: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // List headers
  listHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 6,
  },
  listHeaderTitle: { fontSize: 14, fontWeight: '700', color: '#222B45' },
  listHeaderSub: { fontSize: 12, fontWeight: '600', color: '#8F9BB3' },

  // Search input
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E4E9F2',
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#222B45', height: '100%', padding: 0 },
  clearBtn: { padding: 4 },

  // List scroll
  listScroll: { paddingHorizontal: 16, paddingBottom: 30 },

  // Record row
  studentRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  studentInfoCol: { flex: 1 },
  studentNameText: { fontSize: 14, fontWeight: '700', color: '#222B45' },
  studentMetaText: { fontSize: 12, color: '#8F9BB3', marginTop: 2 },
  statusBadgeRow: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusBadgeTextRow: { fontSize: 10, fontWeight: '800' },

  // Help banner manual tab
  helpBanner: {
    flexDirection: 'row',
    backgroundColor: '#EAF0FF',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#D0E0FF',
  },
  helpText: { flex: 1, fontSize: 12, color: '#2D6AE0', marginLeft: 8, lineHeight: 16, fontWeight: '500' },

  // Manual record row
  manualRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  checkboxWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty list
  emptyWrap: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 13, color: '#8F9BB3', marginTop: 12, textAlign: 'center' },
});
