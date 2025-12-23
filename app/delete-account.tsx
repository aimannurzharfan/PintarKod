import { Badge } from '@/components/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { API_URL } from '../config';

/**
 * Resolves the correct avatar URI for a user.
 * Supports base64 images, remote URLs, and API-served avatars.
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

/**
 * DeleteAccountScreen
 * Allows teachers to search for students and permanently delete accounts.
 * Includes strict role-based access control and confirmation safeguards.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedStudentBadge, setSelectedStudentBadge] = useState<{
    badgeType: 'Champion' | 'RisingStar' | 'Student' | 'Teacher';
  } | null>(null);

  const [studentBadges, setStudentBadges] = useState<
    Record<string, 'Champion' | 'RisingStar' | 'Student' | 'Teacher'>
  >({});

  /**
   * Avatar component for student list and card
   */
  const StudentAvatar = ({
    profileImage,
    avatarUrl,
  }: {
    profileImage?: string | null;
    avatarUrl?: string | null;
  }) => {
    const uri = resolveAvatarUri(profileImage, avatarUrl);
    if (!uri) {
      return (
        <View style={styles.studentAvatarPlaceholder}>
          <IconSymbol size={24} name="person.fill" color="#fff" />
        </View>
      );
    }
    return <Image source={{ uri }} style={styles.studentAvatar} />;
  };

  /**
   * Ensure only teachers can access this screen
   */
  useEffect(() => {
    if (currentUser?.role !== 'Teacher') {
      Alert.alert(
        t('delete_student.access_denied_title'),
        t('delete_student.access_denied_message')
      );
      router.back();
    }
  }, [currentUser, router, t]);

  /**
   * Fetch badge for selected student
   */
  useEffect(() => {
    if (!selectedStudent?.id) {
      setSelectedStudentBadge(null);
      return;
    }

    const fetchBadge = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/${selectedStudent.id}/badge`);
        if (res.ok) {
          const badgeData = await res.json();
          setSelectedStudentBadge(badgeData);
        } else {
          setSelectedStudentBadge(null);
        }
      } catch (err) {
        console.error('Error fetching badge:', err);
        setSelectedStudentBadge(null);
      }
    };

    fetchBadge();
  }, [selectedStudent]);

  /**
   * Fetch badges for search results list
   */
  useEffect(() => {
    if (searchResults.length === 0) {
      setStudentBadges({});
      return;
    }

    const fetchBadges = async () => {
      const badgeMap: Record<string, any> = {};

      for (const student of searchResults) {
        if (!student.id) continue;
        try {
          const res = await fetch(`${API_URL}/api/users/${student.id}/badge`);
          if (res.ok) {
            const badgeData = await res.json();
            badgeMap[student.id] = badgeData.badgeType;
          }
        } catch (err) {
          console.error('Error fetching badge:', err);
        }
      }

      setStudentBadges(badgeMap);
    };

    fetchBadges();
  }, [searchResults]);

  /**
   * Search students by username/email (Student role only)
   */
  const searchStudents = async (query: string) => {
    setSelectedStudent(null);
    const searchQ = query.trim().toLowerCase();
    if (!searchQ) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `${API_URL}/api/users/search?q=${encodeURIComponent(searchQ)}&role=Student`
      );
      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      Alert.alert(t('delete_student.error_title'), t('delete_student.search_error'));
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  /**
   * Permanently deletes a student account
   * Requires exact username confirmation
   */
  const confirmDelete = async (username: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert(
          t('delete_student.error_title'),
          data.error || t('delete_student.error_delete_failed')
        );
      } else {
        Alert.alert(t('delete_student.success_title'), t('delete_student.success_message'));
        setSearchResults(searchResults.filter((s) => s.username !== username));
        setSelectedStudent(null);
        setConfirmUsername('');
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t('delete_student.error_title'), t('delete_student.network_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('delete_student.title')}</Text>

      {/* Search */}
      <View style={styles.searchInputContainer}>
        <TextInput
          placeholder={t('delete_student.search_placeholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          autoCapitalize="none"
          placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
          returnKeyType="search"
          onSubmitEditing={() => searchStudents(searchQuery)}
        />
        <Pressable
          onPress={() => searchStudents(searchQuery)}
          disabled={searching}
          style={styles.searchButton}
          accessibilityRole="button"
        >
          <Feather name="search" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Results */}
      {searching && <ActivityIndicator style={styles.loading} />}

      {!searching && searchResults.length === 0 && searchQuery.trim() !== '' && (
        <Text style={styles.studentMeta}>{t('delete_student.no_results')}</Text>
      )}

      {/* Modal */}
      {selectedStudent && (
        <Modal visible={showDeleteModal} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
            <Pressable style={styles.modalContent}>
              <Text style={styles.title}>{t('delete_student.confirm_title')}</Text>
              <Text style={styles.warningText}>
                {t('delete_student.confirm_instructions', {
                  username: selectedStudent.username,
                })}
              </Text>
              <TextInput
                placeholder={t('delete_student.confirm_placeholder')}
                value={confirmUsername}
                onChangeText={setConfirmUsername}
                style={styles.input}
                autoCapitalize="none"
              />
              <Button
                title={t('delete_student.delete')}
                color="#b00"
                disabled={loading || confirmUsername !== selectedStudent.username}
                onPress={() => confirmDelete(selectedStudent.username)}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </ScrollView>
  );
}

/* ======================= Styles ======================= */
const getStyles = (colorScheme: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 20,
      color: colorScheme === 'dark' ? '#FFF' : '#000',
    },
    searchInputContainer: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 20,
      overflow: 'hidden',
    },
    searchInput: {
      flex: 1,
      padding: 12,
      fontSize: 16,
    },
    searchButton: {
      padding: 12,
      backgroundColor: '#2563EB',
    },
    loading: {
      marginVertical: 20,
    },
    studentMeta: {
      textAlign: 'center',
      color: colorScheme === 'dark' ? '#999' : '#666',
    },
    studentAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    studentAvatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#888',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFF',
      padding: 16,
      borderRadius: 12,
    },
    warningText: {
      textAlign: 'center',
      marginBottom: 16,
      color: '#b00',
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
  });
