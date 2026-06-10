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
import * as Location from 'expo-location';

interface ClassItem {
  class_id: number;
  class_name: string;
  join_code: string;
}

interface SessionStat {
  sessions_count: number;
  last_session: string | null;
}

interface UserItem {
  user_id: number;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY';
}

export default function FacultyDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState<Record<number, SessionStat>>({});
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});
  const [activeSessions, setActiveSessions] = useState<Record<number, any>>({});
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals visibility
  const [createVisible, setCreateVisible] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);

  // Location-based Session Modal States
  const [startSessionVisible, setStartSessionVisible] = useState(false);
  const [classToStart, setClassToStart] = useState<ClassItem | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(500);
  const [customRadius, setCustomRadius] = useState('500');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState(false);

  // Reset Password Modal States
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deregisteringDevice, setDeregisteringDevice] = useState(false);

  // Delete Class Modal States
  const [deleteClassVisible, setDeleteClassVisible] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletingClass, setDeletingClass] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const res = await api.get(`/api/faculty/${user?.user_id}/classes`);
      const list: ClassItem[] = res.data;
      setClasses(list);

      // Fetch session stats & student count for each class in parallel
      const detailsPromises = list.map(async (c) => {
        const statsRes = api.get(`/api/faculty/classes/${c.class_id}/sessions/stats`).catch(() => null);
        const studentsRes = api.get(`/api/faculty/classes/${c.class_id}/students`).catch(() => null);
        return { class_id: c.class_id, statsRes: await statsRes, studentsRes: await studentsRes };
      });

      const detailsResults = await Promise.all(detailsPromises);
      const statMap: Record<number, SessionStat> = {};
      const countMap: Record<number, number> = {};

      detailsResults.forEach((r) => {
        if (r.statsRes) {
          statMap[r.class_id] = r.statsRes.data;
        }
        if (r.studentsRes) {
          countMap[r.class_id] = Array.isArray(r.studentsRes.data) ? r.studentsRes.data.length : 0;
        }
      });

      setStats(statMap);
      setStudentCounts(countMap);

      // Fetch active sessions
      const activeRes = await api.get(`/api/faculty/sessions/active?faculty_id=${user?.user_id}`);
      const activeList = activeRes.data;
      const activeMap: Record<number, any> = {};
      activeList.forEach((session: any) => {
        activeMap[session.class_id] = session;
      });
      setActiveSessions(activeMap);

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
        join_code: '', // Will auto-generate on backend
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

  const handleOpenDeleteClass = (classItem: ClassItem) => {
    setClassToDelete(classItem);
    setDeleteConfirmationText('');
    setDeleteClassVisible(true);
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    if (deleteConfirmationText.trim().toLowerCase() !== 'delete') {
      Alert.alert('Error', 'Please type "delete" to confirm.');
      return;
    }
    setDeletingClass(true);
    try {
      await api.delete(`/api/faculty/classes/${classToDelete.class_id}`);
      setDeleteClassVisible(false);
      setClassToDelete(null);
      fetchClasses();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not delete class.');
    } finally {
      setDeletingClass(false);
    }
  };

  // Location Session Handlers
  const handleOpenStartSession = (classItem: ClassItem) => {
    setClassToStart(classItem);
    setUseLocation(false);
    setRadiusMeters(500);
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
    if (!classToStart) return;
    let rad = radiusMeters;
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
      const res = await api.post(`/api/faculty/classes/${classToStart.class_id}/sessions`, {
        class_id: classToStart.class_id,
        latitude: useLocation && locationData ? locationData.latitude : null,
        longitude: useLocation && locationData ? locationData.longitude : null,
        radius_meters: useLocation ? rad : 50, // Default 50 if no location
      });
      
      setStartSessionVisible(false);
      setClassToStart(null);
      fetchClasses();

      // Navigate to live session attendance screen
      router.push(`/(faculty)/session/${res.data.session_id}`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not start session.');
    } finally {
      setStartingSession(false);
    }
  };

  const handleEndSession = (classItem: ClassItem, sessionId: number) => {
    Alert.alert(
      'End Session',
      `Are you sure you want to end the session for "${classItem.class_name}"? All unmarked students will be marked absent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/api/faculty/classes/${classItem.class_id}/sessions/${sessionId}/end`);
              fetchClasses();
              Alert.alert('Success', 'Session ended. Navigating to final roster.');
              router.push(`/(faculty)/session/${sessionId}`);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.detail || 'Could not end session.');
            }
          },
        },
      ]
    );
  };

  // Reset Password Modal Handlers
  const handleOpenResetPassword = async () => {
    setResetPasswordVisible(true);
    setSelectedUser(null);
    setUserSearch('');
    setNewPassword('');
    setConfirmPassword('');
    setAdminKey('');
    try {
      const res = await api.get('/api/faculty/users');
      setAllUsers(res.data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load users.');
    }
  };

  const handleSelectUser = (userItem: UserItem) => {
    setSelectedUser(userItem);
    setNewPassword('');
    setConfirmPassword('');
    setAdminKey('');
    setShowNewPwd(false);
    setShowConfirmPwd(false);
  };

  const handleAdminResetPassword = async () => {
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }
    if (!adminKey.trim()) {
      Alert.alert('Validation Error', 'Admin Reset Key is required.');
      return;
    }
    setResettingPassword(true);
    try {
      await api.post('/api/faculty/admin/reset-password', {
        user_id: selectedUser.user_id,
        new_password: newPassword,
        admin_key: adminKey.trim(),
      });
      Alert.alert('Success', `Password for ${selectedUser.name} has been reset successfully.`);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
      setAdminKey('');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleAdminDeregisterDevice = async () => {
    if (!selectedUser) return;
    if (!adminKey.trim()) {
      Alert.alert('Validation Error', 'Admin Reset Key is required to clear device bindings.');
      return;
    }
    setDeregisteringDevice(true);
    try {
      const res = await api.post('/api/faculty/admin/deregister-device', {
        user_id: selectedUser.user_id,
        admin_key: adminKey.trim(),
      });
      Alert.alert('Success', res.data.message || `Device bindings for ${selectedUser.name} cleared successfully.`);
      setSelectedUser(null);
      setAdminKey('');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to clear device bindings.');
    } finally {
      setDeregisteringDevice(false);
    }
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

  // Split classes into active (live) and other classes
  const liveClasses = classes.filter(c => activeSessions[c.class_id]);
  const otherClasses = classes.filter(c => !activeSessions[c.class_id]);

  const renderClassCard = (item: ClassItem, isLive: boolean) => {
    const stat = stats[item.class_id];
    const studentCount = studentCounts[item.class_id] ?? 0;
    const sessionInfo = activeSessions[item.class_id];

    return (
      <View key={item.class_id} style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Ionicons name="book" size={22} color="#2D6AE0" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.class_name}</Text>
            <View style={styles.codeRow}>
              <Ionicons name="key-outline" size={13} color="#8F9BB3" />
              <Text style={styles.codeText}> Join Code: </Text>
              <Text style={styles.codeValue}>{item.join_code}</Text>
            </View>
          </View>
          
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleOpenDeleteClass(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={14} color="#8F9BB3" />
            <Text style={styles.statLabel}> {studentCount} Students</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={14} color="#8F9BB3" />
            <Text style={styles.statLabel}> {stat?.sessions_count ?? 0} Sessions</Text>
          </View>
        </View>
        
        {stat?.last_session && (
          <View style={[styles.statItem, { marginBottom: 12 }]}>
            <Ionicons name="time-outline" size={14} color="#8F9BB3" />
            <Text style={styles.statLabel}> Last: {formatDate(stat.last_session)}</Text>
          </View>
        )}

        {/* Action Row */}
        {isLive ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline, { marginRight: 8 }]}
              onPress={() => router.push(`/(faculty)/session/${sessionInfo.session_id}`)}
            >
              <Ionicons name="people" size={16} color="#2D6AE0" />
              <Text style={styles.actionBtnTextOutline}> View Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => handleEndSession(item, sessionInfo.session_id)}
            >
              <Ionicons name="stop-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnTextPrimary}> End Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline, { marginRight: 8 }]}
              onPress={() => router.push(`/(faculty)/class/${item.class_id}`)}
            >
              <Ionicons name="analytics" size={16} color="#2D6AE0" />
              <Text style={styles.actionBtnTextOutline}> View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => handleOpenStartSession(item)}
            >
              <Ionicons name="play-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnTextPrimary}> Start Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
        <View style={styles.greetingActions}>
          <TouchableOpacity onPress={handleOpenResetPassword} style={[styles.actionHeaderBtn, { marginRight: 8 }]}>
            <Ionicons name="key-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.actionHeaderBtn}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D6AE0']} />}
      >
        {classes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="school-outline" size={64} color="#C5CEE0" />
            <Text style={styles.emptyTitle}>No Classes Yet</Text>
            <Text style={styles.emptyText}>Tap the + button to create your first class.</Text>
          </View>
        ) : (
          <View>
            {/* Live sessions */}
            {liveClasses.length > 0 && (
              <View>
                <View style={styles.sectionHeader}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.sectionTitle}>Active Sessions</Text>
                </View>
                {liveClasses.map(c => renderClassCard(c, true))}
              </View>
            )}

            {/* Other Classes */}
            {otherClasses.length > 0 && (
              <View style={{ marginTop: liveClasses.length > 0 ? 16 : 0 }}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="sparkles-outline" size={16} color="#2D6AE0" />
                  <Text style={styles.sectionTitle}>Your Classes</Text>
                </View>
                {otherClasses.map(c => renderClassCard(c, false))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

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

      {/* Delete Class Confirmation Modal */}
      <Modal visible={deleteClassVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: '#FF3B30' }]}>Delete Class?</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to permanently delete "{classToDelete?.class_name}"? This action is irreversible and deletes all sessions & attendance logs.
            </Text>
            <Text style={styles.inputLabel}>Please type <Text style={{ fontWeight: 'bold', color: '#FF3B30' }}>delete</Text> to confirm:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder='Type "delete" here'
              placeholderTextColor="#8F9BB3"
              value={deleteConfirmationText}
              onChangeText={setDeleteConfirmationText}
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: '#FF3B30' }, (deletingClass || deleteConfirmationText.trim().toLowerCase() !== 'delete') && { opacity: 0.5 }]}
              onPress={confirmDeleteClass}
              disabled={deletingClass || deleteConfirmationText.trim().toLowerCase() !== 'delete'}
            >
              {deletingClass ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalConfirmBtnText}>Delete Permanently</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeleteClassVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Start Session with Location Modal */}
      <Modal visible={startSessionVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Start Attendance Session</Text>
            <Text style={styles.modalSubtitle}>
              Configure details for "{classToStart?.class_name}".
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

      {/* Reset Password & Device Bindings Modal */}
      <Modal visible={resetPasswordVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { height: '85%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>User Account Administration</Text>
            <Text style={styles.modalSubtitle}>Reset passwords or clear device bindings for students/faculty.</Text>

            {!selectedUser ? (
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Search user by name or email..."
                  placeholderTextColor="#8F9BB3"
                  value={userSearch}
                  onChangeText={setUserSearch}
                />
                <ScrollView style={{ flex: 1, marginTop: 10 }}>
                  {allUsers
                    .filter(u =>
                      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map(u => (
                      <TouchableOpacity
                        key={u.user_id}
                        style={styles.userListItem}
                        onPress={() => handleSelectUser(u)}
                      >
                        <View>
                          <Text style={styles.userListName}>{u.name}</Text>
                          <Text style={styles.userListEmail}>{u.email}</Text>
                        </View>
                        <View style={[styles.roleBadge, u.role === 'FACULTY' ? styles.roleFaculty : styles.roleStudent]}>
                          <Text style={[styles.roleText, u.role === 'FACULTY' ? { color: '#2D6AE0' } : { color: '#00B388' }]}>
                            {u.role}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {/* Selected user summary */}
                <View style={styles.selectedUserBox}>
                  <View>
                    <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
                    <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedUser(null)}>
                    <Text style={styles.changeUserText}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Password input */}
                <Text style={styles.inputLabel}>New Password (Min 6 chars)</Text>
                <View style={styles.pwdInputRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    secureTextEntry={!showNewPwd}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                  />
                  <TouchableOpacity style={styles.pwdEye} onPress={() => setShowNewPwd(!showNewPwd)}>
                    <Ionicons name={showNewPwd ? "eye-off-outline" : "eye-outline"} size={20} color="#8F9BB3" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.pwdInputRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    secureTextEntry={!showConfirmPwd}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                  />
                  <TouchableOpacity style={styles.pwdEye} onPress={() => setShowConfirmPwd(!showConfirmPwd)}>
                    <Ionicons name={showConfirmPwd ? "eye-off-outline" : "eye-outline"} size={20} color="#8F9BB3" />
                  </TouchableOpacity>
                </View>

                {/* Admin key */}
                <Text style={[styles.inputLabel, { color: '#E28743' }]}>Admin Reset Key</Text>
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  value={adminKey}
                  onChangeText={setAdminKey}
                  placeholder="Enter secret authorization key"
                />

                {/* Action buttons */}
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: '#E28743', marginTop: 10 }, resettingPassword && { opacity: 0.7 }]}
                  onPress={handleAdminResetPassword}
                  disabled={resettingPassword || !newPassword || !confirmPassword || !adminKey}
                >
                  {resettingPassword ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: '#FF3B30' }, deregisteringDevice && { opacity: 0.7 }]}
                  onPress={handleAdminDeregisterDevice}
                  disabled={deregisteringDevice || !adminKey}
                >
                  {deregisteringDevice ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Clear Device Lock / Bindings</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setResetPasswordVisible(false)}
              disabled={resettingPassword || deregisteringDevice}
            >
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
  greetingActions: { flexDirection: 'row', alignItems: 'center' },
  actionHeaderBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#222B45', marginLeft: 6 },
  livePulseDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAEA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#FF3B30',
    marginRight: 4,
  },
  liveText: { fontSize: 10, fontWeight: '800', color: '#FF3B30' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#8F9BB3', fontWeight: '500' },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: '#EAF0FF',
    backgroundColor: '#FFFFFF',
  },
  actionBtnPrimary: {
    backgroundColor: '#2D6AE0',
  },
  actionBtnDanger: {
    backgroundColor: '#FF3B30',
  },
  actionBtnTextOutline: { color: '#2D6AE0', fontSize: 13, fontWeight: '700' },
  actionBtnTextPrimary: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, paddingTop: 100 },
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
  modalSubtitle: { fontSize: 14, color: '#8F9BB3', marginBottom: 20, lineHeight: 20 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E4E9F2', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#222B45', marginBottom: 16,
  },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#222B45', marginBottom: 8 },
  inputHint: { fontSize: 12, color: '#8F9BB3', marginTop: -10, marginBottom: 14 },
  modalCreateBtn: {
    backgroundColor: '#2D6AE0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  modalCreateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
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

  // Roster lists & detail inside modal styles
  userListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  userListName: { fontSize: 15, fontWeight: '700', color: '#222B45', marginBottom: 2 },
  userListEmail: { fontSize: 12, color: '#8F9BB3' },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleFaculty: { backgroundColor: '#EAF0FF' },
  roleStudent: { backgroundColor: '#E6FBFA' },
  roleText: { fontSize: 11, fontWeight: '800' },

  selectedUserBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  selectedUserName: { fontSize: 16, fontWeight: '800', color: '#222B45', marginBottom: 2 },
  selectedUserEmail: { fontSize: 13, color: '#8F9BB3' },
  changeUserText: { fontSize: 13, fontWeight: '700', color: '#2D6AE0', textDecorationLine: 'underline' },
  pwdInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pwdEye: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 10,
  },
});
