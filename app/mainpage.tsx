import { AIChatbot } from '@/components/ai-chatbot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { API_URL } from './config';

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

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerCard}>
        {user?.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}` }}
            style={styles.avatar}
          />
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsRow} contentContainerStyle={{ gap: 12 }}>

        <Pressable style={[styles.actionCard]} onPress={() => router.push('/profile') }>
          <IconSymbol name="person.2.fill" size={28} color="#2b6cb0" />
          <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>My Profile</ThemedText>
        </Pressable>

        <Pressable style={[styles.actionCard]} onPress={() => router.push('/edit-profile') }>
          <IconSymbol name="pencil" size={28} color="#2b6cb0" />
          <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>Edit</ThemedText>
        </Pressable>
      </ScrollView>

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
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}` }}
                  style={styles.profileMenuAvatar}
                />
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

              <Pressable style={[styles.menuItem, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={handleDeleteAccount}>
                <Text style={[styles.menuItemText, { color: '#b00' }]}>
                  Delete Account
                </Text>
                <IconSymbol name="chevron.right" size={18} color="#b00" />
              </Pressable>

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
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)', padding: 12, borderRadius: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DDD' },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#888', alignItems: 'center', justifyContent: 'center' },
  actionsRow: { marginTop: 18 },
  actionCard: { width: 110, height: 110, borderRadius: 12, backgroundColor: 'rgba(43,108,176,0.06)', alignItems: 'center', justifyContent: 'center', padding: 12 },
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
  headerMenuButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#2b6cb0', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  headerMenuSmall: { width: 30, height: 30, borderRadius: 6, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
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


