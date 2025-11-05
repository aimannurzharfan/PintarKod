import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { API_URL } from './config';

export default function Index() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Validation', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Invalid email or password');
      } else {
        const username = data.user && data.user.username;
        if (username) {
          router.push(`/profile?username=${encodeURIComponent(username)}`);
        } else {
          Alert.alert('Error', 'Missing user data');
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error');
    } finally { setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
      />
      <Button title={loading ? 'Logging in...' : 'Login'} onPress={handleLogin} disabled={loading} />
      <View style={{ height: 12 }} />
      <Link href="/register" style={styles.link}>Register Account</Link>
    </View>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
  input: { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', borderColor: colorScheme === 'dark' ? '#555' : '#CCC', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 20, textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' },
  link: { color: colorScheme === 'dark' ? '#4EA1FF' : '#0066cc', marginTop: 8, textAlign: 'center' }
});
