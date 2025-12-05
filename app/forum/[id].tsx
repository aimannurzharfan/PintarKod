import { Badge } from '@/components/Badge';
import { MarkdownView } from '@/components/MarkdownView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { ForumComment, ForumThread, useForum } from '@/contexts/ForumContext';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme
} from 'react-native';
import { API_URL } from '../../config';

export default function ForumThreadScreen() {
  const { id, action } = useLocalSearchParams<{ id?: string; action?: string }>();
  const threadId = typeof id === 'string' ? id : undefined;

  const {
    addComment,
    updateComment,
    updateThread,
    deleteThread,
    deleteComment,
    getThreadById,
    fetchThreadById
  } = useForum();
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  const userRole = user?.role ?? null;
  const isTeacher = userRole === 'Teacher';

  const thread = useMemo<ForumThread | undefined>(
    () => (threadId ? getThreadById(threadId) : undefined),
    [threadId, getThreadById]
  );
  const isEditingThread = Boolean(thread);

  useEffect(() => {
    if (!threadId) return;
    if (!thread) {
      fetchThreadById(threadId);
    }
  }, [threadId, thread, fetchThreadById]);

  const [commentDraft, setCommentDraft] = useState('');
  const commentInputRef = useRef<TextInput | null>(null);

  const [editingComment, setEditingComment] = useState<ForumComment | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentModalVisible, setCommentModalVisible] = useState(false);

  const [threadEditorVisible, setThreadEditorVisible] = useState(false);
  const [threadTitle, setThreadTitle] = useState(thread?.title ?? '');
  const [threadContent, setThreadContent] = useState(thread?.content ?? '');
  const [threadAttachment, setThreadAttachment] = useState<string | null>(thread?.attachment ?? null);
  const [pickingThreadAttachment, setPickingThreadAttachment] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [commentBadges, setCommentBadges] = useState<Record<string, 'Champion' | 'RisingStar' | 'Student' | 'Teacher'>>({});

  // Fetch badges for all comment authors
  useEffect(() => {
    if (!thread?.comments) return;

    const fetchBadges = async () => {
      const badgeMap: Record<string, 'Champion' | 'RisingStar' | 'Student' | 'Teacher'> = {};
      
      for (const comment of thread.comments) {
        if (comment.authorId && !badgeMap[comment.authorId]) {
          try {
            const res = await fetch(`${API_URL}/api/users/${comment.authorId}/badge`);
            if (res.ok) {
              const badgeData = await res.json();
              badgeMap[comment.authorId] = badgeData.badgeType;
            }
          } catch (err) {
            console.error('Error fetching badge for comment author:', err);
          }
        }
      }
      
      setCommentBadges(badgeMap);
    };

    fetchBadges();
  }, [thread?.comments]);

  useEffect(() => {
    setThreadTitle(thread?.title ?? '');
    setThreadContent(thread?.content ?? '');
    setThreadAttachment(thread?.attachment ?? null);
  }, [thread?.title, thread?.content, thread?.attachment]);

  useEffect(() => {
    const paramAction = typeof action === 'string' ? action : undefined;
    if (!paramAction) return;
    if (paramAction === 'comment') {
      setTimeout(() => commentInputRef.current?.focus(), 200);
    }
    if (paramAction === 'edit' && thread && canManage(thread, user?.id, user?.username, user?.email)) {
      setThreadEditorVisible(true);
    }
  }, [action, thread, user?.id, user?.username, user?.email]);

  if (!threadId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t('forum_thread.not_found_title')}</Text>
        <Text style={styles.emptySubtitle}>{t('forum_thread.not_found_message')}</Text>
        <Pressable style={styles.emptyButton} onPress={() => router.replace('/forum')}>
          <Text style={styles.emptyButtonText}>{t('forum_thread.not_found_back')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!thread) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>{t('forum_thread.loading')}</Text>
      </View>
    );
  }

  function handleSubmitComment() {
    if (!thread) return;
    const body = commentDraft.trim();
    if (!body) {
      Alert.alert(t('forum_thread.alert_reply_title'), t('forum_thread.alert_reply_body'));
      return;
    }
    if (user?.id == null) {
      Alert.alert(t('forum_list.alert_signin_title'), t('forum_thread.alert_signin_reply'));
      return;
    }
    addComment({
      threadId: thread.id,
      content: body,
      authorId: user?.id != null ? Number(user.id) : null,
    }).then((created) => {
      if (created) {
        setCommentDraft('');
        commentInputRef.current?.clear?.();
      }
    });
  }

  function openEditComment(comment: ForumComment) {
    if (!canManageComment(comment, user?.id, user?.username, user?.email)) {
      Alert.alert(t('forum_list.alert_permission_title'), t('forum_thread.alert_edit_comment'));
      return;
    }
    setEditingComment(comment);
    setEditingCommentText(comment.content);
    setCommentModalVisible(true);
  }

  function closeCommentModal() {
    setCommentModalVisible(false);
    setEditingComment(null);
    setEditingCommentText('');
  }

  function submitCommentEdit() {
    if (!thread) return;
    const body = editingCommentText.trim();
    if (!editingComment || !body) {
      Alert.alert(t('forum_thread.alert_edit_empty_title'), t('forum_thread.alert_edit_empty_body'));
      return;
    }
    if (user?.id == null) {
      Alert.alert(t('forum_list.alert_signin_title'), t('forum_thread.alert_signin_edit_reply'));
      return;
    }
    updateComment({
      threadId: thread.id,
      commentId: editingComment.id,
      content: body,
      authorId: user?.id != null ? Number(user.id) : null,
    }).then((updated) => {
      if (updated) {
        closeCommentModal();
      }
    });
  }

  function openThreadEditor() {
    if (!thread) return;
    if (!canManage(thread, user?.id, user?.username, user?.email)) {
      Alert.alert(t('forum_list.alert_permission_title'), t('forum_list.alert_permission_body'));
      return;
    }
    setThreadEditorVisible(true);
  }

  function closeThreadEditor() {
    setThreadEditorVisible(false);
  }

  function submitThreadEdit() {
    if (!thread) return;
    const title = threadTitle.trim();
    const content = threadContent.trim();
    if (!title || !content) {
      Alert.alert(t('forum_thread.alert_incomplete_title'), t('forum_thread.alert_incomplete_body'));
      return;
    }
    if (user?.id == null) {
      Alert.alert(t('forum_list.alert_signin_title'), t('forum_thread.alert_signin_edit_thread'));
      return;
    }
    updateThread({
      id: thread.id,
      title,
      content,
      authorId: user?.id != null ? Number(user.id) : null,
      attachment: typeof threadAttachment === 'string' ? threadAttachment : null,
    }).then((updated) => {
      if (updated) {
        setThreadEditorVisible(false);
      }
    });
  }

  async function pickThreadAttachment() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('forum_list.attachment_permission_title'),
          t('forum_list.attachment_permission_message')
        );
        return;
      }
      setPickingThreadAttachment(true);
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
        setThreadAttachment(`data:${mime};base64,${asset.base64}`);
      }
    } catch (err) {
      console.error('Thread attachment picker error', err);
      Alert.alert(
        t('forum_list.attachment_error_title'),
        t('forum_list.attachment_generic_error')
      );
    } finally {
      setPickingThreadAttachment(false);
    }
  }

  function confirmDeleteThread() {
    if (!thread) return;
    if (user?.id == null) {
      Alert.alert(
        t('forum_list.alert_signin_title'),
        t('forum_thread.alert_signin_delete_thread')
      );
      return;
    }
    Alert.alert(
      'Delete thread',
      'This will remove the discussion and all replies. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteThread(thread.id, Number(user.id));
            if (success) {
              router.replace('/forum');
            } else {
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

  function confirmDeleteComment(comment: ForumComment) {
    if (!thread) return;
    if (user?.id == null) {
      Alert.alert(
        t('forum_list.alert_signin_title'),
        t('forum_thread.alert_signin_delete_reply')
      );
      return;
    }
    Alert.alert(
      'Delete reply',
      'This will remove your comment permanently. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteComment(thread.id, comment.id, Number(user.id));
            if (!success) {
              Alert.alert(
                t('forum_list.delete_failed_title'),
                t('forum_thread.alert_delete_comment_failed')
              );
            }
          }
        }
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.threadCard}>
          <View style={styles.threadHeader}>
            <Text style={styles.threadTitle}>{thread.title}</Text>
            {canManage(thread, user?.id, user?.username, user?.email) && (
              <View style={styles.threadHeaderActions}>
                <Pressable style={styles.editButton} onPress={openThreadEditor}>
                  <IconSymbol name="pencil" size={16} color="#2563EB" />
                  <Text style={styles.editButtonText}>{t('forum_list.action_edit')}</Text>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={confirmDeleteThread}>
                  <IconSymbol name="trash.circle.fill" size={16} color="#DC2626" />
                  <Text style={styles.deleteButtonText}>{t('forum_list.action_delete')}</Text>
                </Pressable>
              </View>
            )}
          </View>
          <Text style={styles.threadMeta}>
            {t('forum_list.started_by', { name: thread.authorName })} · {formatRelativeTime(thread.updatedAt)}
          </Text>
          <MarkdownView>{thread.content}</MarkdownView>
          {thread.attachment ? (
            <Image
              source={{ uri: thread.attachment }}
              style={styles.threadImage}
              contentFit="cover"
            />
          ) : null}
        </View>

        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>
            {t('forum_thread.replies_header', { count: thread.comments.length })}
          </Text>
        </View>

        {thread.comments.length === 0 ? (
          <View style={styles.emptyComments}>
            <IconSymbol name="text.bubble" size={32} color="#A5B4FC" />
            <Text style={styles.emptyCommentTitle}>{t('forum_thread.empty_title')}</Text>
            <Text style={styles.emptyCommentSubtitle}>
              {t('forum_thread.empty_description')}
            </Text>
          </View>
        ) : (
          thread.comments.map((comment) => {
            // Check if current user is the comment author
            const isAuthor = canManageComment(comment, user?.id, user?.username, user?.email);
            
            // Get the comment author's role from the backend data
            const commentAuthorRole = comment.authorRole;
            // Check if comment is from a student (case-insensitive check)
            const isStudentComment = commentAuthorRole && 
              String(commentAuthorRole).trim() === 'Student';
            
            // Teacher can delete if: user is teacher AND comment is from a student
            const canModerate = isTeacher && isStudentComment;
            
            // The final decision: can delete if user is author OR teacher can moderate
            const canDelete = isAuthor || canModerate;
            
            // Temporary debug - remove after confirming it works
            if (isTeacher && !isAuthor) {
              console.log('Teacher viewing comment:', {
                commentId: comment.id,
                authorRole: commentAuthorRole,
                isStudentComment,
                canModerate,
                canDelete,
                userRole: user?.role,
              });
            }

            return (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAuthorRow}>
                    <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                    {commentBadges[comment.authorId] && (
                      <Badge badgeType={commentBadges[comment.authorId]} size="small" />
                    )}
                  </View>
                  <Text style={styles.commentTimestamp}>{formatRelativeTime(comment.updatedAt)}</Text>
                </View>
                <MarkdownView>{comment.content}</MarkdownView>
                {canDelete && (
                  <View style={styles.commentActions}>
                    {isAuthor && (
                      <Pressable
                        style={styles.commentAction}
                        onPress={() => openEditComment(comment)}
                      >
                        <IconSymbol name="square.and.pencil" size={14} color="#2563EB" />
                        <Text style={styles.commentActionText}>
                          {t('forum_thread.action_edit')}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={styles.commentDeleteAction}
                      onPress={() => confirmDeleteComment(comment)}
                    >
                      <IconSymbol name="trash.circle.fill" size={14} color="#DC2626" />
                      <Text style={styles.commentDeleteText}>
                        {t('forum_thread.action_delete')}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.composer}>
        <View style={styles.composerInputContainer}>
          <TextInput
            ref={commentInputRef}
            placeholder={t('forum_thread.placeholder_reply')}
            placeholderTextColor="#94A3B8"
            style={styles.composerInput}
            multiline
            value={commentDraft}
            onChangeText={setCommentDraft}
          />
          <Text style={styles.codeHint}>
            {t('forum_thread.code_hint', { defaultValue: 'Tip: Use ``` to wrap your code blocks.' })}
          </Text>
        </View>
        <Pressable style={styles.composerButton} onPress={handleSubmitComment}>
          <Text style={styles.composerButtonText}>{t('forum_thread.post_button')}</Text>
        </Pressable>
      </View>

      <Modal
        visible={commentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCommentModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeCommentModal}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('forum_thread.modal_edit_title')}</Text>
            <View>
              <TextInput
                style={[styles.modalInput, styles.modalTextarea]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={editingCommentText}
                onChangeText={setEditingCommentText}
              />
              <Text style={styles.codeHint}>
                {t('forum_thread.code_hint', { defaultValue: 'Tip: Use ``` to wrap your code blocks.' })}
              </Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={closeCommentModal}>
                <Text style={styles.modalSecondaryText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={submitCommentEdit}>
                <Text style={styles.modalPrimaryText}>{t('common.save')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={threadEditorVisible}
        transparent
        animationType="slide"
        onRequestClose={closeThreadEditor}
      >
        <Pressable style={styles.modalOverlay} onPress={closeThreadEditor}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {isEditingThread
                ? t('forum_list.modal_edit_title')
                : t('forum_list.modal_create_title')}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={threadTitle}
              onChangeText={setThreadTitle}
              placeholder={t('forum_list.modal_title_placeholder')}
              placeholderTextColor="#94A3B8"
            />
            <View>
              <TextInput
                style={[styles.modalInput, styles.modalTextarea]}
                value={threadContent}
                onChangeText={setThreadContent}
                placeholder={t('forum_list.modal_content_placeholder')}
                placeholderTextColor="#94A3B8"
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
              {threadAttachment ? (
                <View style={styles.attachmentPreview}>
                  <Image
                    source={{ uri: threadAttachment }}
                    style={styles.attachmentImage}
                    contentFit="cover"
                  />
                  <Pressable
                    style={styles.attachmentRemove}
                    onPress={() => setThreadAttachment(null)}
                  >
                    <IconSymbol name="xmark.circle.fill" size={18} color="#DC2626" />
                    <Text style={styles.attachmentRemoveText}>{t('forum_list.attachment_remove')}</Text>
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
                  onPress={pickThreadAttachment}
                  disabled={pickingThreadAttachment}
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
                    {pickingThreadAttachment
                      ? t('forum_list.attachment_loading')
                      : t('forum_list.attachment_button')}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={closeThreadEditor}>
                <Text style={styles.modalSecondaryText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={submitThreadEdit}>
                <Text style={styles.modalPrimaryText}>
                  {isEditingThread ? t('forum_list.modal_save') : t('forum_list.modal_publish')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </KeyboardAvoidingView>
  );
}

function canManage(
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

function canManageComment(
  comment: ForumComment,
  userId?: string | number | null,
  username?: string | null,
  email?: string
) {
  if (!userId && !username && !email) return false;
  if (comment.authorId && userId !== null && userId !== undefined) {
    return comment.authorId === String(userId);
  }
  const identifier = username || email;
  if (!identifier) return false;
  return comment.authorName === identifier || comment.authorName.startsWith(identifier);
}

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  const diff = Date.now() - date.getTime();

  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) {
    const minutes = Math.round(diff / 60_000);
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.round(diff / 3_600_000);
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(diff / 86_400_000);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 120,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  threadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  threadHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  threadTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  editButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
  threadMeta: {
    marginTop: 10,
    color: '#475569',
    fontSize: 14,
  },
  metaHighlight: {
    fontWeight: '600',
    color: '#1D4ED8',
  },
  threadBody: {
    marginTop: 14,
    lineHeight: 22,
    fontSize: 15,
    color: '#0F172A',
  },
  threadImage: {
    marginTop: 12,
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyComments: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCommentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyCommentSubtitle: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
  },
  commentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: '600',
    color: '#1E293B',
  },
  commentTimestamp: {
    fontSize: 13,
    color: '#64748B',
  },
  commentBody: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 0,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  commentActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  commentDeleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentDeleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12,
  },
  composerInputContainer: {
    flex: 1,
    gap: 4,
  },
  composerInput: {
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  composerButton: {
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  composerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  codeHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingHorizontal: 4,
    marginTop: 4,
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
    height: 180,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  floatingChatButton: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: '#475569',
    fontSize: 15,
  },
});

