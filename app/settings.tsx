import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  useNotifications,
  type NotificationPreferences,
} from '@/contexts/NotificationContext';

export default function SettingsScreen() {
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);
  const {
    preferences,
    updatePreferences,
    updatingPreferences,
  } = useNotifications();

  const languages = useMemo(
    () => [
      { code: 'ms', label: t('settings.language_ms') },
      { code: 'en', label: t('settings.language_en') },
    ],
    [t]
  );

  const currentLanguage = (i18n.language || 'ms').split('-')[0];

  const handleLanguageChange = useCallback(
    async (code: string) => {
      try {
        await i18n.changeLanguage(code);
        await AsyncStorage.setItem('appLanguage', code);
      } catch (err) {
        console.warn('Language change failed:', err);
      }
    },
    [i18n]
  );

  const handlePreferenceToggle = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      updatePreferences({ [key]: value });
    },
    [updatePreferences]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol
            name="chevron.left"
            size={20}
            color={colorScheme === 'dark' ? '#F8FAFC' : '#1E293B'}
          />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.description')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSymbol
              name="globe"
              size={20}
              color={colorScheme === 'dark' ? '#BFDBFE' : '#2563EB'}
            />
            <Text style={styles.cardTitle}>{t('settings.language_title')}</Text>
          </View>
          <Text style={styles.cardDescription}>{t('settings.language_hint')}</Text>
          <View style={styles.languageRow}>
            {languages.map((lang) => {
              const isActive = currentLanguage === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  style={({ pressed }) => [
                    styles.languageButton,
                    isActive && styles.languageButtonActive,
                    pressed && styles.languageButtonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageButtonText,
                      isActive && styles.languageButtonTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSymbol
              name="bell"
              size={20}
              color={colorScheme === 'dark' ? '#FCD34D' : '#F59E0B'}
            />
            <Text style={styles.cardTitle}>{t('settings.notifications_title')}</Text>
          </View>
          <Text style={styles.cardDescription}>{t('settings.notifications_hint')}</Text>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceText}>
              <Text style={styles.preferenceTitle}>{t('settings.notifications_forum')}</Text>
              <Text style={styles.preferenceSubtitle}>
                {t('settings.notifications_forum_hint')}
              </Text>
            </View>
            <Switch
              value={preferences.notifyNewForumThreads}
              onValueChange={(value) =>
                handlePreferenceToggle('notifyNewForumThreads', value)
              }
              disabled={updatingPreferences}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceText}>
              <Text style={styles.preferenceTitle}>
                {t('settings.notifications_material')}
              </Text>
              <Text style={styles.preferenceSubtitle}>
                {t('settings.notifications_material_hint')}
              </Text>
            </View>
            <Switch
              value={preferences.notifyNewLearningMaterials}
              onValueChange={(value) =>
                handlePreferenceToggle('notifyNewLearningMaterials', value)
              }
              disabled={updatingPreferences}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceText}>
              <Text style={styles.preferenceTitle}>
                {t('settings.notifications_reply')}
              </Text>
              <Text style={styles.preferenceSubtitle}>
                {t('settings.notifications_reply_hint')}
              </Text>
            </View>
            <Switch
              value={preferences.notifyForumReplies}
              onValueChange={(value) =>
                handlePreferenceToggle('notifyForumReplies', value)
              }
              disabled={updatingPreferences}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? '#020617' : '#EEF2FF',
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      gap: 6,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
    },
    backText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#334155',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#0F172A',
    },
    subtitle: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#475569',
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      gap: 20,
    },
    card: {
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#FFFFFF',
      borderRadius: 24,
      padding: 20,
      gap: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0',
      shadowColor: '#0F172A',
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#0F172A',
    },
    cardDescription: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    languageRow: {
      flexDirection: 'row',
      gap: 12,
    },
    languageButton: {
      flex: 1,
      borderRadius: 18,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.35)' : '#CBD5F5',
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFF',
    },
    languageButtonActive: {
      borderColor: '#2563EB',
      backgroundColor: 'rgba(37, 99, 235, 0.16)',
    },
    languageButtonPressed: {
      opacity: 0.85,
    },
    languageButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#1E293B',
    },
    languageButtonTextActive: {
      color: '#2563EB',
    },
    preferenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    preferenceText: {
      flex: 1,
      gap: 2,
    },
    preferenceTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#0F172A',
    },
    preferenceSubtitle: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
    },
  });
};
