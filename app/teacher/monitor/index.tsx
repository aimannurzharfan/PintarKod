import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
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
  email: string;
  className: string | null;
  avatarUrl: string | null;
  profileImage: string | null;
  attempts: number;
  bestScore: number;
  chatLogsCount: number;
  forumThreadsCount: number;
  forumCommentsCount: number;
  gameStats: Record<string, { attempts: number; bestScore: number }>;
};

type StudentDetails = {
  profile: {
    id: number;
    username: string;
    email: string;
    className: string | null;
    avatarUrl: string | null;
    profileImage: string | null;
  };
  gameStats: Record<string, { attempts: number; bestScore: number }>;
  materialProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  chatLogs: ChatLog[];
  forumStats: {
    threads: number;
    comments: number;
  };
};

type ChatLog = {
  id: number;
  message: string;
  response: string | null;
  createdAt: string;
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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistoryFilter, setChatHistoryFilter] = useState<'all' | 'date'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Set header options
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('teacher_ui.monitor_title'),
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
        student.username.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        (student.className && student.className.toLowerCase().includes(query))
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

  const handleStudentClick = async (student: Student) => {
    if (!token) {
      Alert.alert('Error', 'Authentication token is missing');
      return;
    }

    setSelectedStudent(student);
    setLoadingDetails(true);
    setStudentDetails(null);
    setShowChatHistory(false);
    setChatHistoryFilter('all');
    setSelectedDate(null);
    setShowDatePicker(false);

    try {
      const url = `${API_URL}/api/teacher/students/${student.id}/details`;
      console.log('Fetching student details from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Failed to fetch student details (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          const text = await response.text().catch(() => '');
          if (text) {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }

      const data: StudentDetails = await response.json();
      console.log('Student details fetched successfully:', data);
      setStudentDetails(data);
    } catch (err) {
      console.error('Error fetching student details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch student details';
      console.error('Error details:', errorMessage);
      setStudentDetails(null);
      // Show error to user
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatGameName = (gameType: string): string => {
    // Convert "DEBUGGING_QUIZ" to "Debugging Quiz"
    return gameType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getFilteredChatLogs = (): ChatLog[] => {
    if (!studentDetails) return [];
    
    if (chatHistoryFilter === 'all') {
      return studentDetails.chatLogs;
    }
    
    // Filter by date
    if (!selectedDate) return studentDetails.chatLogs;
    
    const filterDate = new Date(selectedDate);
    filterDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(filterDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    return studentDetails.chatLogs.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= filterDate && logDate < nextDay;
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && date) {
        setSelectedDate(date);
        setShowDatePicker(false);
      } else if (event.type === 'dismissed') {
        setShowDatePicker(false);
      }
    } else {
      // iOS: date is always provided, we control visibility separately
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  const formatSelectedDate = (): string => {
    if (!selectedDate) return 'Select date';
    return selectedDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

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
              {item.className && (
                <Text style={styles.studentClassName}>{item.className}</Text>
              )}
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
        <Pressable
          style={({ pressed }) => [
            styles.viewDetailsButton,
            pressed && styles.viewDetailsButtonPressed,
          ]}
          onPress={() => handleStudentClick(item)}
        >
          <Feather
            name="eye"
            size={16}
            color={colorScheme === 'dark' ? '#93C5FD' : '#2563EB'}
          />
          <Text style={styles.viewDetailsButtonText}>
            View Details
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

        {/* Student Details Modal */}
        <Modal
          visible={selectedStudent !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setSelectedStudent(null);
            setStudentDetails(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedStudent ? `Student Details - ${selectedStudent.username}` : ''}
                </Text>
                <Pressable
                  onPress={() => {
                    setSelectedStudent(null);
                    setStudentDetails(null);
                  }}
                  style={styles.closeButton}
                >
                  <Feather
                    name="x"
                    size={24}
                    color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                  />
                </Pressable>
              </View>

              {loadingDetails ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#FACC15' : '#1E293B'} />
                </View>
              ) : studentDetails ? (
                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Header: Avatar, Name, Email, Class */}
                  <View style={styles.detailHeader}>
                    {studentDetails.profile.profileImage || studentDetails.profile.avatarUrl ? (
                      <Image
                        source={{
                          uri: resolveAvatarUri(
                            studentDetails.profile.profileImage,
                            studentDetails.profile.avatarUrl
                          ),
                        }}
                        style={styles.detailAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.detailAvatar, styles.detailAvatarFallback]}>
                        <Feather
                          name="user"
                          size={32}
                          color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                        />
                      </View>
                    )}
                    <View style={styles.detailHeaderInfo}>
                      <Text style={styles.detailName}>{studentDetails.profile.username}</Text>
                      <Text style={styles.detailEmail}>{studentDetails.profile.email}</Text>
                      {studentDetails.profile.className && (
                        <Text style={styles.detailClass}>Class: {studentDetails.profile.className}</Text>
                      )}
                    </View>
                  </View>

                  {/* Section 1: Game Performance */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionCardTitle}>Game Performance</Text>
                    {Object.keys(studentDetails.gameStats).length === 0 ? (
                      <Text style={styles.detailEmptyText}>No game attempts yet</Text>
                    ) : (
                      <View style={styles.gameStatsGrid}>
                        {Object.entries(studentDetails.gameStats).map(([gameType, stats]) => (
                          <View key={gameType} style={styles.gameStatCard}>
                            <Text style={styles.gameStatType}>{formatGameName(gameType)}</Text>
                            <Text style={styles.gameStatText}>Attempts: {stats.attempts}</Text>
                            <Text style={styles.gameStatText}>Best Score: {stats.bestScore.toLocaleString()}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Section 2: Engagement */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionCardTitle}>Engagement</Text>
                    <View style={styles.engagementContent}>
                      <View style={styles.engagementItem}>
                        <Text style={styles.engagementLabel}>Forum Posts</Text>
                        <Text style={styles.engagementValue}>{studentDetails.forumStats.threads}</Text>
                      </View>
                      <View style={styles.engagementItem}>
                        <Text style={styles.engagementLabel}>Comments</Text>
                        <Text style={styles.engagementValue}>{studentDetails.forumStats.comments}</Text>
                      </View>
                      <View style={styles.engagementItem}>
                        <Text style={styles.engagementLabel}>Learning Progress</Text>
                        <Text style={styles.engagementValue}>{studentDetails.materialProgress.percentage}%</Text>
                      </View>
                      <Text style={styles.engagementSubtext}>
                        {studentDetails.materialProgress.completed} of {studentDetails.materialProgress.total} materials completed
                      </Text>
                    </View>
                  </View>

                  {/* Section 3: AI Chat History */}
                  <View style={styles.sectionCard}>
                    <View style={styles.chatHistoryHeader}>
                      <Text style={styles.sectionCardTitle}>AI Chat History</Text>
                      <Pressable
                        onPress={() => setShowChatHistory(!showChatHistory)}
                        style={styles.toggleButton}
                      >
                        <Feather
                          name={showChatHistory ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={colorScheme === 'dark' ? '#93C5FD' : '#2563EB'}
                        />
                        <Text style={styles.toggleButtonText}>
                          {showChatHistory ? 'Hide' : 'Show'}
                        </Text>
                      </Pressable>
                    </View>
                    
                    {showChatHistory && (
                      <>
                        <View style={styles.filterContainer}>
                          <Pressable
                            onPress={() => {
                              setChatHistoryFilter('all');
                              setSelectedDate(null);
                              setShowDatePicker(false);
                            }}
                            style={[
                              styles.filterButton,
                              chatHistoryFilter === 'all' && styles.filterButtonActive
                            ]}
                          >
                            <Text style={[
                              styles.filterButtonText,
                              chatHistoryFilter === 'all' && styles.filterButtonTextActive
                            ]}>
                              All History
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setChatHistoryFilter('date');
                              if (!selectedDate) {
                                setSelectedDate(new Date());
                              }
                            }}
                            style={[
                              styles.filterButton,
                              chatHistoryFilter === 'date' && styles.filterButtonActive
                            ]}
                          >
                            <Text style={[
                              styles.filterButtonText,
                              chatHistoryFilter === 'date' && styles.filterButtonTextActive
                            ]}>
                              Filter by Date
                            </Text>
                          </Pressable>
                        </View>
                        
                        {chatHistoryFilter === 'date' && (
                          <View style={styles.dateFilterContainer}>
                            <Pressable
                              onPress={() => setShowDatePicker(true)}
                              style={styles.datePickerButton}
                            >
                              <Feather
                                name="calendar"
                                size={18}
                                color={colorScheme === 'dark' ? '#93C5FD' : '#2563EB'}
                              />
                              <Text style={styles.datePickerButtonText}>
                                {formatSelectedDate()}
                              </Text>
                              {selectedDate && (
                                <Pressable
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(null);
                                  }}
                                  style={styles.clearDateButton}
                                >
                                  <Feather
                                    name="x"
                                    size={16}
                                    color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                                  />
                                </Pressable>
                              )}
                            </Pressable>
                            
                            {/* Calendar Picker - Android shows native popup, iOS shows inline */}
                            {showDatePicker && Platform.OS === 'ios' && (
                              <Modal
                                visible={showDatePicker}
                                transparent={true}
                                animationType="slide"
                                onRequestClose={() => setShowDatePicker(false)}
                              >
                                <Pressable
                                  style={styles.calendarModalOverlay}
                                  onPress={() => setShowDatePicker(false)}
                                >
                                  <Pressable
                                    style={styles.calendarModalContent}
                                    onPress={(e) => e.stopPropagation()}
                                  >
                                    <View style={styles.calendarModalHeader}>
                                      <Text style={styles.calendarModalTitle}>Select Date</Text>
                                      <Pressable
                                        onPress={() => setShowDatePicker(false)}
                                        style={styles.calendarModalCloseButton}
                                      >
                                        <Feather
                                          name="x"
                                          size={24}
                                          color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                                        />
                                      </Pressable>
                                    </View>
                                    
                                    <View style={styles.calendarPickerContainer}>
                                      <DateTimePicker
                                        value={selectedDate || new Date()}
                                        mode="date"
                                        display="calendar"
                                        onChange={handleDateChange}
                                        maximumDate={new Date()}
                                        themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                                      />
                                    </View>
                                    
                                    <View style={styles.calendarModalActions}>
                                      <Pressable
                                        onPress={() => setShowDatePicker(false)}
                                        style={styles.calendarActionButton}
                                      >
                                        <Text style={styles.calendarActionButtonText}>Cancel</Text>
                                      </Pressable>
                                      <Pressable
                                        onPress={() => setShowDatePicker(false)}
                                        style={[styles.calendarActionButton, styles.calendarActionButtonPrimary]}
                                      >
                                        <Text style={[styles.calendarActionButtonText, styles.calendarActionButtonTextPrimary]}>
                                          Done
                                        </Text>
                                      </Pressable>
                                    </View>
                                  </Pressable>
                                </Pressable>
                              </Modal>
                            )}
                            
                            {/* Android: DateTimePicker shows as native popup, no modal needed */}
                            {showDatePicker && Platform.OS === 'android' && (
                              <DateTimePicker
                                value={selectedDate || new Date()}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                                maximumDate={new Date()}
                              />
                            )}
                          </View>
                        )}
                        
                        {getFilteredChatLogs().length === 0 ? (
                          <Text style={styles.detailEmptyText}>
                            {studentDetails.chatLogs.length === 0 
                              ? 'No chat history' 
                              : 'No chat logs found for selected filter'}
                          </Text>
                        ) : (
                          <View style={styles.chatHistoryList}>
                            {getFilteredChatLogs().map((log) => (
                              <View key={log.id} style={styles.chatLogItem}>
                                <Text style={styles.chatLogDate}>{formatDate(log.createdAt)}</Text>
                                <Text style={styles.chatLogMessage}>{log.message}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>Failed to load student details</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.02)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
      gap: 12,
    },
    studentCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    studentClassName: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '500',
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
    viewDetailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
    },
    viewDetailsButtonPressed: {
      opacity: 0.7,
    },
    viewDetailsButtonText: {
      fontSize: 14,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      minHeight: '50%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#000000',
      flex: 1,
    },
    closeButton: {
      padding: 4,
    },
    modalLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    modalEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    modalEmptyText: {
      fontSize: 16,
      color: isDark ? '#94A3B8' : '#64748B',
      textAlign: 'center',
    },
    modalScrollView: {
      flex: 1,
    },
    modalScrollContent: {
      padding: 20,
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    detailAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#ccc',
      marginRight: 16,
    },
    detailAvatarFallback: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailHeaderInfo: {
      flex: 1,
      gap: 4,
    },
    detailName: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#000000',
    },
    detailEmail: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    detailClass: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '500',
    },
    sectionCard: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.02)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.1)',
    },
    sectionCardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    detailEmptyText: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 12,
    },
    gameStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    gameStatCard: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
      borderRadius: 12,
      padding: 16,
      minWidth: '45%',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
    },
    gameStatType: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#2563EB',
      marginBottom: 12,
    },
    gameStatText: {
      fontSize: 14,
      color: isDark ? '#E2E8F0' : '#1E293B',
      marginBottom: 6,
    },
    engagementContent: {
      gap: 12,
    },
    engagementItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
    },
    engagementLabel: {
      fontSize: 15,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '500',
    },
    engagementValue: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#1E293B',
    },
    engagementSubtext: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 8,
      fontStyle: 'italic',
    },
    chatHistoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
    },
    toggleButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#93C5FD' : '#2563EB',
    },
    filterContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
    },
    filterButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    filterButtonTextActive: {
      color: isDark ? '#93C5FD' : '#2563EB',
    },
    dateFilterContainer: {
      marginBottom: 12,
    },
    datePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      gap: 8,
    },
    datePickerButtonText: {
      flex: 1,
      fontSize: 14,
      color: isDark ? '#E2E8F0' : '#1E293B',
      fontWeight: '500',
    },
    clearDateButton: {
      padding: 4,
    },
    calendarModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    calendarModalContent: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      padding: 20,
      width: '90%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    calendarModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    calendarModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#000000',
    },
    calendarModalCloseButton: {
      padding: 4,
    },
    calendarPickerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
    },
    calendarModalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    calendarActionButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
    },
    calendarActionButtonPrimary: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    },
    calendarActionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    calendarActionButtonTextPrimary: {
      color: isDark ? '#93C5FD' : '#2563EB',
    },
    chatHistoryList: {
      gap: 12,
    },
    chatLogItem: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.02)',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
    },
    chatLogDate: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      marginBottom: 8,
    },
    chatLogMessage: {
      fontSize: 14,
      color: isDark ? '#E2E8F0' : '#1E293B',
      lineHeight: 20,
    },
  });
};

