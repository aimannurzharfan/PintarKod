import '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '@/contexts/AuthContext';
import { ForumProvider } from '@/contexts/ForumContext';
import { Stack } from 'expo-router';
import i18n from '../i18n';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem('appLanguage')
      .then((storedLanguage) => {
        if (!isMounted || !storedLanguage) return;
        if (storedLanguage !== i18n.language) {
          i18n.changeLanguage(storedLanguage).catch((err) =>
            console.warn('Language restore failed:', err)
          );
        }
      })
      .catch((err) => console.warn('Language load error:', err))
      .finally(() => {
        if (isMounted) setLanguageReady(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!languageReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colorScheme === 'dark' ? '#020617' : '#EEF2FF',
        }}
      >
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ForumProvider>
        <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
        },
        headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      }}
      >
      {/* This is the Login page. It's the default and has no header. */}
      <Stack.Screen
        name="index"
        options={{ headerShown: false }} 
      />
      
      {/* This is the main app (tabs). It will also hide its header. */}
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }}
      />

      {/* These are other pages that can be opened from anywhere */}
      <Stack.Screen name="mainpage" options={{ title: 'Main Page' }} />
      <Stack.Screen name="forum/index" options={{ title: 'Forum' }} />
      <Stack.Screen name="forum/[id]" options={{ title: 'Thread' }} />
      <Stack.Screen name="learning-materials/index" options={{ title: 'Learning Materials' }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete Account' }} />
        </Stack>
      </ForumProvider>
    </AuthProvider>
  );
}
