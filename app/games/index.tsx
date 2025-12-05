import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

type GameCard = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  enabled: boolean;
  onPress?: () => void;
};

export default function GamesIndexScreen() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme ?? null), [colorScheme]);

  const currentLang = i18n.language?.split('-')[0] || 'en';

  const onPlayRandomChallenge = useCallback(() => {
    if (!user?.id) {
      router.replace('/');
      return;
    }

    // Navigate to the game screen - it will fetch its own quiz
    router.push('/games/debugging/play');
  }, [user, router]);

  const onPlayTroubleshooting = useCallback(() => {
    if (!user?.id) {
      router.replace('/');
      return;
    }

    // Navigate to the troubleshooting game we added
    router.push('/games/troubleshooting/play' as any);
  }, [user, router]);

  const gameCards: GameCard[] = useMemo(
    () => [
      {
        id: 'debugging',
        title: t('game_ui.debugging_title'),
        description: t('game_ui.debugging_desc'),
        icon: 'alert-triangle',
        enabled: true,
        onPress: onPlayRandomChallenge,
      },
      {
        id: 'troubleshooting',
        title: t('game_ui.troubleshooting_title'),
        description: t('game_ui.troubleshooting_desc'),
        icon: 'settings',
        enabled: true,
        onPress: onPlayTroubleshooting,
      },
      {
        id: 'programming',
        title: t('game_ui.programming_title'),
        description: t('game_ui.programming_desc'),
        icon: 'code',
        enabled: false,
      },
      {
        id: 'puzzle',
        title: t('game_ui.puzzle_title'),
        description: t('game_ui.puzzle_desc'),
        icon: 'grid',
        enabled: false,
      },
    ],
    [t, onPlayRandomChallenge]
  );

  const onNavigateToLeaderboard = useCallback(() => {
    router.push('/leaderboard');
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedText type="title" style={styles.title}>
          {t('game_ui.title')}
        </ThemedText>

        {/* Section 1: Challenges */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t('game_ui.challenges_title')}
          </ThemedText>
          <View style={styles.challengesGrid}>
            {gameCards.map((game) => (
              <Pressable
                key={game.id}
                style={({ pressed }) => [
                  styles.challengeCard,
                  !game.enabled && styles.challengeCardDisabled,
                  {
                    backgroundColor: game.enabled
                      ? colorScheme === 'dark'
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'rgba(59, 130, 246, 0.05)'
                      : colorScheme === 'dark'
                      ? 'rgba(148, 163, 184, 0.05)'
                      : 'rgba(148, 163, 184, 0.02)',
                    borderColor: game.enabled
                      ? colorScheme === 'dark'
                        ? 'rgba(59, 130, 246, 0.3)'
                        : 'rgba(59, 130, 246, 0.2)'
                      : colorScheme === 'dark'
                      ? 'rgba(148, 163, 184, 0.2)'
                      : 'rgba(148, 163, 184, 0.1)',
                    transform: [{ scale: pressed && game.enabled ? 0.98 : 1 }],
                  },
                ]}
                onPress={game.enabled ? game.onPress : undefined}
                disabled={!game.enabled}
              >
                <View
                  style={[
                    styles.challengeIconWrapper,
                    {
                      backgroundColor: game.enabled
                        ? colorScheme === 'dark'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(59, 130, 246, 0.1)'
                        : colorScheme === 'dark'
                        ? 'rgba(148, 163, 184, 0.1)'
                        : 'rgba(148, 163, 184, 0.05)',
                    },
                  ]}
                >
                  <Feather
                    name={game.icon}
                    size={20}
                    color={game.enabled ? "#000000" : (colorScheme === 'dark' ? '#64748B' : '#94A3B8')}
                  />
                </View>
                <View style={styles.challengeCardContent}>
                  <Text
                    style={[
                      styles.challengeCardTitle,
                      {
                        color: game.enabled
                          ? colorScheme === 'dark'
                            ? '#FFFFFF'
                            : '#0F172A'
                          : colorScheme === 'dark'
                          ? '#64748B'
                          : '#94A3B8',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {game.title}
                  </Text>
                  <Text
                    style={[
                      styles.challengeCardDescription,
                      {
                        color: game.enabled
                          ? colorScheme === 'dark'
                            ? '#CBD5F5'
                            : '#475569'
                          : colorScheme === 'dark'
                          ? '#64748B'
                          : '#94A3B8',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {game.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Section 2: Rankings */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t('game_ui.rankings_title')}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.leaderboardCard,
              {
                backgroundColor: colorScheme === 'dark'
                  ? 'rgba(250, 204, 21, 0.15)'
                  : 'rgba(250, 204, 21, 0.1)',
                borderColor: colorScheme === 'dark'
                  ? 'rgba(250, 204, 21, 0.4)'
                  : 'rgba(250, 204, 21, 0.3)',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={onNavigateToLeaderboard}
          >
            <View style={styles.leaderboardCardContent}>
              <View
                style={[
                  styles.leaderboardIconWrapper,
                  {
                    backgroundColor: colorScheme === 'dark'
                      ? 'rgba(250, 204, 21, 0.2)'
                      : 'rgba(250, 204, 21, 0.15)',
                  },
                ]}
              >
                <Feather
                  name="award"
                  size={32}
                  color={colorScheme === 'dark' ? '#FACC15' : '#EAB308'}
                />
              </View>
              <View style={styles.leaderboardCardText}>
                <Text
                  style={[
                    styles.leaderboardCardTitle,
                    {
                      color: colorScheme === 'dark' ? '#FACC15' : '#EAB308',
                    },
                  ]}
                >
                  {t('game_ui.leaderboard_title')}
                </Text>
                <Text
                  style={[
                    styles.leaderboardCardDescription,
                    {
                      color: colorScheme === 'dark' ? '#E2E8F0' : '#475569',
                    },
                  ]}
                >
                  {t('game_ui.leaderboard_desc')}
                </Text>
              </View>
              <IconSymbol
                name="chevron.right"
                size={24}
                color={colorScheme === 'dark' ? '#FACC15' : '#EAB308'}
              />
            </View>
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
      paddingBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 32,
      textAlign: 'center',
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 16,
    },
    challengesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    challengeCard: {
      width: '48%',
      padding: 16,
      borderRadius: 16,
      borderWidth: 2,
      gap: 12,
    },
    challengeCardDisabled: {
      opacity: 0.6,
    },
    challengeIconWrapper: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    challengeCardContent: {
      gap: 6,
    },
    challengeCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    challengeCardDescription: {
      fontSize: 12,
      lineHeight: 16,
    },
    leaderboardCard: {
      padding: 20,
      borderRadius: 18,
      borderWidth: 2,
    },
    leaderboardCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    leaderboardIconWrapper: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    leaderboardCardText: {
      flex: 1,
      gap: 4,
    },
    leaderboardCardTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 4,
    },
    leaderboardCardDescription: {
      fontSize: 14,
      lineHeight: 20,
    },
  });
};
