import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Alert,
} from 'react-native';
import { API_URL } from '../config';

export default function GamesIndexScreen() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);

  const currentLang = i18n.language?.split('-')[0] || 'en';

  const onPlayRandomChallenge = useCallback(() => {
    if (!user?.id) {
      router.replace('/');
      return;
    }

    // Just navigate to the game screen - it will fetch its own quiz
    router.push('/games/debugging/play');
  }, [user, router]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedText type="title" style={styles.title}>
          {t('game_ui.title')}
        </ThemedText>

        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colorScheme === 'dark' ? '#E2E8F0' : '#0F172A' },
            ]}
          >
            {t('game_ui.debugging_title')}
          </Text>
          <Text
            style={[
              styles.sectionDescription,
              { color: colorScheme === 'dark' ? '#CBD5F5' : '#475569' },
            ]}
          >
            {t('game_ui.debugging_desc')}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.playButton,
              {
                backgroundColor: colorScheme === 'dark'
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(59, 130, 246, 0.1)',
                borderColor: colorScheme === 'dark'
                  ? 'rgba(59, 130, 246, 0.4)'
                  : 'rgba(59, 130, 246, 0.3)',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={onPlayRandomChallenge}
          >
            <IconSymbol
              name="play.fill"
              size={24}
              color={colorScheme === 'dark' ? '#93C5FD' : '#3B82F6'}
            />
            <Text
              style={[
                styles.playButtonText,
                {
                  color: colorScheme === 'dark' ? '#E2E8F0' : '#0F172A',
                },
              ]}
            >
              {t('game_ui.start_game')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 24,
      textAlign: 'center',
    },
    section: {
      gap: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
    },
    sectionDescription: {
      fontSize: 14,
      lineHeight: 20,
    },
    playButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 20,
      borderRadius: 16,
      borderWidth: 2,
      marginTop: 8,
    },
    playButtonText: {
      fontSize: 18,
      fontWeight: '600',
    },
  });
};
