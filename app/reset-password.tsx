import { API_URL } from '@/config';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import PasswordStrength, { passwordScore } from '@/components/PasswordStrength';
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const pwScore = useMemo(() => passwordScore(newPassword), [newPassword]);
  const isPasswordValid = pwScore >= 3;

  // -------------------- Theme & Styles --------------------
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);

  // -------------------- Handlers --------------------
  async function handleSubmit() {
    // Validation checks
    if (!resetToken) {
      Alert.alert('Invalid Link', 'Reset token missing. Please request a new link.');
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
      Alert.alert('Validation', 'Password is too weak. Please choose at least 8 chars with letters and numbers/symbols.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'Unable to reset password.');
        return;
      }

      Alert.alert('Success', 'Password updated successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Unable to reset password.');
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
  });
