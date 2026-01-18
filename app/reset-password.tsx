import PasswordStrength, { passwordCompliant } from '@/components/PasswordStrength';
import { API_URL } from '@/config';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme
} from 'react-native';

export default function ResetPassword() {
  // -------------------- Router & Params --------------------
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const { t } = useTranslation();

  // Extract token from URL parameters
  const resetToken = React.useMemo(() => {
    const token = params.token;
    if (Array.isArray(token)) {
      return token[0] || '';
    }
    return token || '';
  }, [params.token]);

  // -------------------- State --------------------
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const isPasswordValid = useMemo(() => passwordCompliant(newPassword), [newPassword]);

  // -------------------- Debug: Log token on mount --------------------
  React.useEffect(() => {
    console.log('Reset password page loaded. Token:', resetToken ? `${resetToken.substring(0, 10)}...` : 'MISSING');
    console.log('Full params:', params);
  }, [resetToken, params]);

  // -------------------- Theme & Styles --------------------
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);

  // -------------------- Handlers --------------------
  async function handleSubmit() {
    // Validation checks
    if (!resetToken) {
      Alert.alert('Invalid Link', 'Reset token missing. Please request a new link.');
      console.log('Reset token missing. Params:', params);
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Validation', 'Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }

    if (!isPasswordValid) {
      Alert.alert('Validation', t('common.password_requirements'));
      return;
    }

    setLoading(true);

    try {
      console.log('Sending reset password request with token:', resetToken.substring(0, 10) + '...');
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        console.error('Failed to parse response:', text);
        Alert.alert('Error', 'Invalid response from server. Please try again.');
        return;
      }

      console.log('Reset password response:', { status: response.status, data });

      if (!response.ok) {
        const errorMessage = data?.error || `Server error: ${response.status}`;
        console.error('Reset password failed:', errorMessage);
        Alert.alert('Error', errorMessage);
        return;
      }

      // Success - clear form and redirect immediately
      console.log('Password reset successful, redirecting...');
      setNewPassword('');
      setConfirmPassword('');

      // Show success message and redirect
      Alert.alert(
        'Success',
        'Password updated successfully. You will be redirected to login.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to login page
              try {
                router.replace('/');
              } catch (navError) {
                console.error('Navigation error:', navError);
                // Fallback: try push instead of replace
                router.push('/');
              }
            },
          },
        ],
        { cancelable: false }
      );

      // Also set a timeout to redirect even if user doesn't click OK
      setTimeout(() => {
        try {
          router.replace('/');
        } catch (navError) {
          console.error('Auto-redirect error:', navError);
        }
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', `Unable to reset password: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  // -------------------- UI --------------------
  const placeholderColor = colorScheme === 'dark' ? '#888' : '#666';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="New Password"
          placeholderTextColor={placeholderColor}
          secureTextEntry={!newPasswordVisible}
          value={newPassword}
          onChangeText={setNewPassword}
          style={styles.input}
        />
        <Pressable
          onPress={() => setNewPasswordVisible(!newPasswordVisible)}
          style={styles.eyeButton}
        >
          <Feather
            name={newPasswordVisible ? 'eye-off' : 'eye'}
            size={20}
            color={placeholderColor}
          />
        </Pressable>
      </View>

      <PasswordStrength password={newPassword} />

      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor={placeholderColor}
          secureTextEntry={!confirmPasswordVisible}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
        />
        <Pressable
          onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
          style={styles.eyeButton}
        >
          <Feather
            name={confirmPasswordVisible ? 'eye-off' : 'eye'}
            size={20}
            color={placeholderColor}
          />
        </Pressable>
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={loading || !isPasswordValid || !resetToken}
        style={[
          styles.submitButton,
          (loading || !isPasswordValid || !resetToken) && styles.submitButtonDisabled,
        ]}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </Text>
      </Pressable>

      {!resetToken && (
        <Text style={[styles.errorText, { color: '#FF3B30' }]}>
          No reset token found in URL. Please use the link from your email.
        </Text>
      )}

      {resetToken && !isPasswordValid && newPassword.length > 0 && (
        <Text style={[styles.errorText, { color: '#FF3B30' }]}>
          Password must contain capital letter, lowercase letter, and number.
        </Text>
      )}
    </View>
  );
}

// -------------------- Styles --------------------
const getStyles = (colorScheme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
      gap: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 20,
      textAlign: 'center',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
      borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
    },
    input: {
      flex: 1,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      paddingVertical: 10,
      paddingRight: 10,
    },
    eyeButton: {
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    submitButton: {
      backgroundColor: '#2563EB',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    submitButtonDisabled: {
      backgroundColor: '#9CA3AF',
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    errorText: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
    },
    hintText: { fontSize: 12, color: colorScheme === 'dark' ? '#94A3B8' : '#64748B' }
  });
