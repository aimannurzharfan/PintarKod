import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { ActionSheetIOS, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const avatarUri = resolveAvatarUri(user?.profileImage ?? undefined, user?.avatarUrl ?? undefined);
  const { t } = useTranslation();

  function openMenu() {
    const username = user?.username;
    const view = () => username && router.push(`/profile?username=${encodeURIComponent(username)}`);
    const edit = () => username && router.push(`/edit-profile?username=${encodeURIComponent(username)}`);
    const doLogout = () => { logout(); router.replace('/'); };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('profile.title'), t('profile.edit'), t('profile.logout')],
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
        t('profile.title'),
        user?.username ? `@${user.username}` : t('profile.welcome'),
        [
          { text: t('profile.title'), onPress: view },
          { text: t('profile.edit'), onPress: edit },
          { text: t('profile.logout'), style: 'destructive', onPress: doLogout },
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
    }
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerRight: () => (
          <Pressable
            onPress={openMenu}
            hitSlop={12}
            style={{ paddingHorizontal: 12 }}
            accessibilityLabel="Open account menu"
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
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
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.forum'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
