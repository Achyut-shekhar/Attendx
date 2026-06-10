import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

interface ClassItem {
  class_id: number;
  class_name: string;
  join_code: string;
  faculty_name: string;
  roll_number: string;
  section: string;
  attendance_rate?: number;
}

export default function StudentDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Join Class Modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [section, setSection] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleDevLogout = () => {
    if (!__DEV__) return;
    Alert.alert('Development Mode', 'Switch to a different account?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await logout();
        },
        style: 'destructive',
      },
    ]);
  };

  const fetchClasses = async () => {
    if (!user?.user_id) return;
    try {
      // Check device status
      const deviceId = await SecureStore.getItemAsync('device_id');
      if (deviceId) {
        try {
          const deviceStatusRes = await api.get('/api/student/device-status', {
            params: { device_id: deviceId }
          });
          if (deviceStatusRes.data && deviceStatusRes.data.registered === false) {
            // Force logout
            await SecureStore.deleteItemAsync('locked_user_email');
            await SecureStore.deleteItemAsync('is_device_registered');
            await SecureStore.deleteItemAsync('locked_user_id');
            await logout();
            Alert.alert('Device Deregistered', 'This device has been deregistered by the faculty. You have been logged out.');
            return;
          }
        } catch (deviceError) {
          console.warn('[StudentDashboard] Error checking device status:', deviceError);
        }
      }

      const response = await api.get(`/api/student/classes`, {
        params: { student_id: user?.user_id }
      });
      const rawClasses: ClassItem[] = response.data;

      // Enrich each class with attendance_rate from its detail endpoint
      const enriched = await Promise.all(
        rawClasses.map(async (cls) => {
          try {
            const detail = await api.get(`/api/student/classes/${cls.class_id}`, {
              params: { student_id: user?.user_id },
            });
            return { ...cls, attendance_rate: detail.data.attendance_rate ?? 0 };
          } catch {
            return { ...cls, attendance_rate: 0 };
          }
        })
      );
      setClasses(enriched);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch your classes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.user_id) fetchClasses();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClasses();
  }, [user]);

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Validation Error', 'Please enter a join code.');
      return;
    }
    if (!rollNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your roll number.');
      return;
    }
    setIsJoining(true);
    try {
      await api.post('/api/student/classes/join', {
        join_code: joinCode.trim().toUpperCase(),
        student_id: user?.user_id,
        roll_number: rollNumber.trim(),
        ...(section.trim() ? { section: section.trim().toUpperCase() } : {}),
      });
      Alert.alert('Success', 'You have successfully joined the class!');
      setJoinCode('');
      setRollNumber('');
      setSection('');
      setJoinModalVisible(false);
      fetchClasses();
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Invalid join code or already enrolled.';
      Alert.alert('Error', detail);
    } finally {
      setIsJoining(false);
    }
  };

  // Global computed stats
  const avgAttendance =
    classes.length > 0
      ? (classes.reduce((sum, c) => sum + (c.attendance_rate ?? 0), 0) / classes.length).toFixed(1)
      : '0.0';

  const getBadgeStyle = (rate: number) => {
    if (rate >= 75) return { bg: '#DCFCE7', text: '#16A34A' };
    if (rate >= 50) return { bg: '#FEF9C3', text: '#CA8A04' };
    return { bg: '#FEE2E2', text: '#DC2626' };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const renderClass = ({ item }: { item: ClassItem }) => {
    const rate = item.attendance_rate ?? 0;
    const badge = getBadgeStyle(rate);
    return (
      <View style={styles.classCard}>
        <View style={styles.classHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="book" size={24} color="#6C63FF" />
          </View>
          <View style={styles.classInfo}>
            <Text style={styles.className} numberOfLines={1}>{item.class_name}</Text>
            <Text style={styles.facultyName}>Prof. {item.faculty_name}</Text>
          </View>
          <View style={[styles.attendanceBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.attendanceBadgeText, { color: badge.text }]}>
              {rate.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.classDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Roll Number</Text>
            <Text style={styles.detailValue}>{item.roll_number}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Section</Text>
            <Text style={styles.detailValue}>{item.section || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButtonOutline}
            onPress={() =>
              router.push({
                pathname: '/(student)/class/[id]',
                params: { id: item.class_id, name: item.class_name },
              })
            }
          >
            <Ionicons name="analytics-outline" size={16} color="#6C63FF" style={styles.actionIcon} />
            <Text style={styles.actionButtonTextOutline}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonPrimary}
            onPress={() => router.push('/(student)/mark-attendance')}
          >
            <Ionicons name="scan-outline" size={16} color="#FFFFFF" style={styles.actionIcon} />
            <Text style={styles.actionButtonTextPrimary}>Enter Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Student Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {classes.length} enrolled class{classes.length !== 1 ? 'es' : ''}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.joinButton} onPress={() => setJoinModalVisible(true)}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.joinButtonText}>Join Class</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
          <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="library-outline" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{classes.length}</Text>
          <Text style={styles.statLabel}>Classes</Text>
        </View>
        <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
          <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="trending-up-outline" size={20} color="#22C55E" />
          </View>
          <Text style={styles.statValue}>{avgAttendance}%</Text>
          <Text style={styles.statLabel}>Avg Attendance</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Ionicons name="sparkles-outline" size={18} color="#6C63FF" />
        <Text style={styles.sectionTitle}>Your Classes</Text>
      </View>

      {classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={60} color="#8F9BB3" />
          <Text style={styles.emptyTitle}>No Classes Yet</Text>
          <Text style={styles.emptyText}>
            Use the "Join Class" button above to enroll using the code provided by your faculty.
          </Text>
          <TouchableOpacity style={styles.emptyJoinBtn} onPress={() => setJoinModalVisible(true)}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.joinButtonText}>Join Class</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.class_id.toString()}
          renderItem={renderClass}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C63FF']} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={joinModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalFullScreen}
        >
          <View style={styles.modalFullHeader}>
            <Text style={styles.modalTitle}>Join a Class</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setJoinModalVisible(false)}
            >
              <Ionicons name="close" size={22} color="#8F9BB3" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Enter the code provided by your faculty to enroll in a class.
          </Text>

          <Text style={styles.inputLabel}>Join Code *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter class join code"
            placeholderTextColor="#8F9BB3"
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase())}
            autoCapitalize="characters"
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Roll Number *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your roll number"
            placeholderTextColor="#8F9BB3"
            value={rollNumber}
            onChangeText={setRollNumber}
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Section
            <Text style={styles.optionalTag}> (Optional)</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., A or B1"
            placeholderTextColor="#8F9BB3"
            value={section}
            onChangeText={(t) => setSection(t.toUpperCase())}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleJoinClass}
          />
          <Text style={styles.inputHint}>
            Helps faculty differentiate students when viewing rosters.
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setJoinModalVisible(false)}
              disabled={isJoining}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, isJoining && { opacity: 0.6 }]}
              onPress={handleJoinClass}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Join Class</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F5F9' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#8F9BB3', fontWeight: '500' },

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#222B45' },
  headerSubtitle: { fontSize: 13, color: '#8F9BB3', marginTop: 2 },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 4 },
  devLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAEA',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  devLogoutText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    shadowColor: '#8F9BB3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#222B45' },
  statLabel: { fontSize: 12, color: '#8F9BB3', fontWeight: '500', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#222B45' },

  listContainer: { paddingHorizontal: 20, paddingBottom: 30 },

  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#8F9BB3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  classHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F4F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classInfo: { flex: 1 },
  className: { fontSize: 17, fontWeight: '700', color: '#222B45', marginBottom: 3 },
  facultyName: { fontSize: 13, color: '#8F9BB3', fontWeight: '500' },
  attendanceBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  attendanceBadgeText: { fontSize: 12, fontWeight: '700' },

  classDetails: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  detailItem: { flex: 1 },
  detailDivider: { width: 1, backgroundColor: '#E4E9F2', marginHorizontal: 14 },
  detailLabel: { fontSize: 11, color: '#8F9BB3', fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, color: '#222B45', fontWeight: '700' },

  cardActions: { flexDirection: 'row', gap: 10 },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EAE9FF',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#FDFCFF',
  },
  actionButtonTextOutline: { color: '#6C63FF', fontSize: 13, fontWeight: '700' },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionIcon: {
    marginRight: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222B45',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: '#8F9BB3',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },

  // ── JOIN CLASS MODAL (full-screen, solid) ──
  modalFullScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalFullHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#222B45' },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F4F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: { fontSize: 14, color: '#8F9BB3', lineHeight: 20, marginBottom: 28 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#222B45', marginBottom: 8 },
  optionalTag: { fontSize: 13, fontWeight: '400', color: '#8F9BB3' },
  textInput: {
    backgroundColor: '#F4F5F9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#222B45',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  inputHint: { fontSize: 12, color: '#8F9BB3', marginTop: -12, marginBottom: 28 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E4E9F2',
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '700', color: '#8F9BB3' },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
