import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { ForumThread, useForum } from '@/contexts/ForumContext';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type FilterMode = 'all' | 'mine';

export default function ForumScreen() {
  const colorScheme = useColorScheme();
  const { threads, createThread, updateThread, loading, error, refresh } = useForum();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<TextInput | null>(null);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [threadModalVisible, setThreadModalVisible] = useState(false);
  const [editingThread, setEditingThread] = useState<ForumThread | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAttachment, setFormAttachment] = useState<string | null>(null);
  const [pickingAttachment, setPickingAttachment] = useState(false);

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

  const openThreadComposer = useCallback((thread?: ForumThread) => {
    if (thread && !canManageThread(thread, user?.id, user?.username, user?.email)) {
      Alert.alert('Permission denied', 'You can only edit threads that you created.');
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
      Alert.alert('Missing title', 'Please enter a thread title.');
      return;
    }
    if (!content) {
      Alert.alert('Missing description', 'Please provide some details for the discussion.');
      return;
    }

    if (editingThread) {
      if (user?.id == null) {
        Alert.alert('Sign in required', 'Please log in before editing your thread.');
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
      Alert.alert('Sign in required', 'You need to be logged in before starting a discussion.');
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
        Alert.alert('Permission needed', 'Please allow access to your photo library to attach an image.');
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
          Alert.alert('Attachment', 'Unable to read the selected image. Please try a different file.');
          return;
        }
        const mime = asset.mimeType ?? 'image/jpeg';
        setFormAttachment(`data:${mime};base64,${asset.base64}`);
      }
    } catch (err) {
      console.error('Image picker error', err);
      Alert.alert('Attachment', 'Could not select image. Please try again.');
    } finally {
      setPickingAttachment(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Community Forum</Text>
        <Text style={styles.subtitle}>
          Collaborate with peers, ask questions, and keep the conversation going.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <IconSymbol name="magnifyingglass" size={18} color="#6B7280" />
          <TextInput
            ref={searchRef}
            placeholder="Search by topic, description, or replies"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        <Pressable style={styles.createButton} onPress={() => openThreadComposer()}>
          <IconSymbol name="square.and.pencil" size={18} color="#FFFFFF" />
          <Text style={styles.createButtonText}>New Thread</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <FilterPill
          label="All Threads"
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterPill
          label="My Posts"
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
            <Text style={styles.emptyTitle}>No matching threads yet.</Text>
            <Text style={styles.emptySubtitle}>
              Start the first conversation or adjust your search filters.
            </Text>
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
                      Edit
                    </Text>
                  </Pressable>
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
                <Text
                  style={[
                    styles.threadInfoText,
                    colorScheme === 'dark' && styles.threadInfoTextDark,
                  ]}
                >
                  Started by:{' '}
                  <Text
                    style={[
                      styles.threadInfoHighlight,
                      colorScheme === 'dark' && styles.threadInfoHighlightDark,
                    ]}
                  >
                    {item.authorName}
                  </Text>
                </Text>
              </View>

              <View style={styles.threadInfoRow}>
                <IconSymbol name="text.bubble.fill" size={18} color="#60A5FA" />
                <Text
                  style={[
                    styles.threadInfoText,
                    colorScheme === 'dark' && styles.threadInfoTextDark,
                  ]}
                >
                  Replies:{' '}
                  <Text
                    style={[
                      styles.threadInfoHighlight,
                      colorScheme === 'dark' && styles.threadInfoHighlightDark,
                    ]}
                  >
                    {repliesCount}
                  </Text>
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
                  Last post:{' '}
                  <Text
                    style={[
                      styles.threadInfoHighlight,
                      colorScheme === 'dark' && styles.threadInfoHighlightDark,
                    ]}
                  >
                    {lastAuthor}
                  </Text>
                  {' on '}
                  <Text
                    style={[
                      styles.threadInfoHighlight,
                      colorScheme === 'dark' && styles.threadInfoHighlightDark,
                    ]}
                  >
                    {formatFullDate(lastTimestamp)}
                  </Text>
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
            <Text style={styles.errorLink}>Try again</Text>
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
              {editingThread ? 'Edit Thread' : 'Start a Discussion'}
            </Text>
            <TextInput
              placeholder="Thread title"
              placeholderTextColor="#94A3B8"
              value={formTitle}
              onChangeText={setFormTitle}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Describe your question or topic"
              placeholderTextColor="#94A3B8"
              value={formContent}
              onChangeText={setFormContent}
              style={[styles.modalInput, styles.modalTextarea]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.attachmentSection}>
              <Text
                style={[
                  styles.attachmentLabel,
                  { color: colorScheme === 'dark' ? '#E2E8F0' : '#1E293B' },
                ]}
              >
                Attachment (optional)
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
                    <Text style={styles.attachmentRemoveText}>Remove</Text>
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
                    {pickingAttachment ? 'Opening gallery…' : 'Add an image'}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={closeThreadComposer}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={submitThread}>
                <Text style={styles.modalPrimaryText}>
                  {editingThread ? 'Save Changes' : 'Publish Thread'}
                </Text>
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

function formatFullDate(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return `${date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })} ${date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
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
    paddingBottom: 40,
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
  threadInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    gap: 16,
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
  modalTextarea: {
    height: 140,
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
});

