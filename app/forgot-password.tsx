import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);

  async function handleSubmit() {
    if (!email) {
      Alert.alert('Validation', 'Please enter your registered email');
      return;
    }
    setLoading(true);
    try {
      // Configuration / API integration will be implemented later.
      // For now, show a confirmation message.
      Alert.alert('If that email is registered', 'We will send password reset instructions to the provided email.');
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Unable to process request');
    } finally { setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <TextInput
        placeholder="Registered email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
      />
      <Button title={loading ? 'Sending...' : 'Send reset link'} onPress={handleSubmit} disabled={loading} />
    </View>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
  input: { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', borderColor: colorScheme === 'dark' ? '#555' : '#CCC', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 20, textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' },
});
