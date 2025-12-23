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
          {/* UI unchanged */}

