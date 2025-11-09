import { AIChatbot } from '@/components/ai-chatbot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
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

export default function MainPage() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  function openMenu() {
    setShowProfileMenu(true);
  }



  function closeMenu() {
    setShowProfileMenu(false);
  }

  function handleViewProfile() {
    closeMenu();
    const username = user?.username;
    if (username) {
      router.push(`/profile?username=${encodeURIComponent(username)}`);
    }
  }

  function handleEditProfile() {
    closeMenu();
    const username = user?.username;
    if (username) {
      router.push(`/edit-profile?username=${encodeURIComponent(username)}`);
    }
  }

  function handleDeleteAccount() {
    closeMenu();
    const username = user?.username;
    if (username) {
      router.push(`/delete-account?username=${encodeURIComponent(username)}`);
    }
  }

  function handleLogout() {
    closeMenu();
    logout();
    router.replace('/');
  }

  useEffect(() => {
    navigation.setOptions({
      title: 'Main Page',
      headerRight: () => (
        <Pressable
          onPress={openMenu}
          hitSlop={12}
          style={{ paddingHorizontal: 12 }}
          accessibilityLabel="Open account menu"
        >
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}` }}
                style={{ width: 28, height: 28, borderRadius: 14 }}
              />
            ) : (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#888',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconSymbol size={18} name="person.fill" color="#fff" />
              </View>
            )}
          </Pressable>
      ),
    });
  }, [navigation, colorScheme, user?.username]);

  const CTA_BUTTONS = useMemo(() => {
    if (user?.role !== 'Teacher') {
      return [];
    }

    return [
      {
        key: 'register',
        label: 'Register Student',
        description: 'Create new student accounts instantly.',
        icon: colorScheme === 'dark' ? 'person.badge.plus' : 'person.badge.plus',
        gradient: ['#6EE7B7', '#3B82F6'],
        onPress: () => router.push('/register' as any),
      },
      {
        key: 'delete',
        label: 'Remove Student',
        description: 'Search and delete student accounts securely.',
        icon: colorScheme === 'dark' ? 'trash.circle.fill' : 'trash.circle.fill',
        gradient: ['#F87171', '#EF4444'],
        onPress: handleDeleteAccount,
      },
    ];
  }, [user?.role, colorScheme]);

  const userAvatarUri = resolveAvatarUri(user?.profileImage ?? undefined, user?.avatarUrl ?? undefined);

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
          <ThemedText type="title">Hello{user?.username ? `, ${user.username}` : '!'}</ThemedText>
          <ThemedText type="subtitle">Welcome Back!</ThemedText>
        </View>
      </View>

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
                <IconSymbol name="chevron.right" size={20} color={colorScheme === 'dark' ? '#93C5FD' : '#3B82F6'} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

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
                  {user?.email || user?.username || 'User'}
                </Text>
                <Text style={[styles.userUsername, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                  @{user?.username || 'username'}
                </Text>
              </View>
            </View>

            {/* Menu Options List */}
            <View style={styles.menuOptions}>
              <Pressable style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={handleViewProfile}>
                <Text style={[styles.menuItemText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                  View Profile
                </Text>
                <IconSymbol name="chevron.right" size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
              </Pressable>

              <Pressable style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={handleEditProfile}>
                <Text style={[styles.menuItemText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                  Edit Profile
                </Text>
              <IconSymbol name="chevron.right" size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
            </Pressable>

            {user?.role === 'Teacher' && (
              <>
                <Pressable style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={() => { closeMenu(); router.push('/register' as any); }}>
                  <Text style={[styles.menuItemText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                    Register New User
                  </Text>
                  <IconSymbol name="chevron.right" size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
                </Pressable>

                <Pressable style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={handleDeleteAccount}>
                  <Text style={[styles.menuItemText, { color: '#b00' }]}>
                    Delete Account
                  </Text>
                  <IconSymbol name="chevron.right" size={18} color="#b00" />
                </Pressable>
              </>
            )}

              <Pressable style={styles.menuItem} onPress={handleLogout}>
                <Text style={[styles.menuItemText, { color: '#b00' }]}>
                  Logout
                </Text>
                <IconSymbol name="chevron.right" size={18} color="#b00" />
              </Pressable>
            </View>

            <Pressable style={styles.closeButton} onPress={closeMenu}>
              <Text style={[styles.closeButtonText, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Floating Chat Bubble */}
      <Pressable
        style={styles.floatingChatButton}
        onPress={() => setShowChatbot(true)}
        accessibilityLabel="Open AI Chatbot"
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
  headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)', padding: 12, borderRadius: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DDD' },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#888', alignItems: 'center', justifyContent: 'center' },
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


