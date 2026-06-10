import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../services/api';

interface AttendanceRecord {
  student_id: number;
  student_name: string;
  roll_number: string;
  section: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  marked_at: string | null;
  biometric_verified?: boolean;
}

interface SessionSummary {
  present: number;
  absent: number;
  late: number;
  total: number;
}

export default function SessionAttendanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LATE'>('ALL');

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await api.get(`/api/faculty/sessions/${sessionId}/attendance/flat`);
      setRecords(res.data);
    } catch (e) {
      console.error('[SessionAttendance]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAttendance();
    // Auto-refresh every 10s for live updates if session is active
    const interval = setInterval(fetchAttendance, 10000);
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAttendance();
  }, [fetchAttendance]);

  const summary: SessionSummary = {
    present: records.filter((r) => r.status === 'PRESENT').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    late: records.filter((r) => r.status === 'LATE').length,
    total: records.length,
  };

  const filtered = filter === 'ALL' ? records : records.filter((r) => r.status === filter);

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = {
    PRESENT: { color: '#34C759', bg: '#E9F9EE', icon: 'checkmark-circle' as const },
    LATE: { color: '#FF9500', bg: '#FFF3E0', icon: 'time' as const },
    ABSENT: { color: '#FF3B30', bg: '#FFEBE9', icon: 'close-circle' as const },
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D6AE0" />
      </View>
    );
  }

  const renderRecord = ({ item }: { item: AttendanceRecord }) => {
    const cfg = statusConfig[item.status] || statusConfig.ABSENT;
    return (
      <View style={styles.row}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.avatarText, { color: cfg.color }]}>
            {item.student_name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{item.student_name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{item.roll_number || 'No roll no.'}</Text>
            {item.section ? <Text style={styles.meta}>  ·  {item.section}</Text> : null}
          </View>
          {item.status === 'PRESENT' && (
            <View style={styles.biometricRow}>
              <Ionicons
                name={item.biometric_verified ? 'finger-print' : 'finger-print-outline'}
                size={13}
                color={item.biometric_verified ? '#34C759' : '#C5CEE0'}
              />
              <Text style={[styles.biometricLabel, { color: item.biometric_verified ? '#34C759' : '#C5CEE0' }]}>
                {item.biometric_verified ? '  Biometric verified' : '  No biometric'}
              </Text>
            </View>
          )}
        </View>

        {/* Status badge */}
        <View style={styles.statusCol}>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>  {item.status}</Text>
          </View>
          {item.marked_at && (
            <Text style={styles.markedAt}>{formatTime(item.marked_at)}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderTopColor: '#34C759' }]}>
          <Text style={[styles.summaryNum, { color: '#34C759' }]}>{summary.present}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: '#FF3B30' }]}>
          <Text style={[styles.summaryNum, { color: '#FF3B30' }]}>{summary.absent}</Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: '#FF9500' }]}>
          <Text style={[styles.summaryNum, { color: '#FF9500' }]}>{summary.late}</Text>
          <Text style={styles.summaryLabel}>Late</Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: '#2D6AE0' }]}>
          <Text style={[styles.summaryNum, { color: '#2D6AE0' }]}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'PRESENT', 'ABSENT', 'LATE'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Attendance List */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={52} color="#C5CEE0" />
          <Text style={styles.emptyText}>No records for this filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.student_id.toString()}
          renderItem={renderRecord}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D6AE0']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F5F9' },

  // Summary
  summaryRow: {
    flexDirection: 'row', padding: 16, gap: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryCard: {
    flex: 1, backgroundColor: '#F8F9FC', borderRadius: 12, padding: 12,
    alignItems: 'center', borderTopWidth: 3,
  },
  summaryNum: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  summaryLabel: { fontSize: 11, color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase' },

  // Filter
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F2F5',
  },
  filterTab: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8,
  },
  filterTabActive: { backgroundColor: '#EAF0FF' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#8F9BB3' },
  filterTextActive: { color: '#2D6AE0' },

  // List
  list: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#222B45', marginBottom: 3 },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  meta: { fontSize: 12, color: '#8F9BB3' },
  biometricRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  biometricLabel: { fontSize: 11, fontWeight: '600' },
  statusCol: { alignItems: 'flex-end' },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  markedAt: { fontSize: 11, color: '#8F9BB3' },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#8F9BB3', marginTop: 14 },
});
