import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../../config';

type Student = {
  id: number;
  username: string;
  avatarUrl: string | null;
  profileImage: string | null;
  attempts: number;
  bestScore: number;
};

const resolveAvatarUri = (profileImage?: string | null, avatarUrl?: string | null) => {
  // Check profileImage first (base64 data)
  if (profileImage) {
    return profileImage.startsWith('data:') ? profileImage : `data:image/jpeg;base64,${profileImage}`;
  }
  // Fall back to avatarUrl
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  return `${API_URL}${avatarUrl}`;
};

export default function StudentMonitorScreen() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);

  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set header options
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('teacher_ui.monitor_title'),
      headerBackTitleVisible: false,
    });
  }, [navigation, t]);

  // Redirect if not a teacher
  useEffect(() => {
    if (user?.role !== 'Teacher') {
      router.replace('/mainpage');
    }
  }, [user, router]);

  useEffect(() => {
    fetchStudents();
  }, [token]);

  useEffect(() => {
    // Filter students based on search query
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = students.filter((student) =>
        student.username.toLowerCase().includes(query)
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

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

  const renderStudentCard = ({ item }: { item: Student }) => {
    const avatarUri = resolveAvatarUri(item.profileImage, item.avatarUrl);

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentCardLeft}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.studentAvatar}
              resizeMode="cover"
              onError={() => {
                console.log('Failed to load avatar for student:', item.username);
              }}
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
            <Text style={styles.studentBestScore}>
              {t('teacher_ui.best_score')}: {item.bestScore.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.attemptsBadge}>
          <Text style={styles.attemptsText}>
            {item.attempts} {t('teacher_ui.attempts')}
          </Text>
        </View>
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
            <Text style={styles.retryText} onPress={fetchStudents}>
              {t('common.retry')}
            </Text>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Feather
              name="search"
              size={20}
              color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t('teacher_ui.search_placeholder')}
              placeholderTextColor={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <Feather
                name="x"
                size={20}
                color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              />
            )}
          </View>
        </View>

        <FlatList
          data={filteredStudents}
          renderItem={renderStudentCard}
          keyExtractor={(item) => `student-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? t('common.no_results') || 'No students found'
                  : 'No students registered yet'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: isDark ? '#F87171' : '#DC2626',
      marginBottom: 16,
      textAlign: 'center',
    },
    retryText: {
      fontSize: 16,
      color: isDark ? '#3B82F6' : '#2563EB',
      fontWeight: '600',
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: isDark ? '#E2E8F0' : '#1E293B',
    },
    clearButton: {
      padding: 4,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    studentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.02)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
    },
    studentCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    studentAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#ccc',
    },
    studentAvatarFallback: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    studentInfo: {
      flex: 1,
      gap: 4,
    },
    studentUsername: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#1E293B',
    },
    studentBestScore: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    attemptsBadge: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
    },
    attemptsText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#93C5FD' : '#2563EB',
    },
    emptyContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: isDark ? '#94A3B8' : '#64748B',
      textAlign: 'center',
    },
  });
};

