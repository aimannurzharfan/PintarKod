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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';

/* ------------------------- Helpers ------------------------- */
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

/* ======================= Component ======================== */
export default function EditProfileScreen() {
  /* ------------------------- Context & Hooks ------------------------- */
  const { user, setUser } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);

  /* ------------------------- State ------------------------- */
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

  /* ------------------------- Effects ------------------------- */
  useEffect(() => {
    if (avatarChanged) return;
    setAvatarPreview(resolveAvatarUri(user?.profileImage ?? null, user?.avatarUrl ?? null));
  }, [avatarChanged, user?.avatarUrl, user?.profileImage]);

  /* ------------------------- Avatar Handlers ------------------------- */
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

      if (result.canceled || !result.assets?.length) return;

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

  /* ------------------------- Save Handler ------------------------- */
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

      if (password) payload.password = password;

      const response = await fetch(
        `${API_URL}/api/users/${encodeURIComponent(user.username)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        Alert.alert(t('edit_profile.title'), data.error || t('edit_profile.error_generic'));
        return;
      }

      let authUser = user
        ? { ...user, username: trimmedUsername, email: trimmedEmail }
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

      if (authUser) setUser(authUser);

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

  /* ------------------------- UI ------------------------- */
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
            <Text style={styles.cardTitle}>{t('edit_profile.title')}</Text>

            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              {avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <IconSymbol name="person.fill" size={32} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.avatarActions}>
                <Pressable
                  style={styles.avatarButton}
                  onPress={handlePickAvatar}
                  disabled={pickingAvatar}
                >
                  {pickingAvatar ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <>
                      <Feather name="camera" size={16} color="#2563EB" />
                      <Text style={styles.avatarButtonText}>
                        {avatarPreview ? t('edit_profile.avatar_change') : t('edit_profile.avatar_upload')}
                      </Text>
                    </>
                  )}
                </Pressable>
                {avatarChanged && (
                  <Pressable style={styles.avatarResetButton} onPress={handleResetAvatar}>
                    <Feather name="x" size={16} color="#EF4444" />
                    <Text style={styles.avatarResetText}>{t('common.cancel')}</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.avatarHint}>{t('edit_profile.avatar_hint')}</Text>
            </View>

            {/* Form Fields */}
            <View style={styles.form}>
              {/* Username */}
              <View style={styles.field}>
                <Text style={styles.label}>{t('edit_profile.username')}</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="user" size={18} color={placeholderColor} />
                  <TextInput
                    placeholder={t('edit_profile.username')}
                    placeholderTextColor={placeholderColor}
                    value={username}
                    onChangeText={setUsername}
                    style={styles.inputField}
                    autoCapitalize="words"
                    textContentType="username"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>{t('edit_profile.email')}</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={18} color={placeholderColor} />
                  <TextInput
                    placeholder={t('edit_profile.email')}
                    placeholderTextColor={placeholderColor}
                    value={email}
                    onChangeText={setEmail}
                    style={styles.inputField}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                  />
                </View>
              </View>

              {/* Password Section */}
              <View style={styles.passwordSection}>
                <Text style={styles.sectionTitle}>{t('edit_profile.change_password')}</Text>

                {/* New Password */}
                <View style={styles.field}>
                  <Text style={styles.label}>{t('edit_profile.new_password')}</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={18} color={placeholderColor} />
                    <TextInput
                      placeholder={t('edit_profile.new_password')}
                      placeholderTextColor={placeholderColor}
                      value={password}
                      onChangeText={setPassword}
                      style={styles.inputField}
                      secureTextEntry
                      textContentType="newPassword"
                    />
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.field}>
                  <Text style={styles.label}>{t('edit_profile.confirm_password')}</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={18} color={placeholderColor} />
                    <TextInput
                      placeholder={t('edit_profile.confirm_password')}
                      placeholderTextColor={placeholderColor}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      style={styles.inputField}
                      secureTextEntry
                      textContentType="newPassword"
                    />
                  </View>
                </View>
              </View>

              {/* Save Button */}
              <Pressable
                style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t('common.loading')}</Text>
                  </>
                ) : (
                  <Text style={styles.primaryButtonText}>{t('edit_profile.save_button')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ======================= Styles ======================= */
const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
  const palette = isDark
    ? {
        background: '#020617',
        card: 'rgba(15, 23, 42, 0.88)',
        border: 'rgba(148, 163, 184, 0.35)',
        input: 'rgba(15, 23, 42, 0.92)',
        text: '#E2E8F0',
        muted: '#94A3B8',
      }
    : {
        background: '#F0F4FF',
        card: '#FFFFFF',
        border: '#E2E8F0',
        input: '#F8FAFC',
        text: '#0F172A',
        muted: '#64748B',
      };

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    flex: {
      flex: 1,
    },
    container: {
      flexGrow: 1,
      padding: 24,
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: 28,
      padding: 28,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 24,
    },
    cardTitle: {
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      color: palette.text,
    },
    avatarSection: {
      alignItems: 'center',
      gap: 16,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      borderColor: '#2563EB',
    },
    avatarFallback: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#2563EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarActions: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    avatarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#2563EB',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    avatarButtonText: {
      color: '#2563EB',
      fontSize: 14,
      fontWeight: '600',
    },
    avatarResetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    avatarResetText: {
      color: '#EF4444',
      fontSize: 14,
      fontWeight: '600',
    },
    avatarHint: {
      fontSize: 12,
      color: palette.muted,
      textAlign: 'center',
    },
    form: {
      gap: 20,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: palette.input,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 14,
    },
    inputField: {
      flex: 1,
      fontSize: 15,
      color: palette.text,
      paddingVertical: 12,
    },
    passwordSection: {
      gap: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.text,
    },
    primaryButton: {
      marginTop: 12,
      backgroundColor: '#2563EB',
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    primaryButtonDisabled: {
      opacity: 0.75,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
};

