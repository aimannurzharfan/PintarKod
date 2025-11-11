import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);

  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const placeholderColor = colorScheme === 'dark' ? '#94A3B8' : '#64748B';

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

      if (user) {
        setUser({
          ...user,
          username: trimmedUsername,
          email: trimmedEmail,
        });
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
  }, [confirmPassword, email, password, router, setUser, t, user, username]);

  const languages = [
    { code: 'ms', label: t('edit_profile.language_ms') },
    { code: 'en', label: t('edit_profile.language_en') },
  ];

  const currentLanguage = (i18n.language || 'ms').split('-')[0];

  const handleLanguageChange = useCallback(
    async (code: string) => {
      try {
        await i18n.changeLanguage(code);
        await AsyncStorage.setItem('appLanguage', code);
      } catch (err) {
        console.warn('Language change failed:', err);
      }
    },
    [i18n]
  );

  const renderLanguageButton = (code: string, label: string) => {
    const isActive = currentLanguage === code;
    return (
      <Pressable
        key={code}
        onPress={() => handleLanguageChange(code)}
        style={({ pressed }) => [
          styles.languageButton,
          isActive && styles.languageButtonActive,
          pressed && styles.languageButtonPressed,
        ]}
      >
        <Text style={[styles.languageButtonText, isActive && styles.languageButtonTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

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

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('edit_profile.username')}</Text>
              <View style={styles.inputWrapper}>
                <IconSymbol name="person.fill" size={18} color={placeholderColor} />
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
                <IconSymbol name="envelope.fill" size={18} color={placeholderColor} />
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
                <IconSymbol name="lock.fill" size={18} color={placeholderColor} />
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
                <IconSymbol name="lock.fill" size={18} color={placeholderColor} />
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

            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>{t('edit_profile.language')}</Text>
            <Text style={styles.helpText}>{t('edit_profile.language_hint')}</Text>
            <View style={styles.languageRow}>
              {languages.map((lang) => renderLanguageButton(lang.code, lang.label))}
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
    helpText: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    languageRow: {
      flexDirection: 'row',
      gap: 12,
    },
    languageButton: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.35)' : '#CBD5F5',
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#F8FAFF',
    },
    languageButtonActive: {
      borderColor: '#2563EB',
      backgroundColor: 'rgba(37, 99, 235, 0.15)',
    },
    languageButtonPressed: {
      opacity: 0.85,
    },
    languageButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#1E293B',
    },
    languageButtonTextActive: {
      color: '#2563EB',
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
