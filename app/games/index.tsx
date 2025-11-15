import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
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
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);

  const currentLang = i18n.language?.split('-')[0] || 'en';

  const onPlayRandomChallenge = useCallback(() => {
    if (!user?.id) {
      router.replace('/');
      return;
    }

    // Navigate to the game screen - it will fetch its own quiz
    router.push('/games/debugging/play');
  }, [user, router]);

  const gameCards: GameCard[] = useMemo(
    () => [
      {
        id: 'debugging',
        title: t('game_ui.debugging_title'),
        description: t('game_ui.debugging_desc'),
        icon: 'alert-circle',
        enabled: true,
        onPress: onPlayRandomChallenge,
      },
      {
        id: 'troubleshooting',
        title: t('game_ui.troubleshooting_title'),
        description: t('game_ui.troubleshooting_desc'),
        icon: 'wrench',
        enabled: false,
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

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedText type="title" style={styles.title}>
          {t('game_ui.title')}
        </ThemedText>

        <View style={styles.gamesGrid}>
          {gameCards.map((game) => (
            <Pressable
              key={game.id}
              style={({ pressed }) => [
                styles.gameCard,
                !game.enabled && styles.gameCardDisabled,
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
                  styles.iconWrapper,
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
                  size={24}
                  color={game.enabled ? "#000000" : (colorScheme === 'dark' ? '#64748B' : '#94A3B8')}
                />
              </View>
              <View style={styles.gameCardContent}>
                <Text
                  style={[
                    styles.gameCardTitle,
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
                >
                  {game.title}
                </Text>
                <Text
                  style={[
                    styles.gameCardDescription,
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
                >
                  {game.description}
                </Text>
              </View>
              {game.enabled && (
                <IconSymbol
                  name="chevron.right"
                  size={20}
                  color={colorScheme === 'dark' ? '#93C5FD' : '#3B82F6'}
                />
              )}
            </Pressable>
          ))}
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
    gamesGrid: {
      gap: 16,
    },
    gameCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderRadius: 18,
      borderWidth: 2,
      gap: 16,
    },
    gameCardDisabled: {
      opacity: 0.6,
    },
    iconWrapper: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gameCardContent: {
      flex: 1,
      gap: 6,
    },
    gameCardTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    gameCardDescription: {
      fontSize: 14,
      lineHeight: 20,
    },
  });
};
