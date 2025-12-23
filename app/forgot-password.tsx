// Forgot Password Screen
// This screen allows users to request a password reset by submitting their email address.
// It handles user input validation, API communication, loading states, and feedback alerts.
// The UI adapts to light and dark themes and supports internationalization (i18n).

import { API_URL } from '@/config';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
  const placeholderColor = colorScheme === 'dark' ? '#94A3B8' : '#64748B';

  // Handles forgot password form submission
  // 1. Validates email input
  // 2. Sends request to backend API
  // 3. Displays success or error feedback
  async function handleSubmit() {
    // Prevent submission if email field is empty
    if (!email.trim()) {
      Alert.alert(t('forgot_password.title'), t('forgot_password.validation_email'));
      return;
    }
    // Enable loading state while processing request
    setLoading(true);
    try {
      // Send forgot password request to backend
      // Email is trimmed and converted to lowercase for consistency
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      // Handle API error response
      if (!response.ok || data.success === false) {
        // Show success message and navigate back to login screen
        Alert.alert(t('forgot_password.error'), data.error || t('forgot_password.error_message'));
        return;
      }
      Alert.alert(t('forgot_password.success_title'), t('forgot_password.success_message'), [
        {
          text: t('common.ok'),
          onPress: () => router.back(),
        },
      ]);
      // Handle network or unexpected errors
    } catch (err) {
      console.error(err);
      Alert.alert(t('forgot_password.error'), t('forgot_password.network_error'));
      // Reset loading state regardless of outcome
    } finally {
      setLoading(false);
    }
  }

  return (
    // SafeAreaView ensures content is displayed correctly on devices with notches
    <SafeAreaView style={styles.safeArea}>
      // KeyboardAvoidingView prevents keyboard from overlapping input fields
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        // ScrollView allows screen to remain usable on smaller devices
        <ScrollView
          contentContainerStyle={styles.container}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('forgot_password.title')}</Text>
            <Text style={styles.subtitle}>{t('forgot_password.subtitle')}</Text>
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('forgot_password.email')}</Text>
                <View style={styles.inputWrapper}>
                  // Feather icon used to visually indicate email input
                  <Feather
                    name="mail"
                    size={18}
                    color={placeholderColor}
                    style={styles.inputIcon}
                  />
                  // Email input field with icon and accessibility-friendly keyboard
                  <TextInput
                    placeholder={t('forgot_password.email_placeholder')}
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
              
              // Primary submit button
              // Shows loading indicator when request is in progress
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  loading && styles.primaryButtonDisabled,
                  pressed && !loading && styles.primaryButtonPressed,
                ]}
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

              // Secondary button to navigate back to login screen
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
