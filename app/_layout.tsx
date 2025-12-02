import { AuthProvider } from '@/contexts/AuthContext';
import { ForumProvider } from '@/contexts/ForumContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n';
import i18n from '../i18n';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [languageReady, setLanguageReady] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const { t } = useTranslation();

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

  // Listen to language changes to update headers
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
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
      <NotificationProvider>
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
      
      {/* Forgot password page - no header like login */}
      <Stack.Screen
        name="forgot-password"
        options={{ headerShown: false }}
      />
      
      {/* This is the main app (tabs). It will also hide its header. */}
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }}
      />

      {/* These are other pages that can be opened from anywhere */}
      <Stack.Screen 
        name="mainpage" 
        options={() => ({ title: t('headers.mainpage') })} 
      />
      <Stack.Screen 
        name="forum/index" 
        options={() => ({ title: t('headers.forum') })} 
      />
      <Stack.Screen 
        name="forum/[id]" 
        options={() => ({ title: t('headers.thread') })} 
      />
      <Stack.Screen 
        name="learning-materials/index" 
        options={() => ({ title: t('headers.learning_materials') })} 
      />
      <Stack.Screen 
        name="games/index" 
        options={() => ({ title: t('headers.games') })} 
      />
      <Stack.Screen 
        name="games/debugging/play" 
        options={() => ({ title: t('headers.debugging_challenge') })} 
      />
      <Stack.Screen 
        name="leaderboard/index" 
        options={() => ({ title: t('headers.leaderboard') })} 
      />
      <Stack.Screen 
        name="register" 
        options={() => ({ title: t('headers.register') })} 
      />
      <Stack.Screen 
        name="teacher-dashboard/index" 
        options={() => ({ title: t('headers.teacher_dashboard') })} 
      />
      <Stack.Screen 
        name="teacher/monitor/index" 
        options={() => ({ title: t('headers.student_monitor') })} 
      />
      <Stack.Screen 
        name="profile" 
        options={() => ({ title: t('headers.profile') })} 
      />
      <Stack.Screen 
        name="edit-profile" 
        options={() => ({ title: t('headers.edit_profile') })} 
      />
      <Stack.Screen 
        name="delete-account" 
        options={() => ({ title: t('headers.delete_account') })} 
      />
      <Stack.Screen 
        name="settings" 
        options={() => ({ title: t('headers.settings') })} 
      />
          </Stack>
        </ForumProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
