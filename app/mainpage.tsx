import { AIChatbot } from '@/components/ai-chatbot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useForum } from '@/contexts/ForumContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { API_URL } from '../config';

const CHEVRON_RIGHT = 'chevron.right' as IconSymbolName;

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
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

export default function MainPage() {
  const { user, logout } = useAuth();
  const { error: forumError } = useForum();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const {
    notifications,
    unreadCount,
    refreshNotifications,
    markAllAsRead,
    clearNotifications,
    loading: notificationsLoading,
  } = useNotifications();
  const { t } = useTranslation();

  const openMenu = useCallback(() => {
    setShowProfileMenu(true);
  }, []);

  const closeMenu = useCallback(() => {
    setShowProfileMenu(false);
  }, []);

  const openNotificationsPanel = useCallback(() => {
    setShowNotifications(true);
    refreshNotifications()
      .then(() => markAllAsRead())
      .catch(() => markAllAsRead());
  }, [markAllAsRead, refreshNotifications]);

  const closeNotificationsPanel = useCallback(() => {
    setShowNotifications(false);
  }, []);

  const handleViewProfile = useCallback(() => {
    closeMenu();
    const username = user?.username;
    if (username) {
      router.push(`/profile?username=${encodeURIComponent(username)}`);
    }
  }, [closeMenu, router, user?.username]);

  const handleEditProfile = useCallback(() => {
    closeMenu();
    const username = user?.username;
    if (username) {
      router.push(`/edit-profile?username=${encodeURIComponent(username)}`);
    }
  }, [closeMenu, router, user?.username]);

  const handleDeleteAccount = useCallback(() => {
    closeMenu();
    const username = user?.username;
    if (username) {
      router.push(`/delete-account?username=${encodeURIComponent(username)}`);
    }
  }, [closeMenu, router, user?.username]);

  const handleLogout = useCallback(() => {
    closeMenu();
    logout();
    router.replace('/');
  }, [closeMenu, logout, router]);

  const handleClearNotifications = useCallback(() => {
    clearNotifications();
  }, [clearNotifications]);

  const userAvatarUri = useMemo(
    () => resolveAvatarUri(user?.profileImage ?? undefined, user?.avatarUrl ?? undefined),
    [user?.profileImage, user?.avatarUrl]
  );

  useEffect(() => {
    navigation.setOptions({
      title: t('main.header_title'),
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={openNotificationsPanel}
            hitSlop={12}
            style={styles.headerIconButton}
            accessibilityLabel={t('main.notifications_title')}
          >
            <Feather
              name="bell"
              size={20}
              color={colorScheme === 'dark' ? '#FACC15' : '#1E293B'}
            />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={openMenu}
            hitSlop={12}
            style={styles.headerAvatarButton}
            accessibilityLabel={t('main.menu_view_profile')}
          >
            {userAvatarUri ? (
              <Image
                source={{ uri: userAvatarUri }}
                style={{ width: 28, height: 28, borderRadius: 14 }}
              />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Feather name="user" size={18} color="#fff" />
              </View>
            )}
          </Pressable>
        </View>
      ),
    });
  }, [
    colorScheme,
    navigation,
    openMenu,
    openNotificationsPanel,
    t,
    unreadCount,
    userAvatarUri,
  ]);

  const discussionCards = useMemo(
    () => {
      const cards = [
        {
          key: 'forum-view',
          title: t('main.discussion_forum_title'),
          description: t('main.discussion_forum_description'),
          onPress: () => router.push('/forum' as any),
        },
        {
          key: 'learning-materials',
          title: t('main.materials_title'),
          description: t('main.materials_description'),
          onPress: () => router.push('/learning-materials' as any),
        },
      ];
      
      // Add Teacher Dashboard card if user is a teacher
      if (user?.role === 'Teacher') {
        cards.unshift({
          key: 'teacher-dashboard',
          title: t('teacher_ui.dashboard'),
          description: t('teacher_ui.dashboard_desc'),
          onPress: () => router.push('/teacher-dashboard' as any),
        });
      }
      
      return cards;
    },
    [router, t, user?.role]
  );

  type CtaButton = {
    key: string;
    label: string;
    description: string;
    icon: IconSymbolName;
    onPress: () => void;
  };

  const CTA_BUTTONS: CtaButton[] = useMemo(() => {
    // Teacher Dashboard moved to discussionCards for consistent styling
    return [];
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerCard}>
        {userAvatarUri ? (
          <Image source={{ uri: userAvatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <IconSymbol size={36} name="person.fill" color="#fff" />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <ThemedText type="title">
            {user?.username
              ? t('main.welcome_named', { name: user.username })
              : t('main.welcome_generic')}
          </ThemedText>
          <ThemedText type="subtitle">{t('main.welcome_subtitle')}</ThemedText>
        </View>
      </View>

      {/* Start Learning Hero Banner */}
      <Pressable
        style={({ pressed }) => [
          styles.heroBanner,
          {
            backgroundColor: colorScheme === 'dark'
              ? 'rgba(59, 130, 246, 0.15)'
              : 'rgba(59, 130, 246, 0.08)',
            borderColor: colorScheme === 'dark'
              ? 'rgba(59, 130, 246, 0.3)'
              : 'rgba(59, 130, 246, 0.2)',
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={() => router.push('/games' as any)}
      >
        <View style={styles.heroContent}>
          <View style={[
            styles.heroIconWrapper,
            {
              backgroundColor: colorScheme === 'dark'
                ? 'rgba(59, 130, 246, 0.2)'
                : 'rgba(59, 130, 246, 0.15)',
            },
          ]}>
            <Feather name="star" size={24} color="#000000" />
          </View>
          <View style={styles.heroTextWrapper}>
            <Text style={[styles.heroTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#0F172A' }]}>
              {t('game_ui.start_learning')}
            </Text>
            <Text style={[styles.heroDescription, { color: colorScheme === 'dark' ? '#CBD5F5' : '#475569' }]}>
              {t('game_ui.start_learning_desc')}
            </Text>
          </View>
          <IconSymbol name={CHEVRON_RIGHT} size={24} color={colorScheme === 'dark' ? '#93C5FD' : '#3B82F6'} />
        </View>
      </Pressable>

      {CTA_BUTTONS.length > 0 && (
        <View style={styles.ctaSection}>
          {CTA_BUTTONS.map((button) => (
            <Pressable key={button.key} style={({ pressed }) => [
              styles.ctaCard,
              {
                opacity: pressed ? 0.9 : 1,
              },
            ]} onPress={button.onPress}>
              <View style={[
                styles.ctaIconWrapper,
                {
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                },
              ]}>
              <IconSymbol name={button.icon} size={30} color={colorScheme === 'dark' ? '#FFFFFF' : '#111827'} />
              </View>
              <View style={styles.ctaTextWrapper}>
                <Text style={[styles.ctaTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#0F172A' }]}>
                  {button.label}
                </Text>
                <Text style={[styles.ctaSubtitle, { color: colorScheme === 'dark' ? '#CBD5F5' : '#475569' }]}>
                  {button.description}
                </Text>
              </View>
              <View style={styles.ctaChevron}>
                <IconSymbol name={CHEVRON_RIGHT} size={20} color={colorScheme === 'dark' ? '#93C5FD' : '#3B82F6'} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.discussionSection}>
        {discussionCards.map((card) => (
          <Pressable
            key={card.key}
            style={({ pressed }) => [
              styles.discussionRow,
              {
                backgroundColor: colorScheme === 'dark' ? 'rgba(21,33,52,0.9)' : '#F5F9FF',
                borderColor: colorScheme === 'dark' ? 'rgba(59,130,246,0.32)' : 'rgba(59,130,246,0.18)',
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
            onPress={card.onPress}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.discussionRowTitle,
                  { color: colorScheme === 'dark' ? '#FFFFFF' : '#0F172A' },
                ]}
              >
                {card.title}
              </Text>
              <Text
                style={[
                  styles.discussionRowSubtitle,
                  { color: colorScheme === 'dark' ? '#CBD5F5' : '#475569' },
                ]}
              >
                {card.description}
              </Text>
            </View>
            <IconSymbol
              name={CHEVRON_RIGHT}
              size={18}
              color={colorScheme === 'dark' ? '#A5B4FC' : '#1D4ED8'}
            />
          </Pressable>
        ))}
        {forumError ? (
          <Text
            style={[
              styles.discussionError,
              { color: colorScheme === 'dark' ? '#FCA5A5' : '#DC2626' },
            ]}
          >
            {t('main.forum_notice')}
          </Text>
        ) : null}
      </View>

      {/* Sidebar removed */}

      <Modal
        visible={showProfileMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <Pressable style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF' }]} onPress={(e) => e.stopPropagation()}>
            {/* User Info Section */}
            <View style={[styles.userInfoSection, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              {userAvatarUri ? (
                <Image source={{ uri: userAvatarUri }} style={styles.profileMenuAvatar} />
              ) : (
                <View style={styles.profileMenuAvatarPlaceholder}>
                  <IconSymbol size={40} name="person.fill" color="#fff" />
                </View>
              )}
              <View style={styles.userInfoText}>
                <Text style={[styles.userName, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                  {user?.email || user?.username || t('main.menu_user_fallback')}
                </Text>
                <Text style={[styles.userUsername, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                  @{user?.username || t('main.menu_username_placeholder')}
                </Text>
              </View>
            </View>

            {/* Menu Options List */}
            <View style={styles.menuOptions}>
              <Pressable style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={handleViewProfile}>
                <Text style={[styles.menuItemText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                  {t('main.menu_view_profile')}
                </Text>
                <IconSymbol name={CHEVRON_RIGHT} size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
              </Pressable>

              <Pressable style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={handleEditProfile}>
                <Text style={[styles.menuItemText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                  {t('main.menu_edit_profile')}
                </Text>
              <IconSymbol name={CHEVRON_RIGHT} size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
            </Pressable>

            <Pressable
              style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => {
                closeMenu();
                router.push('/settings' as any);
              }}
            >
              <Text style={[styles.menuItemText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                {t('main.menu_settings')}
              </Text>
              <IconSymbol name={CHEVRON_RIGHT} size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
            </Pressable>

            {user?.role === 'Teacher' && (
              <>
                <Pressable
                  style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={() => {
                    closeMenu();
                    router.push('/teacher/monitor' as any);
                  }}
                >
                  <Text style={[styles.menuItemText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                    {t('teacher_ui.monitor_title')}
                  </Text>
                  <IconSymbol name={CHEVRON_RIGHT} size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
                </Pressable>
                <Pressable
                  style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={handleDeleteAccount}
                >
                  <Text style={[styles.menuItemText, { color: '#b00' }]}>
                    {t('main.menu_delete_account')}
                  </Text>
                  <IconSymbol name={CHEVRON_RIGHT} size={18} color="#b00" />
                </Pressable>
              </>
            )}

              <Pressable style={styles.menuItem} onPress={handleLogout}>
                <Text style={[styles.menuItemText, { color: '#b00' }]}>
                  {t('main.menu_logout')}
                </Text>
                <IconSymbol name={CHEVRON_RIGHT} size={18} color="#b00" />
              </Pressable>
            </View>

            <Pressable style={styles.closeButton} onPress={closeMenu}>
              <Text style={[styles.closeButtonText, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                {t('main.menu_cancel')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showNotifications}
        transparent
        animationType="fade"
        onRequestClose={closeNotificationsPanel}
      >
        <Pressable style={styles.notificationsOverlay} onPress={closeNotificationsPanel}>
          <Pressable
            style={[
              styles.notificationsCard,
              { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF' },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.notificationsHeader}>
              <Text
                style={[
                  styles.notificationsTitle,
                  { color: colorScheme === 'dark' ? '#F8FAFC' : '#0F172A' },
                ]}
              >
                {t('main.notifications_title')}
              </Text>
              {notifications.length ? (
                <Pressable
                  style={styles.notificationsClearButton}
                  onPress={handleClearNotifications}
                  disabled={notificationsLoading}
                >
                  <Text style={styles.notificationsClearText}>
                    {t('main.notifications_clear')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {notificationsLoading ? (
              <View style={styles.notificationsLoading}>
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            ) : notifications.length ? (
              <ScrollView
                style={styles.notificationsList}
                contentContainerStyle={styles.notificationsListContent}
              >
                {notifications.map((notification) => (
                  <View
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      {
                        backgroundColor:
                          colorScheme === 'dark'
                            ? 'rgba(148, 163, 184, 0.16)'
                            : 'rgba(148, 163, 184, 0.12)',
                      },
                    ]}
                  >
                    <View style={styles.notificationText}>
                      <Text
                        style={[
                          styles.notificationTitle,
                          { color: colorScheme === 'dark' ? '#F8FAFC' : '#0F172A' },
                        ]}
                      >
                        {notification.title}
                      </Text>
                      {notification.message ? (
                        <Text
                          style={[
                            styles.notificationMessage,
                            { color: colorScheme === 'dark' ? '#CBD5F5' : '#475569' },
                          ]}
                        >
                          {notification.message}
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          styles.notificationTime,
                          { color: colorScheme === 'dark' ? '#94A3B8' : '#64748B' },
                        ]}
                      >
                        {formatRelativeTime(notification.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.notificationsEmpty}>
                <IconSymbol
                  name="bell.slash"
                  size={28}
                  color={colorScheme === 'dark' ? '#64748B' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.notificationsEmptyText,
                    { color: colorScheme === 'dark' ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  {t('main.notifications_empty')}
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Floating Chat Bubble */}
      <Pressable
        style={styles.floatingChatButton}
        onPress={() => setShowChatbot(true)}
        accessibilityLabel={t('main.chat_accessibility')}
      >
        <IconSymbol name="message.fill" size={28} color="#FFFFFF" />
      </Pressable>

      {/* AI Chatbot Modal */}
      <AIChatbot visible={showChatbot} onClose={() => setShowChatbot(false)} />

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  headerIconButton: {
    position: 'relative',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  headerAvatarButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  headerAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  notificationsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingTop: 72,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  notificationsCard: {
    width: '92%',
    maxWidth: 360,
    alignSelf: 'flex-end',
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    maxHeight: '70%',
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  notificationsClearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  notificationsClearText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  notificationsList: {
    maxHeight: 320,
  },
  notificationsListContent: {
    gap: 12,
    paddingBottom: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  notificationText: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  notificationsEmptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)', padding: 12, borderRadius: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DDD' },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#888', alignItems: 'center', justifyContent: 'center' },
  heroBanner: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrapper: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 20,
  },
  ctaSection: { marginTop: 24, gap: 16 },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
  },
  ctaIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ctaTextWrapper: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  ctaChevron: {
    marginLeft: 12,
  },
  discussionSection: { marginTop: 32, gap: 14 },
  discussionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: 16,
  },
  discussionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discussionRowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  discussionRowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  discussionError: {
    marginTop: 8,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  profileMenuAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DDD',
  },
  profileMenuAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
  },
  menuOptions: {
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 16,
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
  },
  /* header menu styles removed (sidebar/menu was removed) */
  floatingChatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
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
});


