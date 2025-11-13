import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

const resolveAvatarUri = (profileImage?: string | null, avatarUrl?: string | null) => {
  if (profileImage) {
    return profileImage.startsWith('data:')
      ? profileImage
      : `data:image/jpeg;base64,${profileImage}`;
  }
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  return `${API_URL}${avatarUrl}`;
};

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);

  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [avatarDataUri, setAvatarDataUri] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    resolveAvatarUri(user?.profileImage ?? null, user?.avatarUrl ?? null)
  );

  const placeholderColor = colorScheme === 'dark' ? '#94A3B8' : '#64748B';

  useEffect(() => {
    if (avatarChanged) return;
    setAvatarPreview(resolveAvatarUri(user?.profileImage ?? null, user?.avatarUrl ?? null));
  }, [avatarChanged, user?.avatarUrl, user?.profileImage]);

  const handlePickAvatar = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('edit_profile.avatar_permission_title'),
          t('edit_profile.avatar_permission_message')
        );
        return;
      }

      setPickingAvatar(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.85,
        base64: true,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert(t('edit_profile.avatar_error_title'), t('edit_profile.avatar_unreadable'));
        return;
      }

      const mime = asset.mimeType ?? 'image/jpeg';
      const dataUri = `data:${mime};base64,${asset.base64}`;
      setAvatarDataUri(dataUri);
      setAvatarPreview(dataUri);
      setAvatarChanged(true);
    } catch (err) {
      console.error('Avatar pick error', err);
      Alert.alert(
        t('edit_profile.avatar_error_title'),
        t('edit_profile.avatar_generic_error')
      );
    } finally {
      setPickingAvatar(false);
    }
  }, [t]);

  const handleResetAvatar = useCallback(() => {
    setAvatarDataUri(null);
    setAvatarPreview(resolveAvatarUri(user?.profileImage ?? null, user?.avatarUrl ?? null));
    setAvatarChanged(false);
  }, [user?.avatarUrl, user?.profileImage]);

  const handleSave = useCallback(async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail) {
      Alert.alert(t('edit_profile.title'), t('edit_profile.validation'));
      return;
    }

    if (password && password !== confirmPassword) {
      Alert.alert(t('edit_profile.title'), t('edit_profile.password_mismatch'));
      return;
    }

    if (!user?.username) {
      Alert.alert(t('edit_profile.title'), t('edit_profile.error_generic'));
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        username: trimmedUsername,
        email: trimmedEmail,
      };

      if (password) {
        payload.password = password;
      }

      const response = await fetch(`${API_URL}/api/users/${encodeURIComponent(user.username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert(t('edit_profile.title'), data.error || t('edit_profile.error_generic'));
        return;
      }

      let authUser = user
        ? {
            ...user,
            username: trimmedUsername,
            email: trimmedEmail,
          }
        : null;

      if (avatarChanged && avatarDataUri) {
        const avatarResponse = await fetch(
          `${API_URL}/api/users/${encodeURIComponent(trimmedUsername)}/avatar`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: avatarDataUri }),
          }
        );

        const avatarData = await avatarResponse.json();
        if (!avatarResponse.ok) {
          Alert.alert(
            t('edit_profile.title'),
            avatarData.error || t('edit_profile.avatar_upload_failed')
          );
          return;
        }

        if (authUser) {
          authUser = {
            ...authUser,
            profileImage: avatarData.profileImage ?? null,
            avatarUrl: avatarData.avatarUrl ?? null,
          };
        }

        setAvatarChanged(false);
        setAvatarDataUri(null);
        setAvatarPreview(resolveAvatarUri(avatarData.profileImage, avatarData.avatarUrl));
      }

      if (authUser) {
        setUser(authUser);
      }

      setPassword('');
      setConfirmPassword('');

      Alert.alert(t('edit_profile.success_title'), t('edit_profile.success_message'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert(t('edit_profile.title'), t('common.network_error'));
    } finally {
      setSaving(false);
    }
  }, [
    avatarChanged,
    avatarDataUri,
    confirmPassword,
    email,
    password,
    router,
    setUser,
    t,
    user,
    username,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>{t('edit_profile.title')}</Text>

            <View style={styles.avatarSection}>
              <Text style={styles.avatarTitle}>{t('edit_profile.avatar_title')}</Text>
              {avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <IconSymbol name="person.fill" size={36} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.avatarActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.avatarButton,
                    pressed && styles.avatarButtonPressed,
                  ]}
                  onPress={handlePickAvatar}
                  disabled={pickingAvatar}
                >
                  {pickingAvatar ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.avatarButtonText}>
                      {avatarPreview
                        ? t('edit_profile.avatar_change')
                        : t('edit_profile.avatar_upload')}
                    </Text>
                  )}
                </Pressable>
                {avatarChanged ? (
                  <Pressable style={styles.avatarReset} onPress={handleResetAvatar}>
                    <Text style={styles.avatarResetText}>{t('common.reset')}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.avatarHelp}>{t('edit_profile.avatar_hint')}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('edit_profile.username')}</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={18} color={placeholderColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder={t('edit_profile.username')}
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  textContentType="username"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('edit_profile.email')}</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color={placeholderColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('edit_profile.email')}
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>{t('edit_profile.change_password')}</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('edit_profile.new_password')}</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color={placeholderColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('edit_profile.new_password')}
                  placeholderTextColor={placeholderColor}
                  secureTextEntry
                  textContentType="newPassword"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('edit_profile.confirm_password')}</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color={placeholderColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('edit_profile.confirm_password')}
                  placeholderTextColor={placeholderColor}
                  secureTextEntry
                  textContentType="newPassword"
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                saving && styles.saveButtonDisabled,
                pressed && !saving && styles.saveButtonPressed,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>{t('common.loading')}</Text>
                </>
              ) : (
                <Text style={styles.saveButtonText}>{t('edit_profile.save_button')}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flex: {
      flex: 1,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingVertical: 32,
      alignItems: 'stretch',
    },
    card: {
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : '#FFFFFF',
      borderRadius: 28,
      padding: 24,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0',
      shadowColor: '#0F172A',
      shadowOpacity: isDark ? 0.28 : 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
      gap: 18,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#0F172A',
      textAlign: 'center',
    },
    avatarSection: {
      alignItems: 'center',
      gap: 8,
    },
    avatarTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#0F172A',
      alignSelf: 'flex-start',
    },
    avatarImage: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0',
    },
    avatarFallback: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: '#2563EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarButton: {
      backgroundColor: '#2563EB',
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 10,
      minWidth: 140,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarButtonPressed: {
      opacity: 0.9,
    },
    avatarButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    avatarReset: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.2)',
    },
    avatarResetText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#1E293B',
    },
    avatarHelp: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      textAlign: 'center',
    },
    fieldGroup: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#CBD5F5' : '#475569',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#E2E8F0',
      paddingHorizontal: 14,
    },
    inputIcon: {
      marginTop: 1,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: isDark ? '#F8FAFC' : '#0F172A',
      paddingVertical: 12,
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0',
      marginVertical: 4,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#0F172A',
      marginTop: 6,
    },
    saveButton: {
      marginTop: 8,
      backgroundColor: '#2563EB',
      borderRadius: 20,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    saveButtonDisabled: {
      opacity: 0.75,
    },
    saveButtonPressed: {
      opacity: 0.9,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
};
