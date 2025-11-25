import { Badge } from '@/components/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { ForumThread, useForum } from '@/contexts/ForumContext';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme
} from 'react-native';
import { API_URL } from '../../config';

type FilterMode = 'all' | 'mine';

export default function ForumScreen() {
  const colorScheme = useColorScheme();
  const {
    threads,
    createThread,
    updateThread,
    deleteThread: removeThread,
    loading,
    error,
    refresh
  } = useForum();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<TextInput | null>(null);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [threadModalVisible, setThreadModalVisible] = useState(false);
  const [editingThread, setEditingThread] = useState<ForumThread | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAttachment, setFormAttachment] = useState<string | null>(null);
  const [pickingAttachment, setPickingAttachment] = useState(false);
  const [threadBadges, setThreadBadges] = useState<Record<string, 'Champion' | 'RisingStar' | 'Student' | 'Teacher'>>({});
  
  // Advanced search state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState<ForumThread[]>([]);
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    keyword: '',
    author: '',
    sortBy: 'latest' as 'latest' | 'oldest',
    startDate: '',
    endDate: '',
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateValue, setStartDateValue] = useState<Date | null>(null);
  const [endDateValue, setEndDateValue] = useState<Date | null>(null);

  const sortedThreads = useMemo(
    () =>
      [...threads].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [threads]
  );

  const filteredThreads = useMemo(() => {
    const filteredByOwnership =
      filter === 'mine'
        ? sortedThreads.filter((thread) => canManageThread(thread, user?.id, user?.username, user?.email))
        : sortedThreads;

    if (!searchQuery.trim()) return filteredByOwnership;

    const query = searchQuery.toLowerCase();
    return filteredByOwnership.filter(
      (thread) =>
        thread.title.toLowerCase().includes(query) ||
        thread.content.toLowerCase().includes(query) ||
        thread.comments.some((comment) => comment.content.toLowerCase().includes(query))
    );
  }, [sortedThreads, filter, searchQuery, user?.id, user?.username, user?.email]);

  // Fetch badges for all thread authors
  useEffect(() => {
    if (threads.length === 0) {
      setThreadBadges({});
      return;
    }

    const fetchBadges = async () => {
      const badgeMap: Record<string, 'Champion' | 'RisingStar' | 'Student' | 'Teacher'> = {};
      
      for (const thread of threads) {
        if (thread.authorId && !badgeMap[thread.authorId]) {
          try {
            const res = await fetch(`${API_URL}/api/users/${thread.authorId}/badge`);
            if (res.ok) {
              const badgeData = await res.json();
              badgeMap[thread.authorId] = badgeData.badgeType;
            }
          } catch (err) {
            console.error('Error fetching badge for thread author:', err);
          }
        }
      }
      
      setThreadBadges(badgeMap);
    };

    fetchBadges();
  }, [threads]);

  const openThreadComposer = useCallback((thread?: ForumThread) => {
    if (thread && !canManageThread(thread, user?.id, user?.username, user?.email)) {
      Alert.alert(t('forum_list.alert_permission_title'), t('forum_list.alert_permission_body'));
      return;
    }
    setEditingThread(thread ?? null);
    setFormTitle(thread?.title ?? '');
    setFormContent(thread?.content ?? '');
    setFormAttachment(thread?.attachment ?? null);
    setThreadModalVisible(true);
  }, [user?.id, user?.username, user?.email]);

  useEffect(() => {
    const action = typeof params.action === 'string' ? params.action : undefined;
    if (!action) return;

    if (action === 'create') {
      openThreadComposer();
    } else if (action === 'search') {
      setTimeout(() => searchRef.current?.focus(), 200);
    } else if (action === 'my-posts') {
      setFilter('mine');
    }
  }, [params.action, openThreadComposer]);

  function closeThreadComposer() {
    setThreadModalVisible(false);
    setEditingThread(null);
    setFormTitle('');
    setFormContent('');
    setFormAttachment(null);
  }

  function submitThread() {
    const title = formTitle.trim();
    const content = formContent.trim();
    if (!title) {
      Alert.alert(t('forum_list.alert_missing_title'), t('forum_list.alert_missing_title_message'));
      return;
    }
    if (!content) {
      Alert.alert(t('forum_list.alert_missing_title'), t('forum_list.alert_missing_content'));
      return;
    }

    if (editingThread) {
      if (user?.id == null) {
        Alert.alert(t('forum_list.alert_signin_title'), t('forum_list.alert_signin_body'));
        return;
      }
      updateThread({
        id: editingThread.id,
        title,
        content,
        authorId: user?.id != null ? Number(user.id) : null,
        attachment: typeof formAttachment === 'string' ? formAttachment : null,
      }).then((updated) => {
        if (updated) {
          closeThreadComposer();
        }
      });
      return;
    }

    if (user?.id == null) {
      Alert.alert(t('forum_list.alert_signin_title'), t('forum_list.alert_start_discussion'));
      return;
    }

    createThread({
      title,
      content,
      authorId: user?.id != null ? Number(user.id) : null,
      attachment: typeof formAttachment === 'string' ? formAttachment : null,
    }).then((created) => {
      if (created) {
        closeThreadComposer();
        router.push({ pathname: '/forum/[id]', params: { id: created.id } });
      }
    });
  }

  async function pickAttachment() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
      Alert.alert(
        t('forum_list.attachment_permission_title'),
        t('forum_list.attachment_permission_message')
      );
        return;
      }
      setPickingAttachment(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        if (!asset.base64) {
          Alert.alert(
            t('forum_list.attachment_error_title'),
            t('forum_list.attachment_unreadable')
          );
          return;
        }
        const mime = asset.mimeType ?? 'image/jpeg';
        setFormAttachment(`data:${mime};base64,${asset.base64}`);
      }
    } catch (err) {
      console.error('Image picker error', err);
      Alert.alert(
        t('forum_list.attachment_error_title'),
        t('forum_list.attachment_generic_error')
      );
    } finally {
      setPickingAttachment(false);
    }
  }

  // Advanced search function
  const performAdvancedSearch = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchFilters.keyword) params.append('keyword', searchFilters.keyword);
      if (searchFilters.author) params.append('author', searchFilters.author);
      if (searchFilters.sortBy) params.append('sortBy', searchFilters.sortBy);
      if (searchFilters.startDate) params.append('startDate', searchFilters.startDate);
      if (searchFilters.endDate) params.append('endDate', searchFilters.endDate);

      const response = await fetch(`${API_URL}/api/forum/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Advanced search failed');
      }
      const data = await response.json();
      
      // Normalize the threads
      const normalizedThreads = data.map((thread: any) => ({
        id: String(thread.id),
        title: thread.title,
        content: thread.content,
        attachment: thread.attachment ?? null,
        authorId: String(thread.authorId),
        authorName: thread.author?.username || thread.author?.email || 'Unknown user',
        authorRole: thread.author?.role ?? null,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        comments: (thread.comments || []).map((comment: any) => ({
          id: String(comment.id),
          threadId: String(comment.threadId),
          content: comment.content,
          authorId: comment.authorId != null ? String(comment.authorId) : '',
          authorName: comment.author?.username || comment.author?.email || 'Unknown user',
          authorRole: comment.author?.role ?? null,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        })),
      }));

      setAdvancedSearchResults(normalizedThreads);
      setIsAdvancedSearch(true);
      setShowFilterModal(false);
    } catch (err) {
      console.error('Advanced search error:', err);
      Alert.alert('Error', 'Failed to perform advanced search');
    }
  }, [searchFilters]);

  const resetFilters = useCallback(() => {
    setSearchFilters({
      keyword: '',
      author: '',
      sortBy: 'latest',
      startDate: '',
      endDate: '',
    });
    setStartDateValue(null);
    setEndDateValue(null);
    setIsAdvancedSearch(false);
    setAdvancedSearchResults([]);
  }, []);

  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateForAPI = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDateValue(selectedDate);
      setSearchFilters(prev => ({ ...prev, startDate: formatDateForAPI(selectedDate) }));
    }
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowStartDatePicker(false);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDateValue(selectedDate);
      setSearchFilters(prev => ({ ...prev, endDate: formatDateForAPI(selectedDate) }));
    }
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowEndDatePicker(false);
    }
  };

  function confirmDeleteThread(thread: ForumThread) {
    if (user?.id == null) {
      Alert.alert(t('forum_list.alert_signin_title'), t('forum_list.alert_signin_body'));
      return;
    }
    Alert.alert(
      t('forum_list.delete_thread_title'),
      t('forum_list.delete_thread_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await removeThread(thread.id, Number(user.id));
            if (!success) {
              Alert.alert(
                t('forum_list.delete_failed_title'),
                t('forum_list.delete_failed_message')
              );
            }
          }
        }
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('forum_list.title')}</Text>
        <Text style={styles.subtitle}>{t('forum_list.subtitle')}</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <IconSymbol name="magnifyingglass" size={18} color="#6B7280" />
          <TextInput
            ref={searchRef}
            placeholder={t('forum_list.search_placeholder')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // Reset to basic search when typing in main search
              if (isAdvancedSearch) {
                setIsAdvancedSearch(false);
                setAdvancedSearchResults([]);
              }
            }}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        <Pressable 
          style={[
            styles.filterButton, 
            isAdvancedSearch && styles.filterButtonActive,
            { 
              backgroundColor: isAdvancedSearch 
                ? '#2563EB' 
                : (colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F8FAFC'),
              borderColor: isAdvancedSearch 
                ? '#2563EB' 
                : (colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : '#E2E8F0'),
            }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <MaterialIcons 
            name="tune" 
            size={20} 
            color={isAdvancedSearch ? '#FFFFFF' : (colorScheme === 'dark' ? '#F8FAFC' : '#1E293B')} 
          />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <FilterPill
          label={t('forum_list.filter_all')}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterPill
          label={t('forum_list.filter_mine')}
          active={filter === 'mine'}
          onPress={() => setFilter('mine')}
        />
      </View>

      <FlatList
        data={filteredThreads}
        keyExtractor={(thread) => thread.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="text.bubble" size={36} color="#93C5FD" />
            <Text style={styles.emptyTitle}>{t('forum_list.empty_title')}</Text>
            <Text style={styles.emptySubtitle}>{t('forum_list.empty_description')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const repliesCount = item.comments.length;
          const lastComment = repliesCount > 0 ? item.comments[repliesCount - 1] : null;
          const lastAuthor = lastComment ? lastComment.authorName : item.authorName;
          const lastTimestamp = lastComment ? lastComment.updatedAt : item.updatedAt;

          return (
            <Pressable
              style={({ pressed }) => [
                styles.threadCard,
                colorScheme === 'dark' ? styles.threadCardDark : styles.threadCardLight,
                { opacity: pressed ? 0.94 : 1 },
              ]}
              onPress={() => router.push({ pathname: '/forum/[id]', params: { id: item.id } })}
            >
              <View style={styles.threadCardHeader}>
                <Text
                  style={[
                    styles.threadTitle,
                    colorScheme === 'dark' && styles.threadTitleDark,
                  ]}
                >
                  {item.title}
                </Text>
                {(canManageThread(item, user?.id, user?.username, user?.email) ||
                  canDeleteThread(item, user?.id, user?.username, user?.email, user?.role)) && (
                  <View style={styles.threadActions}>
                    {canManageThread(item, user?.id, user?.username, user?.email) && (
                      <Pressable
                        style={[
                          styles.editPill,
                          colorScheme === 'dark' && styles.editPillDark,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          openThreadComposer(item);
                        }}
                      >
                        <IconSymbol name="pencil" size={14} color={colorScheme === 'dark' ? '#BFDBFE' : '#2563EB'} />
                        <Text
                          style={[
                            styles.editPillText,
                            colorScheme === 'dark' && styles.editPillTextDark,
                          ]}
                        >
                          {t('forum_list.action_edit')}
                        </Text>
                      </Pressable>
                    )}
                    {canDeleteThread(item, user?.id, user?.username, user?.email, user?.role) && (
                      <Pressable
                        style={styles.deletePill}
                        onPress={(event) => {
                          event.stopPropagation();
                          confirmDeleteThread(item);
                        }}
                      >
                        <IconSymbol name="trash.circle.fill" size={14} color="#DC2626" />
                        <Text style={styles.deletePillText}>{t('forum_list.action_delete')}</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>

              {item.attachment ? (
                <Image
                  source={{ uri: item.attachment }}
                  style={styles.threadAttachment}
                  contentFit="cover"
                />
              ) : null}

              <View style={styles.threadInfoRow}>
                <IconSymbol name="person.fill" size={18} color="#60A5FA" />
                <View style={styles.threadAuthorRow}>
                  <Text
                    style={[
                      styles.threadInfoText,
                      colorScheme === 'dark' && styles.threadInfoTextDark,
                    ]}
                  >
                    {t('forum_list.started_by', { name: item.authorName })}
                  </Text>
                  {item.authorId && threadBadges[item.authorId] && (
                    <Badge badgeType={threadBadges[item.authorId]} size="small" />
                  )}
                </View>
              </View>

              <View style={styles.threadInfoRow}>
                <IconSymbol name="text.bubble.fill" size={18} color="#60A5FA" />
                <Text
                  style={[
                    styles.threadInfoText,
                    colorScheme === 'dark' && styles.threadInfoTextDark,
                  ]}
                >
                  {t('forum_list.replies_count', { count: repliesCount })}
                </Text>
              </View>

              <View style={[styles.threadInfoRow, styles.threadLastPostRow]}>
                <IconSymbol name="clock.fill" size={18} color="#60A5FA" />
                <Text
                  style={[
                    styles.threadInfoText,
                    colorScheme === 'dark' && styles.threadInfoTextDark,
                  ]}
                >
                  {t('forum_list.last_post', {
                    name: lastAuthor,
                    date: formatFullDate(lastTimestamp, t),
                  })}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FACC15" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={refresh}>
            <Text style={styles.errorLink}>{t('forum_list.error_banner')}</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={threadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeThreadComposer}
      >
        <Pressable style={styles.modalOverlay} onPress={closeThreadComposer}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {editingThread
                ? t('forum_list.modal_edit_title')
                : t('forum_list.modal_create_title')}
            </Text>
            <TextInput
              placeholder={t('forum_list.modal_title_placeholder')}
              placeholderTextColor="#94A3B8"
              value={formTitle}
              onChangeText={setFormTitle}
              style={styles.modalInput}
            />
            <View style={styles.textareaContainer}>
              <TextInput
                placeholder={t('forum_list.modal_content_placeholder')}
                placeholderTextColor="#94A3B8"
                value={formContent}
                onChangeText={setFormContent}
                style={[styles.modalInput, styles.modalTextarea]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.codeHint}>
                {t('forum_list.code_hint', { defaultValue: 'Tip: Use ``` to wrap your code blocks.' })}
              </Text>
            </View>
            <View style={styles.attachmentSection}>
              <Text
                style={[
                  styles.attachmentLabel,
                  { color: colorScheme === 'dark' ? '#E2E8F0' : '#1E293B' },
                ]}
              >
                {t('forum_list.attachment_label')}
              </Text>
              {formAttachment ? (
                <View style={styles.attachmentPreview}>
                  <Image
                    source={{ uri: formAttachment }}
                    style={styles.attachmentImage}
                    contentFit="cover"
                  />
                  <Pressable
                    style={styles.attachmentRemove}
                    onPress={() => setFormAttachment(null)}
                  >
                    <IconSymbol name="xmark.circle.fill" size={18} color="#DC2626" />
                    <Text style={styles.attachmentRemoveText}>{t('common.delete')}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[
                    styles.attachmentPicker,
                    {
                      borderColor:
                        colorScheme === 'dark'
                          ? 'rgba(147, 197, 253, 0.45)'
                          : 'rgba(37, 99, 235, 0.3)',
                      backgroundColor:
                        colorScheme === 'dark'
                          ? 'rgba(37, 99, 235, 0.22)'
                          : 'rgba(59,130,246,0.08)',
                    },
                  ]}
                  onPress={pickAttachment}
                  disabled={pickingAttachment}
                >
                  <IconSymbol
                    name="photo.on.rectangle"
                    size={20}
                    color="#2563EB"
                  />
                  <Text
                    style={[
                      styles.attachmentPickerText,
                      { color: colorScheme === 'dark' ? '#DBEAFE' : '#1D4ED8' },
                    ]}
                  >
                      {pickingAttachment
                        ? t('forum_list.attachment_loading')
                        : t('forum_list.attachment_button')}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={closeThreadComposer}>
                <Text style={styles.modalSecondaryText}>{t('forum_list.modal_cancel')}</Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={submitThread}>
                <Text style={styles.modalPrimaryText}>
                  {editingThread
                    ? t('forum_list.modal_save')
                    : t('forum_list.modal_publish')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Floating Action Button for New Thread */}
      <Pressable
        style={styles.fabButton}
        onPress={() => openThreadComposer()}
        accessibilityLabel={t('forum_list.new_thread')}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      {/* Advanced Search Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <Pressable 
            style={[
              styles.filterModalCard,
              { backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF' }
            ]} 
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[
              styles.filterModalTitle,
              { color: colorScheme === 'dark' ? '#F8FAFC' : '#0F172A' }
            ]}>
              Advanced Search
            </Text>
            
            {/* Keyword Search */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colorScheme === 'dark' ? '#E2E8F0' : '#1E293B' }]}>
                Keyword
              </Text>
              <TextInput
                style={[styles.filterInput, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F8FAFC',
                  color: colorScheme === 'dark' ? '#F8FAFC' : '#0F172A',
                }]}
                placeholder="Search in title or content"
                placeholderTextColor="#94A3B8"
                value={searchFilters.keyword}
                onChangeText={(text) => setSearchFilters(prev => ({ ...prev, keyword: text }))}
              />
            </View>

            {/* Author Search */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colorScheme === 'dark' ? '#E2E8F0' : '#1E293B' }]}>
                Author
              </Text>
              <TextInput
                style={[styles.filterInput, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F8FAFC',
                  color: colorScheme === 'dark' ? '#F8FAFC' : '#0F172A',
                }]}
                placeholder="Search by author username"
                placeholderTextColor="#94A3B8"
                value={searchFilters.author}
                onChangeText={(text) => setSearchFilters(prev => ({ ...prev, author: text }))}
              />
            </View>

            {/* Sort Order */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colorScheme === 'dark' ? '#E2E8F0' : '#1E293B' }]}>
                Sort Order
              </Text>
              <View style={styles.sortOptions}>
                <Pressable
                  style={[
                    styles.sortOption,
                    searchFilters.sortBy === 'latest' && styles.sortOptionActive,
                    { 
                      backgroundColor: searchFilters.sortBy === 'latest' 
                        ? '#2563EB' 
                        : (colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F8FAFC'),
                    }
                  ]}
                  onPress={() => setSearchFilters(prev => ({ ...prev, sortBy: 'latest' }))}
                >
                  <Text style={[
                    styles.sortOptionText,
                    { color: searchFilters.sortBy === 'latest' ? '#FFFFFF' : (colorScheme === 'dark' ? '#F8FAFC' : '#0F172A') }
                  ]}>
                    Newest First
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.sortOption,
                    searchFilters.sortBy === 'oldest' && styles.sortOptionActive,
                    { 
                      backgroundColor: searchFilters.sortBy === 'oldest' 
                        ? '#2563EB' 
                        : (colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F8FAFC'),
                    }
                  ]}
                  onPress={() => setSearchFilters(prev => ({ ...prev, sortBy: 'oldest' }))}
                >
                  <Text style={[
                    styles.sortOptionText,
                    { color: searchFilters.sortBy === 'oldest' ? '#FFFFFF' : (colorScheme === 'dark' ? '#F8FAFC' : '#0F172A') }
                  ]}>
                    Oldest First
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colorScheme === 'dark' ? '#E2E8F0' : '#1E293B' }]}>
                Date Range
              </Text>
              <Pressable
                onPress={() => setShowStartDatePicker(true)}
                style={[styles.datePickerButton, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F8FAFC',
                  marginBottom: 8,
                }]}
              >
                <MaterialIcons 
                  name="calendar-today" 
                  size={18} 
                  color={colorScheme === 'dark' ? '#93C5FD' : '#2563EB'} 
                />
                <Text style={[styles.datePickerButtonText, { 
                  color: startDateValue 
                    ? (colorScheme === 'dark' ? '#F8FAFC' : '#0F172A')
                    : '#94A3B8'
                }]}>
                  {startDateValue ? formatDateForDisplay(startDateValue) : 'Start Date'}
                </Text>
                {startDateValue && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setStartDateValue(null);
                      setSearchFilters(prev => ({ ...prev, startDate: '' }));
                    }}
                    style={styles.clearDateButton}
                  >
                    <MaterialIcons
                      name="close"
                      size={16}
                      color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                    />
                  </Pressable>
                )}
              </Pressable>
              
              {/* Start Date Picker - iOS */}
              {showStartDatePicker && Platform.OS === 'ios' && (
                <Modal
                  visible={showStartDatePicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowStartDatePicker(false)}
                >
                  <Pressable
                    style={styles.calendarModalOverlay}
                    onPress={() => setShowStartDatePicker(false)}
                  >
                    <Pressable
                      style={[styles.calendarModalContent, {
                        backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF'
                      }]}
                      onPress={(e) => e.stopPropagation()}
                    >
                      <View style={styles.calendarModalHeader}>
                        <Text style={[styles.calendarModalTitle, {
                          color: colorScheme === 'dark' ? '#F8FAFC' : '#0F172A'
                        }]}>
                          Select Start Date
                        </Text>
                        <Pressable
                          onPress={() => setShowStartDatePicker(false)}
                          style={styles.calendarModalCloseButton}
                        >
                          <MaterialIcons
                            name="close"
                            size={24}
                            color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                          />
                        </Pressable>
                      </View>
                      <View style={styles.calendarPickerContainer}>
                        <DateTimePicker
                          value={startDateValue || new Date()}
                          mode="date"
                          display="calendar"
                          onChange={handleStartDateChange}
                          maximumDate={endDateValue || new Date()}
                          themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                        />
                      </View>
                      <View style={styles.calendarModalActions}>
                        <Pressable
                          onPress={() => setShowStartDatePicker(false)}
                          style={styles.calendarActionButton}
                        >
                          <Text style={styles.calendarActionButtonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setShowStartDatePicker(false)}
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
              
              {/* Start Date Picker - Android */}
              {showStartDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={startDateValue || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleStartDateChange}
                  maximumDate={endDateValue || new Date()}
                />
              )}

              <Pressable
                onPress={() => setShowEndDatePicker(true)}
                style={[styles.datePickerButton, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F8FAFC',
                }]}
              >
                <MaterialIcons 
                  name="calendar-today" 
                  size={18} 
                  color={colorScheme === 'dark' ? '#93C5FD' : '#2563EB'} 
                />
                <Text style={[styles.datePickerButtonText, { 
                  color: endDateValue 
                    ? (colorScheme === 'dark' ? '#F8FAFC' : '#0F172A')
                    : '#94A3B8'
                }]}>
                  {endDateValue ? formatDateForDisplay(endDateValue) : 'End Date'}
                </Text>
                {endDateValue && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setEndDateValue(null);
                      setSearchFilters(prev => ({ ...prev, endDate: '' }));
                    }}
                    style={styles.clearDateButton}
                  >
                    <MaterialIcons
                      name="close"
                      size={16}
                      color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                    />
                  </Pressable>
                )}
              </Pressable>
              
              {/* End Date Picker - iOS */}
              {showEndDatePicker && Platform.OS === 'ios' && (
                <Modal
                  visible={showEndDatePicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowEndDatePicker(false)}
                >
                  <Pressable
                    style={styles.calendarModalOverlay}
                    onPress={() => setShowEndDatePicker(false)}
                  >
                    <Pressable
                      style={[styles.calendarModalContent, {
                        backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF'
                      }]}
                      onPress={(e) => e.stopPropagation()}
                    >
                      <View style={styles.calendarModalHeader}>
                        <Text style={[styles.calendarModalTitle, {
                          color: colorScheme === 'dark' ? '#F8FAFC' : '#0F172A'
                        }]}>
                          Select End Date
                        </Text>
                        <Pressable
                          onPress={() => setShowEndDatePicker(false)}
                          style={styles.calendarModalCloseButton}
                        >
                          <MaterialIcons
                            name="close"
                            size={24}
                            color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                          />
                        </Pressable>
                      </View>
                      <View style={styles.calendarPickerContainer}>
                        <DateTimePicker
                          value={endDateValue || new Date()}
                          mode="date"
                          display="calendar"
                          onChange={handleEndDateChange}
                          minimumDate={startDateValue || undefined}
                          maximumDate={new Date()}
                          themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                        />
                      </View>
                      <View style={styles.calendarModalActions}>
                        <Pressable
                          onPress={() => setShowEndDatePicker(false)}
                          style={styles.calendarActionButton}
                        >
                          <Text style={styles.calendarActionButtonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setShowEndDatePicker(false)}
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
              
              {/* End Date Picker - Android */}
              {showEndDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={endDateValue || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleEndDateChange}
                  minimumDate={startDateValue || undefined}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Actions */}
            <View style={styles.filterActions}>
              <Pressable
                style={[styles.filterButtonReset]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.filterButtonResetText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.filterButtonApply]}
                onPress={performAdvancedSearch}
              >
                <Text style={styles.filterButtonApplyText}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[
        styles.filterPill,
        active ? styles.filterPillActive : styles.filterPillInactive,
      ]}
      onPress={onPress}
    >
      <Text style={active ? styles.filterPillActiveText : styles.filterPillText}>{label}</Text>
    </Pressable>
  );
}

function canManageThread(
  thread: ForumThread,
  userId?: string | number | null,
  username?: string | null,
  email?: string
) {
  if (!userId && !username && !email) return false;
  if (thread.authorId && userId !== null && userId !== undefined) {
    return thread.authorId === String(userId);
  }
  const identifier = username || email;
  if (!identifier) return false;
  return thread.authorName === identifier || thread.authorName.startsWith(identifier);
}

function canDeleteThread(
  thread: ForumThread,
  userId?: string | number | null,
  username?: string | null,
  email?: string,
  userRole?: string | null
) {
  // Check if user is the owner
  const isOwner = canManageThread(thread, userId, username, email);
  if (isOwner) return true;
  
  // Allow teachers to delete threads posted by students
  const actorIsTeacher = userRole === 'Teacher';
  const targetIsStudent = thread.authorRole === 'Student';
  
  return actorIsTeacher && targetIsStudent;
}

function formatFullDate(timestamp: string, translate: (key: string, options?: any) => string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return translate('forum_list.format_unknown');
  return `${date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
    position: 'relative',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#475569',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillInactive: {
    borderColor: '#CBD5F5',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  filterPillText: {
    color: '#1E293B',
    fontWeight: '500',
  },
  filterPillActiveText: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  threadCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  threadCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  threadCardDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderColor: 'rgba(148, 163, 184, 0.22)',
    shadowColor: '#0A1628',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  threadCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  threadTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  threadTitleDark: {
    color: '#E2E8F0',
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editPillDark: {
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
    borderColor: 'rgba(191, 219, 254, 0.4)',
  },
  editPillText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 13,
  },
  editPillTextDark: {
    color: '#DBEAFE',
  },
  threadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deletePillText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
  threadInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  threadAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  threadAttachment: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  threadInfoText: {
    fontSize: 13,
    color: '#475569',
  },
  threadInfoTextDark: {
    color: '#CBD5F5',
  },
  threadInfoHighlight: {
    fontWeight: '600',
    color: '#1D4ED8',
  },
  threadInfoHighlightDark: {
    color: '#93C5FD',
  },
  threadLastPostRow: {
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptySubtitle: {
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
    fontSize: 14,
  },
  errorBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
  },
  errorLink: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    gap: 20,
    width: '95%',
    maxWidth: 700,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textareaContainer: {
    gap: 8,
  },
  modalTextarea: {
    height: 160,
  },
  codeHint: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 8,
    paddingLeft: 4,
  },
  attachmentSection: {
    gap: 10,
  },
  attachmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  attachmentPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  attachmentPickerText: {
    fontSize: 14,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  attachmentPreview: {
    gap: 10,
  },
  attachmentImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  attachmentRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentRemoveText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  modalSecondaryText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  modalPrimary: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    gap: 20,
    alignSelf: 'center',
  },
  filterModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  sortOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortOptionActive: {
    borderColor: '#2563EB',
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filterButtonReset: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  filterButtonResetText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  filterButtonApply: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  filterButtonApplyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  datePickerButtonText: {
    flex: 1,
    fontSize: 15,
  },
  clearDateButton: {
    padding: 4,
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  calendarModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarModalCloseButton: {
    padding: 4,
  },
  calendarPickerContainer: {
    paddingVertical: 20,
  },
  calendarModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  calendarActionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  calendarActionButtonPrimary: {
    backgroundColor: '#2563EB',
  },
  calendarActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  calendarActionButtonTextPrimary: {
    color: '#FFFFFF',
  },
});

