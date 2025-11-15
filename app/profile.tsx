import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { API_URL } from './config';

type ProfileUser = {
  id: string;
  username: string;
  email?: string | null;
  role?: string | null;
  createdAt: string;
  profileImage?: string | null;
  avatarUrl?: string | null;
};

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

export default function ProfileScreen() {
  const [searchId, setSearchId] = useState('');
  const [searchedUser, setSearchedUser] = useState<ProfileUser | null>(null);
  const [currentUser, setCurrentUser] = useState<ProfileUser | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { user: authUser, logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);
  const placeholderColor = colorScheme === 'dark' ? '#94A3B8' : '#64748B';
  const { t } = useTranslation();

  const heroAvatarUri = resolveAvatarUri(
    currentUser?.profileImage ?? authUser?.profileImage,
    currentUser?.avatarUrl ?? authUser?.avatarUrl
  );
  const isTeacher = (authUser?.role ?? currentUser?.role) === 'Teacher';
  const displayUsername = currentUser?.username ?? authUser?.username ?? '—';
  const displayEmail = currentUser?.email ?? authUser?.email ?? '';

  const loadCurrentUser = useCallback(async () => {
    if (!authUser?.username) return;
    setLoadingProfile(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(authUser.username)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('profile.load_error'));
        setCurrentUser(null);
        return;
      }
      setCurrentUser(data);
    } catch (err) {
      console.error(err);
      setError(t('common.network_error'));
    } finally {
      setLoadingProfile(false);
    }
  }, [authUser?.username, t]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const handleEditProfile = useCallback(() => {
    router.push('/edit-profile');
  }, [router]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(t('profile.delete'), t('profile.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.delete'), style: 'destructive', onPress: () => router.push('/delete-account') },
    ]);
  }, [router, t]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace('/');
  }, [logout, router]);

  const handleSearch = useCallback(async () => {
    const trimmed = searchId.trim();
    if (!trimmed) {
      Alert.alert(t('profile.title'), t('profile.validation_username'));
      return;
    }
    setLoadingSearch(true);
    setSearchError(null);
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || t('profile.load_error'));
        setSearchedUser(null);
        return;
      }
      setSearchedUser(data);
    } catch (err) {
      console.error(err);
      setSearchError(t('common.network_error'));
    } finally {
      setLoadingSearch(false);
    }
  }, [searchId, t]);

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value?.toString() || '—'}</Text>
    </View>
  );

  const renderSearchedUser = () => {
    if (!searchedUser) return null;
    const avatarUri = resolveAvatarUri(searchedUser.profileImage, searchedUser.avatarUrl);
    return (
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.resultAvatar} />
          ) : (
            <View style={styles.resultAvatarFallback}>
              <IconSymbol name="person.fill" size={20} color="#FFFFFF" />
            </View>
          )}
          <View>
            <Text style={styles.resultUsername}>@{searchedUser.username}</Text>
            {searchedUser.email ? (
              <Text style={styles.resultEmail}>{searchedUser.email}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.infoList}>
          <InfoRow label={t('register.role')} value={searchedUser.role} />
          {searchedUser.className && (
            <InfoRow 
              label={t('profile.class')} 
              value={searchedUser.role === 'Teacher' ? 'Educator' : searchedUser.className} 
            />
          )}
          <InfoRow label={t('profile.joined')} value={formatTimestamp(searchedUser.createdAt)} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>{t('profile.title')}</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {heroAvatarUri ? (
              <Image source={{ uri: heroAvatarUri }} style={styles.profileAvatar} />
            ) : (
              <View style={styles.profileAvatarFallback}>
                <IconSymbol name="person.fill" size={28} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.profileHeaderText}>
              <Text style={styles.profileTitle}>{t('profile.title')}</Text>
              <Text style={styles.profileUsername}>@{displayUsername}</Text>
              {displayEmail ? <Text style={styles.profileEmail}>{displayEmail}</Text> : null}
            </View>
          </View>
          {loadingProfile ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loaderText}>{t('common.loading')}</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : currentUser ? (
            <View style={styles.infoList}>
              <InfoRow label={t('register.username')} value={currentUser.username} />
              <InfoRow label={t('register.email')} value={currentUser.email} />
              <InfoRow label={t('register.role')} value={currentUser.role} />
              <InfoRow label={t('profile.joined')} value={formatTimestamp(currentUser.createdAt)} />
            </View>
          ) : (
            <Text style={styles.mutedText}>{t('profile.no_data')}</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.search_title')}</Text>
          <View style={styles.searchInput}>
            <IconSymbol name="magnifyingglass" size={18} color={placeholderColor} />
            <TextInput
              style={styles.searchField}
              placeholder={t('profile.search_placeholder')}
              placeholderTextColor={placeholderColor}
              value={searchId}
              onChangeText={setSearchId}
              autoCapitalize="none"
            />
          </View>
          <Pressable
            onPress={handleSearch}
            disabled={loadingSearch}
            style={({ pressed }) => [
              styles.searchButton,
              loadingSearch && styles.searchButtonDisabled,
              pressed && !loadingSearch && styles.searchButtonPressed,
            ]}
          >
            {loadingSearch ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.searchButtonText}>{t('common.loading')}</Text>
              </>
            ) : (
              <Text style={styles.searchButtonText}>{t('profile.search_button')}</Text>
            )}
          </Pressable>
          {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
          {renderSearchedUser()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? '#020617' : '#F3F4FF',
    },
    container: {
      paddingHorizontal: 20,
      paddingVertical: 28,
      gap: 20,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#0F172A',
      textAlign: 'center',
    },
    profileCard: {
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#FFFFFF',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0',
      gap: 16,
      shadowColor: '#0F172A',
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    profileAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
    },
    profileAvatarFallback: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#2563EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileHeaderText: {
      flex: 1,
      gap: 4,
    },
    profileTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#CBD5F5' : '#64748B',
    },
    profileUsername: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#0F172A',
    },
    profileEmail: {
      fontSize: 14,
      color: isDark ? '#CBD5F5' : '#475569',
    },
    infoList: {
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    infoLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#CBD5F5' : '#475569',
      flexShrink: 0,
      minWidth: 120,
    },
    infoValue: {
      fontSize: 14,
      color: isDark ? '#F8FAFC' : '#0F172A',
      flex: 1,
      textAlign: 'right',
    },
    mutedText: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#64748B',
      textAlign: 'center',
    },
    loaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loaderText: {
      fontSize: 14,
      color: isDark ? '#CBD5F5' : '#475569',
    },
    errorText: {
      fontSize: 14,
      color: '#DC2626',
      textAlign: 'center',
    },
    sectionCard: {
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#FFFFFF',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0',
      gap: 16,
      shadowColor: '#0F172A',
      shadowOpacity: isDark ? 0.12 : 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#0F172A',
    },
    searchInput: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0',
      paddingHorizontal: 14,
    },
    searchField: {
      flex: 1,
      fontSize: 14,
      color: isDark ? '#F8FAFC' : '#0F172A',
      paddingVertical: 12,
    },
    searchButton: {
      marginTop: 4,
      backgroundColor: '#2563EB',
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    searchButtonDisabled: {
      opacity: 0.75,
    },
    searchButtonPressed: {
      opacity: 0.9,
    },
    searchButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    resultCard: {
      marginTop: 12,
      borderRadius: 18,
      padding: 16,
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#F1F5F9',
      gap: 12,
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    resultAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    resultAvatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#2563EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultUsername: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F8FAFC' : '#0F172A',
    },
    resultEmail: {
      fontSize: 13,
      color: isDark ? '#CBD5F5' : '#475569',
    },
  });
};
