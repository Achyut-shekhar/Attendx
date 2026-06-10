import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';

interface ClassItem {
  class_id: number;
  class_name: string;
  join_code: string;
  faculty_name: string;
  roll_number: string;
  section: string;
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClasses = async () => {
    try {
      const response = await api.get(`/api/student/classes`, {
        params: { student_id: user?.user_id }
      });
      setClasses(response.data);
    } catch (error) {
      console.error(error);
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const renderClass = ({ item }: { item: ClassItem }) => (
    <View style={styles.classCard}>
      <View style={styles.classHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="book" size={24} color="#6C63FF" />
        </View>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{item.class_name}</Text>
          <Text style={styles.facultyName}>Prof. {item.faculty_name}</Text>
        </View>
      </View>
      <View style={styles.classDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Roll Number</Text>
          <Text style={styles.detailValue}>{item.roll_number}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Section</Text>
          <Text style={styles.detailValue}>{item.section || 'N/A'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={60} color="#8F9BB3" />
          <Text style={styles.emptyTitle}>No Classes Yet</Text>
          <Text style={styles.emptyText}>You haven't joined any classes. Use the join code provided by your faculty to enroll.</Text>
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
  },
  listContainer: {
    padding: 20,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EAE9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222B45',
    marginBottom: 4,
  },
  facultyName: {
    fontSize: 14,
    color: '#8F9BB3',
    fontWeight: '500',
  },
  classDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8F9BB3',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    color: '#222B45',
    fontWeight: '600',
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
    lineHeight: 22,
  },
});
