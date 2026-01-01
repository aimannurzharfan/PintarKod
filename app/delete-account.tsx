import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { API_URL } from '../config';
import { ThemedView } from '@/components/themed-view';

/**
 * Resolve avatar URI.
 * - Uses `profileImage` if available (data URI or base64).
 * - Otherwise uses `avatarUrl` (absolute URL or API path).
 * - Returns `undefined` when none is available.
 */
const resolveAvatarUri = (profileImage?: string | null, avatarUrl?: string | null) => {
  if (profileImage) {
    return profileImage.startsWith('data:')
      ? profileImage
      : `data:image/jpeg;base64,${profileImage}`;
  }
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  return `${API_URL}${avatarUrl}`;
};

interface Student {
  id: number;
  username: string;
  email: string;
  className?: string | null;
  avatarUrl?: string | null;
  profileImage?: string | null;
}

/**
 * DeleteAccountScreen component.
 * - Lets teachers view all students and permanently delete accounts.
 * - Shows all students on load, with search by name or email.
 * - Deletion requires typing the exact username for confirmation.
 * - Access is restricted to users with role `Teacher`.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user: currentUser, token } = useAuth();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);

  // ================== States ==================
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  /** Restrict access to users with role `Teacher`. */
  useEffect(() => {
    if (currentUser?.role !== 'Teacher') {
      Alert.alert(
        t('delete_student.access_denied_title') || 'Access Denied',
        t('delete_student.access_denied_message') || 'Only teachers can access this page.'
      );
      router.back();
    }
  }, [currentUser, router, t]);

  /** Fetch all students on mount */
  useEffect(() => {
    if (currentUser?.role === 'Teacher' && token) {
      fetchStudents();
    }
  }, [currentUser, token]);

  /** Filter students based on search query */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = students.filter((student) =>
        student.username.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        (student.className && student.className.toLowerCase().includes(query))
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  /** Fetch all students */
  const fetchStudents = async () => {
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/teacher/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Only teachers can access this feature');
        }
        throw new Error('Failed to fetch students');
      }

      const data: Student[] = await response.json();
      setStudents(data);
      setFilteredStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  /** Permanently delete a student account; requires exact username confirmation. */
  const confirmDelete = async (username: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert(
          t('delete_student.error_title') || 'Error',
          data.error || t('delete_student.error_delete_failed') || 'Failed to delete account'
        );
      } else {
        Alert.alert(
          t('delete_student.success_title') || 'Success',
          t('delete_student.success_message') || 'Account deleted successfully'
        );
        // Remove deleted student from list
        setStudents(students.filter((s) => s.username !== username));
        setFilteredStudents(filteredStudents.filter((s) => s.username !== username));
        setSelectedStudent(null);
        setConfirmUsername('');
        setShowDeleteModal(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        t('delete_student.error_title') || 'Error',
        t('delete_student.network_error') || 'Network error. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  /** Handle student selection for deletion */
  const handleDeleteStudent = (student: Student) => {
    setSelectedStudent(student);
    setConfirmUsername('');
    setShowDeleteModal(true);
  };

  /** Render student card */
  const renderStudentCard = ({ item }: { item: Student }) => {
    const avatarUri = resolveAvatarUri(item.profileImage, item.avatarUrl);

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentCardTop}>
          <View style={styles.studentCardLeft}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.studentAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.studentAvatar, styles.studentAvatarFallback]}>
                <Feather
                  name="user"
                  size={24}
                  color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                />
              </View>
            )}
            <View style={styles.studentInfo}>
              <Text style={styles.studentUsername}>{item.username}</Text>
              <Text style={styles.studentEmail}>{item.email}</Text>
              {item.className && (
                <Text style={styles.studentClassName}>{item.className}</Text>
              )}
            </View>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
          onPress={() => handleDeleteStudent(item)}
        >
          <Feather
            name="trash-2"
            size={16}
            color="#FF3B30"
          />
          <Text style={styles.deleteButtonText}>
            Delete
          </Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#FACC15' : '#1E293B'} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchStudents}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {t('delete_student.title') || 'Delete Account'}
            </Text>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Feather
                name="search"
                size={18}
                color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                style={styles.searchIcon}
              />
              <TextInput
                placeholder={t('delete_student.search_placeholder') || 'Search by name or email...'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                autoCapitalize="none"
                placeholderTextColor={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Feather
                    name="x"
                    size={18}
                    color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* Students list */}
          {filteredStudents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather
                name="users"
                size={48}
                color={colorScheme === 'dark' ? '#475569' : '#CBD5E1'}
              />
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? t('delete_student.no_results') || 'No students found'
                  : 'No students available'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredStudents}
              renderItem={renderStudentCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Delete confirmation modal */}
          <Modal
            visible={showDeleteModal}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setShowDeleteModal(false);
              setSelectedStudent(null);
              setConfirmUsername('');
            }}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => {
                setShowDeleteModal(false);
                setSelectedStudent(null);
                setConfirmUsername('');
              }}
            >
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <Feather
                    name="alert-triangle"
                    size={32}
                    color="#FF3B30"
                  />
                  <Text style={styles.modalTitle}>
                    {t('delete_student.confirm_title') || 'Confirm Deletion'}
                  </Text>
                </View>
                <Text style={styles.modalWarning}>
                  {t('delete_student.confirm_instructions', {
                    username: selectedStudent?.username,
                  }) || `Type "${selectedStudent?.username}" to confirm deletion. This action cannot be undone.`}
                </Text>
                <TextInput
                  placeholder={t('delete_student.confirm_placeholder') || 'Enter username'}
                  value={confirmUsername}
                  onChangeText={setConfirmUsername}
                  style={styles.modalInput}
                  autoCapitalize="none"
                  placeholderTextColor={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                />
                <View style={styles.modalButtons}>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setShowDeleteModal(false);
                      setSelectedStudent(null);
                      setConfirmUsername('');
                    }}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modalButton,
                      styles.modalButtonDelete,
                      (deleting || confirmUsername !== selectedStudent?.username) &&
                        styles.modalButtonDisabled,
                    ]}
                    disabled={deleting || confirmUsername !== selectedStudent?.username}
                    onPress={() => selectedStudent && confirmDelete(selectedStudent.username)}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonDeleteText}>
                        {t('delete_student.delete') || 'Delete'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

/* ======================= Styles ======================= */
const getStyles = (colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
  const palette = isDark
    ? {
        background: '#020617',
        card: 'rgba(15, 23, 42, 0.88)',
        border: 'rgba(148, 163, 184, 0.35)',
        input: 'rgba(15, 23, 42, 0.92)',
        text: '#E2E8F0',
        muted: '#94A3B8',
      }
    : {
        background: '#F0F4FF',
        card: '#FFFFFF',
        border: '#E2E8F0',
        input: '#F8FAFC',
        text: '#0F172A',
        muted: '#64748B',
      };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      fontSize: 16,
      color: '#FF3B30',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: '#2563EB',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    header: {
      padding: 24,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: palette.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: palette.muted,
    },
    searchContainer: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.input,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 14,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: palette.text,
      paddingVertical: 12,
    },
    clearButton: {
      padding: 4,
    },
    listContent: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    studentCard: {
      backgroundColor: palette.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    studentCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    studentCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    studentAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginRight: 12,
    },
    studentAvatarFallback: {
      backgroundColor: palette.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    studentInfo: {
      flex: 1,
    },
    studentUsername: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 4,
    },
    studentEmail: {
      fontSize: 14,
      color: palette.muted,
      marginBottom: 4,
    },
    studentClassName: {
      fontSize: 12,
      color: palette.muted,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 59, 48, 0.1)',
      borderWidth: 1,
      borderColor: '#FF3B30',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      gap: 6,
    },
    deleteButtonPressed: {
      opacity: 0.7,
    },
    deleteButtonText: {
      color: '#FF3B30',
      fontSize: 14,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 48,
    },
    emptyText: {
      fontSize: 16,
      color: palette.muted,
      textAlign: 'center',
      marginTop: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: palette.card,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: palette.border,
    },
    modalHeader: {
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: palette.text,
      marginTop: 12,
      textAlign: 'center',
    },
    modalWarning: {
      fontSize: 14,
      color: palette.muted,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 20,
    },
    modalInput: {
      backgroundColor: palette.input,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 14,
      fontSize: 15,
      color: palette.text,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonCancel: {
      backgroundColor: palette.input,
      borderWidth: 1,
      borderColor: palette.border,
    },
    modalButtonCancelText: {
      color: palette.text,
      fontSize: 16,
      fontWeight: '600',
    },
    modalButtonDelete: {
      backgroundColor: '#FF3B30',
    },
    modalButtonDisabled: {
      opacity: 0.5,
    },
    modalButtonDeleteText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
};
