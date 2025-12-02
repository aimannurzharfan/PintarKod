import { Badge } from '@/components/Badge';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
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
  profileImage: string | null;
  role: string;
  totalScore: number;
  badgeType?: 'Champion' | 'RisingStar' | 'Student' | 'Teacher';
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
};

const resolveAvatarUri = (profileImage?: string | null, avatarUrl?: string | null) => {
  // Check profileImage first (base64 data) - exactly like profile.tsx
  if (profileImage) {
    return profileImage.startsWith('data:') ? profileImage : `data:image/jpeg;base64,${profileImage}`;
  }
  // Fall back to avatarUrl
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  return `${API_URL}${avatarUrl}`;
};

export default function LeaderboardScreen() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);

  // Set header options
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('game_ui.leaderboard_title'),
      headerBackTitleVisible: false,
    });
  }, [navigation, t]);

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
      // Debug: Log to see what data we're receiving
      console.log('Leaderboard data received:', JSON.stringify(result, null, 2));
      if (result.leaderboard && result.leaderboard.length > 0) {
        console.log('First leaderboard entry:', JSON.stringify(result.leaderboard[0], null, 2));
        console.log('First entry profileImage:', result.leaderboard[0].profileImage ? 'exists' : 'null');
        console.log('First entry avatarUrl:', result.leaderboard[0].avatarUrl);
      }
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

          let podiumHeight = 200;
          let avatarSize = 70;
          if (isFirst) {
            podiumHeight = 240;
            avatarSize = 80;
          } else if (isSecond) {
            podiumHeight = 220;
            avatarSize = 75;
          } else if (isThird) {
            podiumHeight = 210;
            avatarSize = 72;
          }

          const avatarUri = resolveAvatarUri(entry.profileImage, entry.avatarUrl);
          // Debug logging for podium
          if (index === 0) {
            console.log(`Podium entry ${entry.username}:`, {
              profileImage: entry.profileImage ? 'exists' : 'null',
              avatarUrl: entry.avatarUrl,
              resolvedUri: avatarUri ? 'exists' : 'null'
            });
          }

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
                  <View style={styles.avatarMedalContainer}>
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={[styles.podiumAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('Failed to load avatar for user:', entry.username, error);
                        }}
                        onLoad={() => {
                          console.log('Successfully loaded avatar for user:', entry.username);
                        }}
                      />
                    ) : (
                      <View style={[styles.podiumAvatar, styles.podiumAvatarFallback, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                        <Feather
                          name="user"
                          size={avatarSize * 0.5}
                          color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                        />
                      </View>
                    )}
                  </View>
                  <Text style={styles.podiumRank}>#{actualRank}</Text>
                  <View style={styles.podiumUsernameRow}>
                    <Text style={styles.podiumUsername} numberOfLines={1}>
                      {entry.username}
                    </Text>
                    {entry.badgeType && (
                      <Badge badgeType={entry.badgeType} size="small" />
                    )}
                  </View>
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
    const avatarUri = resolveAvatarUri(item.profileImage, item.avatarUrl);
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
            <Image
              source={{ uri: avatarUri }}
              style={styles.listItemAvatar}
              resizeMode="cover"
              onError={(error) => {
                console.log('Failed to load avatar for user:', item.username, error);
              }}
              onLoad={() => {
                console.log('Successfully loaded avatar for user:', item.username);
              }}
            />
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
            <View style={styles.listItemUsernameRow}>
              <Text
                style={[
                  styles.listItemUsername,
                  isCurrentUser && styles.listItemUsernameCurrent,
                ]}
                numberOfLines={1}
              >
                {item.username}
              </Text>
              {item.badgeType && (
                <Badge badgeType={item.badgeType} size="small" />
              )}
            </View>
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
                {resolveAvatarUri(data.userRank.profileImage, data.userRank.avatarUrl) ? (
                  <Image
                    source={{ uri: resolveAvatarUri(data.userRank.profileImage, data.userRank.avatarUrl)! }}
                    style={styles.stickyUserBarAvatar}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('Failed to load avatar for user:', data.userRank.username, error);
                    }}
                    onLoad={() => {
                      console.log('Successfully loaded avatar for user:', data.userRank.username);
                    }}
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
                <View style={styles.stickyUserBarUsernameRow}>
                  <Text style={styles.stickyUserBarUsername} numberOfLines={1}>
                    {data.userRank.username}
                  </Text>
                  {data.userRank.badgeType && (
                    <Badge badgeType={data.userRank.badgeType} size="small" />
                  )}
                </View>
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
      gap: 8,
      paddingHorizontal: 10,
    },
    podiumItem: {
      flex: 1,
      alignItems: 'center',
      maxWidth: 110,
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
      padding: 16,
      paddingTop: 20,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    podiumContent: {
      alignItems: 'center',
      width: '100%',
      justifyContent: 'flex-start',
    },
    avatarMedalContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      width: '100%',
    },
    podiumAvatar: {
      backgroundColor: '#ccc',
      borderWidth: 3,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    },
    podiumAvatarFallback: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    },
    medalContainer: {
      marginTop: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    podiumRank: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 4,
    },
    podiumUsernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginBottom: 4,
    },
    podiumUsername: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#1E293B',
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
      backgroundColor: '#ccc',
    },
    listItemAvatarFallback: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listItemInfo: {
      flex: 1,
    },
    listItemUsernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
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
      backgroundColor: '#ccc',
    },
    stickyUserBarAvatarFallback: {
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stickyUserBarUsernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
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

