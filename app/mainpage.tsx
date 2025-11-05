import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActionSheetIOS, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { API_URL } from './config';

export default function MainPage() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigation = useNavigation();

  function openMenu() {
    const username = user?.username;
    const view = () => username && router.push(`/profile?username=${encodeURIComponent(username)}`);
    const edit = () => username && router.push(`/edit-profile?username=${encodeURIComponent(username)}`);
    const doLogout = () => { logout(); router.replace('/'); };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'View Profile', 'Edit Profile', 'Logout'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) view();
          else if (buttonIndex === 2) edit();
          else if (buttonIndex === 3) doLogout();
        }
      );
    } else {
      Alert.alert(
        'Account',
        user?.username ? `@${user.username}` : 'Account',
        [
          { text: 'View Profile', onPress: view },
          { text: 'Edit Profile', onPress: edit },
          { text: 'Logout', style: 'destructive', onPress: doLogout },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
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
        <Pressable style={[styles.actionCard]} onPress={() => router.push('/(tabs)/explore') }>
          <IconSymbol name="magnifyingglass" size={28} color="#2b6cb0" />
          <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>Explore</ThemedText>
        </Pressable>

        <Pressable style={[styles.actionCard]} onPress={() => router.push('/profile') }>
          <IconSymbol name="person.2.fill" size={28} color="#2b6cb0" />
          <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>My Profile</ThemedText>
        </Pressable>

        <Pressable style={[styles.actionCard]} onPress={() => router.push('/edit-profile') }>
          <IconSymbol name="pencil" size={28} color="#2b6cb0" />
          <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>Edit</ThemedText>
        </Pressable>

        <Pressable style={[styles.actionCard]} onPress={() => router.push('/delete-account') }>
          <IconSymbol name="trash" size={28} color="#e53e3e" />
          <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>Danger</ThemedText>
        </Pressable>
      </ScrollView>

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
});


