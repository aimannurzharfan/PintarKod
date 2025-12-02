import { API_URL } from '@/config';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const resetToken = Array.isArray(token) ? token[0] : token ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);

  async function handleSubmit() {
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

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
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
      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
      />
      <Button title={loading ? 'Resetting...' : 'Reset Password'} onPress={handleSubmit} disabled={loading} />
    </View>
  );
}

const getStyles = (colorScheme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
      gap: 12,
    },
    input: {
      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 20,
      textAlign: 'center',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
  });

