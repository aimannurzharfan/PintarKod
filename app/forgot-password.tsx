// Forgot Password Screen
// This screen allows users to request a password reset by submitting their email address.
// It handles user input validation, API communication, loading states, and feedback alerts.
// The UI adapts to light and dark themes and supports internationalization (i18n).

import { API_URL } from '@/config';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';

/**
 * Simple email validation helper.
 * Returns true for basic valid-looking email addresses.
 */
const validateEmail = (value?: string) => {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(v);
};

export default function ForgotPassword() {
  // State to store user's email input
  const [email, setEmail] = useState('');
  // State to control loading indicator during API request
  const [loading, setLoading] = useState(false);
  // Router instance for navigation
  const router = useRouter();
  // Detect system theme (light / dark)
  const colorScheme = useColorScheme();
  // Memoized styles to avoid unnecessary recalculations on re-render
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);
  // Translation hook for multi-language support
  const { t } = useTranslation();
  // Memoized placeholder color derived from theme
  const placeholderColor = useMemo(() => (colorScheme === 'dark' ? '#94A3B8' : '#64748B'), [colorScheme]);

  /** Small input component that pairs an icon with a text input */
  const InputWithIcon = ({
    value,
    onChangeText,
  }: {
    value: string;
    onChangeText: (v: string) => void;
  }) => (
    <View style={styles.inputWrapper}>
      <Feather name="mail" size={18} color={placeholderColor} style={styles.inputIcon} />
      <TextInput
        placeholder={t('forgot_password.email_placeholder')}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        style={styles.inputField}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
    </View>
  );

  /** Returns the style array for the primary button */
  const getPrimaryButtonStyles = useCallback(
    (pressed: boolean) => [
      styles.primaryButton,
      loading && styles.primaryButtonDisabled,
      pressed && !loading && styles.primaryButtonPressed,
    ],
    [styles, loading]
  );

  /**
   * Handles forgot password form submission
   * - Validates email input
   * - Sends request to backend API
   * - Displays success or error feedback
   */
  const handleSubmit = useCallback(async () => {
    if (!validateEmail(email)) {
      Alert.alert(t('forgot_password.title'), t('forgot_password.validation_email'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        Alert.alert(t('forgot_password.error'), data.error || t('forgot_password.error_message'));
        return;
      }

      Alert.alert(t('forgot_password.success_title'), t('forgot_password.success_message'), [
        {
          text: t('common.ok'),
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert(t('forgot_password.error'), t('forgot_password.network_error'));
    } finally {
      setLoading(false);
    }
  }, [email, router, t]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* SafeAreaView ensures content is displayed correctly on devices with notches */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* KeyboardAvoidingView prevents keyboard from overlapping input fields */}
        <ScrollView
          contentContainerStyle={styles.container}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
        >
          {/* ScrollView allows screen to remain usable on smaller devices */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('forgot_password.title')}</Text>
            <Text style={styles.subtitle}>{t('forgot_password.subtitle')}</Text>
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('forgot_password.email')}</Text>
                <InputWithIcon value={email} onChangeText={setEmail} />
              </View>
              
              {/* Primary submit button — shows loading indicator when request is in progress */}
              <Pressable
                style={({ pressed }) => getPrimaryButtonStyles(pressed)}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t('forgot_password.button_loading')}</Text>
                  </>
                ) : (
                  <Text style={styles.primaryButtonText}>{t('forgot_password.button')}</Text>
                )}
              </Pressable>

              {/* Secondary button to navigate back to login screen */}
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
                onPress={() => router.back()}
              >
                <Feather
                  name="arrow-left"
                  size={16}
                  color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                  style={styles.backIcon}
                />
                <Text style={styles.secondaryButtonText}>{t('forgot_password.back_to_login')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Dynamically generates styles based on system color scheme
// Ensures consistent theming for light and dark modes
const getStyles = (colorScheme: any) => {
  // Color palette definition for light and dark themes
  const palette =
    colorScheme === 'dark'
      ? {
          background: '#020617',
          card: 'rgba(15, 23, 42, 0.88)',
          border: 'rgba(148, 163, 184, 0.35)',
          input: 'rgba(15, 23, 42, 0.92)',
          text: '#E2E8F0',
          muted: '#94A3B8',
          shadowOpacity: 0.25,
          accent: '#93C5FD',
        }
      : {
          background: '#F0F4FF',
          card: '#FFFFFF',
          border: '#E2E8F0',
          input: '#F8FAFC',
          text: '#0F172A',
          muted: '#64748B',
          shadowOpacity: 0.12,
          accent: '#2563EB',
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
      paddingHorizontal: 24,
      paddingVertical: 32,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: 28,
      padding: 28,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: '#0F172A',
      shadowOpacity: palette.shadowOpacity,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      gap: 24,
    },
    cardTitle: {
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      color: palette.text,
    },
    subtitle: {
      fontSize: 15,
      textAlign: 'center',
      color: palette.muted,
      lineHeight: 22,
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
    inputIcon: {
      marginTop: 1,
    },
    inputField: {
      flex: 1,
      fontSize: 15,
      color: palette.text,
      paddingVertical: 12,
    },
    primaryButton: {
      marginTop: 12,
      backgroundColor: '#2563EB',
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    primaryButtonDisabled: {
      opacity: 0.75,
    },
    primaryButtonPressed: {
      opacity: 0.9,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 8,
    },
    secondaryButtonPressed: {
      opacity: 0.7,
    },
    secondaryButtonText: {
      color: palette.muted,
      fontSize: 15,
      fontWeight: '500',
    },
    backIcon: {
      marginTop: 1,
    },
  });
};
