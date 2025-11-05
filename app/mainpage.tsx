import React, { useEffect } from 'react';
import { Alert, Platform, Pressable, View, StyleSheet, useColorScheme } from 'react-native';
import { Image } from 'react-native';
import { ActionSheetIOS } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';

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
      <ThemedText type="title">Welcome{user?.username ? `, ${user.username}` : ''}!</ThemedText>
      <ThemedText>Use the user icon at the top-right to view or edit your profile, or logout.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
});


