import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { API_URL } from './config';

const resolveAvatarUri = (profileImage?: string | null, avatarUrl?: string | null) => {
  if (profileImage) {
    return profileImage.startsWith('data:') ? profileImage : `data:image/jpeg;base64,${profileImage}`;
  }
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  return `${API_URL}${avatarUrl}`;
};

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { t } = useTranslation();

  const StudentAvatar = ({ profileImage, avatarUrl }: { profileImage?: string | null; avatarUrl?: string | null }) => {
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

  // Verify current user is a teacher
  useEffect(() => {
    if (currentUser?.role !== 'Teacher') {
      Alert.alert(
        t('delete_student.access_denied_title'),
        t('delete_student.access_denied_message')
      );
      router.back();
    }
  }, [currentUser, router, t]);

  // Search students function
  const searchStudents = async (query: string) => {
    setSelectedStudent(null);
    const searchQ = query.trim();
    if (!searchQ) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQ)}&role=Student`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
      // Only show an alert for actual network/server errors, not for empty results
      Alert.alert(t('delete_student.error_title'), t('delete_student.search_error'));
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Deletion flow is handled from the selectedStudent info card below

  const confirmDelete = async (username: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert(
          t('delete_student.error_title'),
          data.error || t('delete_student.error_delete_failed')
        );
      } else {
        Alert.alert(t('delete_student.success_title'), t('delete_student.success_message'));
        setSearchResults(searchResults.filter(student => student.username !== username));
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

      {/* Search Section */}
      <View style={styles.searchSection}>
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
            accessibilityLabel={t('delete_student.search_button_accessibility')}
            style={({ pressed }) => [
              styles.searchButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Feather
              name="search"
              size={18}
              color={colorScheme === 'dark' ? '#FFFFFF' : '#0F172A'}
            />
          </Pressable>
        </View>
      </View>

      {/* Result / Info Section */}
      <View style={styles.resultsSection}>
        {searching ? (
          <ActivityIndicator style={styles.loading} />
        ) : selectedStudent ? (
          <View style={styles.studentCard}>
            <View style={styles.studentInfo}>
              <StudentAvatar profileImage={selectedStudent.profileImage} avatarUrl={selectedStudent.avatarUrl} />
              <View style={styles.studentDetails}>
                <Text style={[styles.studentName, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                  {selectedStudent.username}
                </Text>
                <Text style={[styles.studentEmail, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                  {selectedStudent.email}
                </Text>
                {selectedStudent.fullName ? (
                  <Text style={[styles.studentMeta, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>{selectedStudent.fullName}</Text>
                ) : null}
                {selectedStudent.role ? (
                  <Text style={[styles.studentMeta, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                    {t('delete_student.student_role', { role: selectedStudent.role })}
                  </Text>
                ) : null}
                {selectedStudent.createdAt ? (
                  <Text style={[styles.studentMeta, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                    {t('delete_student.student_joined', {
                      date: new Date(selectedStudent.createdAt).toLocaleDateString(),
                    })}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable
              onPress={() => setShowDeleteModal(true)}
              style={({ pressed }) => [
                styles.deleteButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <IconSymbol name="trash" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : searchResults.length > 0 ? (
          // show list fallback if searchResults available
          searchResults.map((student) => (
            <View key={student.username} style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <StudentAvatar profileImage={student.profileImage} avatarUrl={student.avatarUrl} />
                <View style={styles.studentDetails}>
                  <Text style={[styles.studentName, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                    {student.username}
                  </Text>
                  <Text style={[styles.studentEmail, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                    {student.email}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setSelectedStudent(student)}
                accessibilityLabel={t('delete_student.select_student')}
                style={({ pressed }) => [
                  styles.selectButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <IconSymbol name="chevron.right" size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
              </Pressable>
            </View>
          ))
        ) : searchQuery.trim().length > 0 ? (
          <Text style={[styles.studentMeta, { textAlign: 'center', color: colorScheme === 'dark' ? '#999' : '#666' }]}>
            {t('delete_student.no_results')}
          </Text>
        ) : null}
      </View>

      {/* Delete action + confirmation modal */}
      {selectedStudent && (
        <>
          <Modal visible={showDeleteModal} transparent animationType="slide" onRequestClose={() => setShowDeleteModal(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
              <Pressable style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFF' }]} onPress={(e) => e.stopPropagation()}>
                <Text style={[styles.title, { fontSize: 20, marginBottom: 8, color: colorScheme === 'dark' ? '#FFF' : '#000' }]}>
                  {t('delete_student.confirm_title')}
                </Text>
                <Text style={styles.warningText}>
                  {t('delete_student.confirm_instructions', { username: selectedStudent.username })}
                </Text>
                <TextInput
                  placeholder={t('delete_student.confirm_placeholder')}
                  value={confirmUsername}
                  onChangeText={setConfirmUsername}
                  style={styles.input}
                  autoCapitalize="none"
                  placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Button title={t('delete_student.cancel')} onPress={() => setShowDeleteModal(false)} />
                  <Button
                    title={loading ? t('delete_student.deleting') : t('delete_student.delete')}
                    color="#b00"
                    onPress={() => {
                      if (confirmUsername !== selectedStudent.username) {
                        Alert.alert(
                          t('delete_student.error_title'),
                          t('delete_student.error_username_mismatch')
                        );
                        return;
                      }
                      setShowDeleteModal(false);
                      confirmDelete(selectedStudent.username);
                    }}
                    disabled={loading || confirmUsername !== selectedStudent.username}
                  />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
    </ScrollView>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7'
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 30,
    textAlign: 'center',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
  },
  searchSection: {
    marginBottom: 20,
  },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
      borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
      borderWidth: 1,
      borderRadius: 8,
      overflow: 'hidden',
    },
  searchInput: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    padding: 12,
    fontSize: 16,
      flex: 1,
  },
    searchButton: {
      padding: 12,
      backgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#F2F2F7',
      borderLeftWidth: 1,
      borderLeftColor: colorScheme === 'dark' ? '#555' : '#CCC',
    },
  resultsSection: {
    marginBottom: 20,
  },
  loading: {
    marginVertical: 20,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DDD',
  },
  studentAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  studentMeta: {
    fontSize: 14,
    marginTop: 2,
  },
  studentEmail: {
    fontSize: 14,
  },
  // prominent red circular delete button shown on selected student's card
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#b00',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  // small select button used in the list fallback to open the user card
  selectButton: {
    padding: 8,
    marginLeft: 8,
  },
  confirmationSection: {
    marginTop: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: colorScheme === 'dark' ? 'rgba(255,0,0,0.1)' : 'rgba(255,0,0,0.05)',
    borderRadius: 8,
  },
  /* removed previous inline delete action button styles (now using right-side delete button) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 16,
  },
  warningText: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#FF6B6B' : '#b00',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
});
