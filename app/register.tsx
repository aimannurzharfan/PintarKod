import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { API_URL } from './config';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);

  async function handleRegister() {
    if (!username || !email || !password) {
      Alert.alert('Validation', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
  const res = await fetch(`${API_URL}/api/register`, {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Registration failed');
      } else {
        // On successful registration, navigate to login (now index)
        setUsername(''); setEmail(''); setPassword('');
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} />
      <Button title={loading ? 'Registering...' : 'Register'} onPress={handleRegister} disabled={loading} />
    </View>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
  input: { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', borderColor: colorScheme === 'dark' ? '#555' : '#CCC', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 20, textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
});
