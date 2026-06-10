import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface ClassItem {
  class_id: number;
  class_name: string;
  join_code: string;
}

interface SessionStat {
  sessions_count: number;
  last_session: string | null;
}

export default function FacultyDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState<Record<number, SessionStat>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create class modal
  const [createVisible, setCreateVisible] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get(`/api/faculty/${user?.user_id}/classes`);
      const list: ClassItem[] = res.data;
      setClasses(list);

      // Fetch session stats for each class in parallel
      const statResults = await Promise.allSettled(
        list.map((c) =>
          api.get(`/api/faculty/classes/${c.class_id}/sessions/stats`)
        )
      );
      const statMap: Record<number, SessionStat> = {};
      statResults.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          statMap[list[i].class_id] = r.value.data;
        }
      });
      setStats(statMap);
    } catch (e: any) {
      console.error('[FacultyDashboard]', e?.response?.data || e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.user_id) fetchClasses();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClasses();
  }, [fetchClasses]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      Alert.alert('Error', 'Class name cannot be empty.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/api/faculty/classes', {
        class_name: newClassName.trim(),
        faculty_id: user?.user_id,
      });
      setNewClassName('');
      setCreateVisible(false);
      fetchClasses();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not create class.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClass = (classId: number, className: string) => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${className}"? All sessions and attendance records will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/faculty/classes/${classId}`);
              fetchClasses();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.detail || 'Could not delete class.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'No sessions yet';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D6AE0" />
      </View>
    );
  }

  const renderClass = ({ item }: { item: ClassItem }) => {
    const stat = stats[item.class_id];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/(faculty)/class/${item.class_id}`)}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Ionicons name="book" size={22} color="#2D6AE0" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.class_name}</Text>
            <View style={styles.codeRow}>
              <Ionicons name="key-outline" size={13} color="#8F9BB3" />
              <Text style={styles.codeText}>  Join Code: </Text>
              <Text style={styles.codeValue}>{item.join_code}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteClass(item.class_id, item.class_name)}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={14} color="#8F9BB3" />
            <Text style={styles.statLabel}>  {stat?.sessions_count ?? 0} Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color="#8F9BB3" />
            <Text style={styles.statLabel}>  {formatDate(stat?.last_session ?? null)}</Text>
          </View>
        </View>

        {/* Tap to manage */}
        <View style={styles.manageRow}>
          <Text style={styles.manageText}>Manage & Start Session</Text>
          <Ionicons name="chevron-forward" size={16} color="#2D6AE0" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top greeting bar */}
      <View style={styles.greetingBar}>
        <View>
          <Text style={styles.greetingHello}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.greetingRole}>Faculty · AttendX</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {classes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="school-outline" size={64} color="#C5CEE0" />
          <Text style={styles.emptyTitle}>No Classes Yet</Text>
          <Text style={styles.emptyText}>Tap the + button to create your first class.</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.class_id.toString()}
          renderItem={renderClass}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D6AE0']} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateVisible(true)}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create Class Modal */}
      <Modal visible={createVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create New Class</Text>
            <Text style={styles.modalSubtitle}>A unique join code will be generated automatically.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Data Structures — Sem 4"
              placeholderTextColor="#8F9BB3"
              value={newClassName}
              onChangeText={setNewClassName}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalCreateBtn, creating && { opacity: 0.7 }]}
              onPress={handleCreateClass}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalCreateBtnText}>Create Class</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCreateVisible(false)}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F5F9' },
  greetingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D6AE0',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  greetingHello: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  greetingRole: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#2D6AE0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconWrap: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: '#EAF0FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#222B45', marginBottom: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center' },
  codeText: { fontSize: 12, color: '#8F9BB3' },
  codeValue: { fontSize: 12, color: '#2D6AE0', fontWeight: '700', letterSpacing: 1 },
  deleteBtn: { padding: 6 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#8F9BB3', fontWeight: '500' },
  manageRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  manageText: { fontSize: 13, color: '#2D6AE0', fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#222B45', marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#8F9BB3', textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute', right: 20, bottom: 28,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#2D6AE0',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2D6AE0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
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
  modalSubtitle: { fontSize: 14, color: '#8F9BB3', marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E4E9F2', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#222B45', marginBottom: 16,
  },
  modalCreateBtn: {
    backgroundColor: '#2D6AE0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  modalCreateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: '#8F9BB3', fontSize: 15 },
});
