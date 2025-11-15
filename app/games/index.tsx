import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type DebuggingChallenge = {
  id: string;
  title_en: string;
  title_ms: string;
  description_en: string;
  description_ms: string;
};

export default function GamesIndexScreen() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<DebuggingChallenge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentLang = i18n.language?.split('-')[0] || 'en';

  useEffect(() => {
    if (!user?.id) {
      router.replace('/');
      return;
    }

    fetchChallenges();
  }, [user]);

  const fetchChallenges = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${API_URL}/api/games/debugging?userId=${user.id}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('game_ui.error'));
      }

      setChallenges(data);
    } catch (err) {
      console.error('Fetch challenges error', err);
      setError(t('game_ui.error'));
      Alert.alert(t('common.error'), t('game_ui.error'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  const handleChallengePress = useCallback(
    (challengeId: string) => {
      router.push(`/games/debugging/${challengeId}` as any);
    },
    [router]
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={[styles.loadingText, { color: colorScheme === 'dark' ? '#CBD5F5' : '#475569' }]}>
            {t('game_ui.loading')}
          </Text>
        </View>
      </ThemedView>
    );
  }

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

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={fetchChallenges}
              >
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : challenges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                name="tray"
                size={48}
                color={colorScheme === 'dark' ? '#64748B' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: colorScheme === 'dark' ? '#94A3B8' : '#64748B' },
                ]}
              >
                {t('game_ui.no_challenges')}
              </Text>
            </View>
          ) : (
            <View style={styles.challengesList}>
              {challenges.map((challenge, index) => (
                <Pressable
                  key={challenge.id}
                  style={({ pressed }) => [
                    styles.challengeCard,
                    {
                      backgroundColor:
                        colorScheme === 'dark'
                          ? 'rgba(21, 33, 52, 0.9)'
                          : '#F5F9FF',
                      borderColor:
                        colorScheme === 'dark'
                          ? 'rgba(59, 130, 246, 0.32)'
                          : 'rgba(59, 130, 246, 0.18)',
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => handleChallengePress(challenge.id)}
                >
                  <View style={styles.challengeNumber}>
                    <Text
                      style={[
                        styles.challengeNumberText,
                        {
                          color:
                            colorScheme === 'dark' ? '#E2E8F0' : '#0F172A',
                        },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.challengeContent}>
                    <Text
                      style={[
                        styles.challengeTitle,
                        {
                          color:
                            colorScheme === 'dark' ? '#FFFFFF' : '#0F172A',
                        },
                      ]}
                    >
                      {currentLang === 'ms'
                        ? challenge.title_ms
                        : challenge.title_en}
                    </Text>
                    <Text
                      style={[
                        styles.challengeDescription,
                        {
                          color:
                            colorScheme === 'dark' ? '#CBD5F5' : '#475569',
                        },
                      ]}
                    >
                      {currentLang === 'ms'
                        ? challenge.description_ms
                        : challenge.description_en}
                    </Text>
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={20}
                    color={colorScheme === 'dark' ? '#93C5FD' : '#3B82F6'}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
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
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
    },
    errorContainer: {
      padding: 20,
      alignItems: 'center',
      gap: 12,
    },
    errorText: {
      color: isDark ? '#FCA5A5' : '#DC2626',
      fontSize: 14,
      textAlign: 'center',
    },
    retryButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: '#2563EB',
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
    },
    challengesList: {
      gap: 12,
    },
    challengeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      gap: 12,
    },
    challengeNumber: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark
        ? 'rgba(59, 130, 246, 0.2)'
        : 'rgba(59, 130, 246, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    challengeNumberText: {
      fontSize: 16,
      fontWeight: '700',
    },
    challengeContent: {
      flex: 1,
      gap: 4,
    },
    challengeTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    challengeDescription: {
      fontSize: 13,
      lineHeight: 18,
    },
  });
};


