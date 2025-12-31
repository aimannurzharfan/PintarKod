import { API_URL } from '@/config';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import PasswordStrength, { passwordCompliant } from '@/components/PasswordStrength';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

export default function ResetPassword() {
  // -------------------- Router & Params --------------------
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();

  const resetToken = Array.isArray(token) ? token[0] : token ?? '';

  // -------------------- State --------------------
  const [tokenInput, setTokenInput] = useState(resetToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugResponse, setDebugResponse] = useState<string | null>(null);

  const isPasswordValid = useMemo(() => passwordCompliant(newPassword), [newPassword]);
  const tokenToUse = tokenInput || resetToken;

  // -------------------- Theme & Styles --------------------
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);

  // -------------------- Handlers --------------------
  const { t } = useTranslation();

  async function handleSubmit() {
    // Validation checks
    if (!tokenToUse) {
      Alert.alert(t('forgot_password.title'), t('forgot_password.validation_email'));
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t('forgot_password.title'), t('forgot_password.validation_password'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('forgot_password.title'), t('edit_profile.password_mismatch'));
      return;
    }

    if (!isPasswordValid) {
      Alert.alert(t('forgot_password.title'), t('common.password_requirements'));
      return;
    }

    setLoading(true);

    try {
      console.debug('Reset request', { apiUrl: API_URL, token: tokenToUse, newPassword });

      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenToUse,
          newPassword,
        }),
      });

      const data = await response.json();

      console.debug('Reset response', { status: response.status, data });
      setDebugResponse(JSON.stringify({ status: response.status, data }, null, 2));

      if (!response.ok) {
        Alert.alert(t('forgot_password.error'), data.error || t('forgot_password.error_message'));
        return;
      }

      Alert.alert(t('forgot_password.success_title'), t('forgot_password.success_message'), [
        {
          text: t('common.ok'),
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (err) {
      console.error('Reset submit error', err);
      Alert.alert(t('forgot_password.error'), t('forgot_password.network_error'));
    } finally {
      setLoading(false);
    }
  }

  // -------------------- UI --------------------
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>

      <TextInput
        placeholder="New Password"
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={styles.input}
      />

      <PasswordStrength password={newPassword} />

      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
      />

      {/* Dev helper: paste token if URL token not present */}
      {__DEV__ && (
        <View>
          <Text style={styles.subtitle}>Dev token (paste here to test):</Text>
          <TextInput
            placeholder="paste reset token"
            placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
            value={tokenInput}
            onChangeText={setTokenInput}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <Text style={styles.subtitle}>API: {API_URL}</Text>
          {debugResponse && (
            <Text style={[styles.subtitle, { fontFamily: 'monospace' }]}>{debugResponse}</Text>
          )}
        </View>
      )}

      <Button
        title={loading ? 'Resetting...' : 'Reset Password'}
        onPress={handleSubmit}
        disabled={loading || !isPasswordValid}
      />
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
    input: {
      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
    },
    hintText: { fontSize: 12, color: colorScheme === 'dark' ? '#94A3B8' : '#64748B' }
  });
