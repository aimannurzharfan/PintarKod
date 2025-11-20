import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config';

type LeaderboardEntry = {
  rank: number;
  userId: number;
  username: string;
  avatarUrl: string | null;
  role: string;
  totalScore: number;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
};

const resolveAvatarUri = (avatarUrl: string | null) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  return `${API_URL}${avatarUrl}`;
};

export default function LeaderboardScreen() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);

  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [token]);

  const fetchLeaderboard = async () => {
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const result: LeaderboardData = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const topThree = useMemo(() => {
    if (!data?.leaderboard) return [];
    return data.leaderboard.slice(0, 3);
  }, [data]);

  const restOfLeaderboard = useMemo(() => {
    if (!data?.leaderboard) return [];
    return data.leaderboard.slice(3);
  }, [data]);

  const renderPodium = () => {
    if (topThree.length === 0) return null;

    // Reorder for podium: 2nd (left), 1st (middle), 3rd (right)
    const [first, second, third] = topThree;
    const podiumOrder = [second, first, third].filter(Boolean);

    return (
      <View style={styles.podiumContainer}>
        {podiumOrder.map((entry, index) => {
          const actualRank = entry.rank;
          const isFirst = actualRank === 1;
          const isSecond = actualRank === 2;
          const isThird = actualRank === 3;

          let medalColor = '#94A3B8';
          let podiumHeight = 80;
          if (isFirst) {
            medalColor = '#FFD700'; // Gold
            podiumHeight = 120;
          } else if (isSecond) {
            medalColor = '#C0C0C0'; // Silver
            podiumHeight = 100;
          } else if (isThird) {
            medalColor = '#CD7F32'; // Bronze
            podiumHeight = 90;
          }

          const avatarUri = resolveAvatarUri(entry.avatarUrl);

          return (
            <View
              key={entry.userId}
              style={[
                styles.podiumItem,
                isFirst && styles.podiumItemFirst,
              ]}
            >
              <View style={[styles.podiumBase, { height: podiumHeight }]}>
                <View style={styles.podiumContent}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.podiumAvatar}
                    />
                  ) : (
                    <View style={[styles.podiumAvatar, styles.podiumAvatarFallback]}>
                      <Feather
                        name="user"
                        size={isFirst ? 40 : 32}
                        color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                      />
                    </View>
                  )}
                  <View style={styles.medalContainer}>
                    <Feather name="award" size={isFirst ? 32 : 24} color={medalColor} />
                  </View>
                  <Text style={styles.podiumRank}>#{actualRank}</Text>
                  <Text style={styles.podiumUsername} numberOfLines={1}>
                    {entry.username}
                  </Text>
                  <Text style={styles.podiumScore}>{entry.totalScore.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderListItem = ({ item }: { item: LeaderboardEntry }) => {
    const avatarUri = resolveAvatarUri(item.avatarUrl);
    const isCurrentUser = item.userId === Number(user?.id);

    return (
      <View
        style={[
          styles.listItem,
          isCurrentUser && styles.listItemCurrentUser,
        ]}
      >
        <View style={styles.listItemLeft}>
          <Text style={styles.listItemRank}>#{item.rank}</Text>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.listItemAvatar} />
          ) : (
            <View style={[styles.listItemAvatar, styles.listItemAvatarFallback]}>
              <Feather
                name="user"
                size={20}
                color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
              />
            </View>
          )}
          <View style={styles.listItemInfo}>
            <Text
              style={[
                styles.listItemUsername,
                isCurrentUser && styles.listItemUsernameCurrent,
              ]}
              numberOfLines={1}
            >
              {item.username}
            </Text>
            {isCurrentUser && (
              <Text style={styles.listItemYouLabel}>(You)</Text>
            )}
          </View>
        </View>
        <Text style={styles.listItemScore}>{item.totalScore.toLocaleString()}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Feather
                name="arrow-left"
                size={24}
                color={colorScheme === 'dark' ? '#FFFFFF' : '#0F172A'}
              />
            </Pressable>
            <ThemedText type="title" style={styles.headerTitle}>
              {t('game_ui.leaderboard_title')}
            </ThemedText>
            <View style={styles.backButton} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#FACC15' : '#1E293B'} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error || !data) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Feather
                name="arrow-left"
                size={24}
                color={colorScheme === 'dark' ? '#FFFFFF' : '#0F172A'}
              />
            </Pressable>
            <ThemedText type="title" style={styles.headerTitle}>
              {t('game_ui.leaderboard_title')}
            </ThemedText>
            <View style={styles.backButton} />
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || 'Failed to load leaderboard'}</Text>
            <Pressable onPress={fetchLeaderboard} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather
              name="arrow-left"
              size={24}
              color={colorScheme === 'dark' ? '#FFFFFF' : '#0F172A'}
            />
          </Pressable>
          <ThemedText type="title" style={styles.headerTitle}>
            {t('game_ui.leaderboard_title')}
          </ThemedText>
          <View style={styles.backButton} />
        </View>

        <ThemedText style={styles.description}>
          {t('game_ui.leaderboard_desc')}
        </ThemedText>

        <FlatList
          data={restOfLeaderboard}
          renderItem={renderListItem}
          keyExtractor={(item) => `rank-${item.rank}`}
          ListHeaderComponent={renderPodium}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Sticky User Bar */}
        {data.userRank && (
          <View style={styles.stickyUserBar}>
            <View style={styles.stickyUserBarContent}>
              <View style={styles.stickyUserBarLeft}>
                <Text style={styles.stickyUserBarRank}>
                  {data.userRank.rank ? `#${data.userRank.rank}` : '—'}
                </Text>
                {resolveAvatarUri(data.userRank.avatarUrl) ? (
                  <Image
                    source={{ uri: resolveAvatarUri(data.userRank.avatarUrl)! }}
                    style={styles.stickyUserBarAvatar}
                  />
                ) : (
                  <View style={[styles.stickyUserBarAvatar, styles.stickyUserBarAvatarFallback]}>
                    <Feather
                      name="user"
                      size={20}
                      color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                    />
                  </View>
                )}
                <Text style={styles.stickyUserBarUsername} numberOfLines={1}>
                  {data.userRank.username}
                </Text>
              </View>
              <Text style={styles.stickyUserBarScore}>
                {data.userRank.totalScore.toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
    },
    description: {
      fontSize: 14,
      paddingHorizontal: 20,
      paddingBottom: 16,
      opacity: 0.7,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: isDark ? '#F87171' : '#DC2626',
      marginBottom: 16,
      textAlign: 'center',
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: isDark ? '#3B82F6' : '#2563EB',
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 100, // Space for sticky bar
    },
    podiumContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-end',
      marginBottom: 32,
      paddingTop: 20,
      gap: 12,
    },
    podiumItem: {
      flex: 1,
      alignItems: 'center',
      maxWidth: 120,
    },
    podiumItemFirst: {
      zIndex: 1,
    },
    podiumBase: {
      width: '100%',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
      padding: 12,
      alignItems: 'center',
    },
    podiumContent: {
      alignItems: 'center',
      width: '100%',
    },
    podiumAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      marginBottom: 8,
    },
    podiumAvatarFallback: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    medalContainer: {
      marginBottom: 4,
    },
    podiumRank: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 4,
    },
    podiumUsername: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#1E293B',
      marginBottom: 4,
      textAlign: 'center',
    },
    podiumScore: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#FACC15' : '#1E293B',
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.02)',
    },
    listItemCurrentUser: {
      backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : 'rgba(250, 204, 21, 0.1)',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(250, 204, 21, 0.3)' : 'rgba(250, 204, 21, 0.2)',
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    listItemRank: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
      minWidth: 40,
    },
    listItemAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    listItemAvatarFallback: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listItemInfo: {
      flex: 1,
    },
    listItemUsername: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#1E293B',
    },
    listItemUsernameCurrent: {
      color: isDark ? '#FACC15' : '#1E293B',
    },
    listItemYouLabel: {
      fontSize: 12,
      color: isDark ? '#FACC15' : '#1E293B',
      fontWeight: '500',
    },
    listItemScore: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#FACC15' : '#1E293B',
    },
    stickyUserBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderTopWidth: 2,
      borderTopColor: isDark ? 'rgba(250, 204, 21, 0.3)' : 'rgba(250, 204, 21, 0.2)',
      paddingBottom: 20,
      paddingTop: 12,
      paddingHorizontal: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    stickyUserBarContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stickyUserBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    stickyUserBarRank: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#FACC15' : '#1E293B',
      minWidth: 50,
    },
    stickyUserBarAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    stickyUserBarAvatarFallback: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stickyUserBarUsername: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#1E293B',
      flex: 1,
    },
    stickyUserBarScore: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#FACC15' : '#1E293B',
    },
  });
};

