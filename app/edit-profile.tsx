import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { API_URL } from './config';

export default function EditProfileScreen() {
  const { username: usernameParam } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const [formUsername, setFormUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!usernameParam) return;
    (async () => {
    try {
  const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(usernameParam as string)}`);
        const data = await res.json();
        if (res.ok) {
          setFormUsername(data.username);
          setEmail(data.email);
          setRole(data.role);
        } else {
          Alert.alert('Error', data.error || 'Failed to load user');
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Network error');
      }
    })();
  }, [usernameParam]);

  async function handleSave() {
    if (!usernameParam) { Alert.alert('Error', 'Missing username'); return; }
    setLoading(true);
    try {
  const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(usernameParam as string)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formUsername, email, role })
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to update');
      } else {
        Alert.alert('Saved', 'Profile updated');
        router.replace(`/profile?username=${encodeURIComponent(formUsername)}`);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error');
    } finally { setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      <TextInput placeholder="Username" value={formUsername} onChangeText={setFormUsername} style={styles.input} placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} />
      <TextInput placeholder="Role" value={role} onChangeText={setRole} style={styles.input} placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} />
      <Button title={loading ? 'Saving...' : 'Save'} onPress={handleSave} disabled={loading} />
    </View>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
  input: { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', borderColor: colorScheme === 'dark' ? '#555' : '#CCC', borderWidth: 1, padding: 10, marginBottom: 12, borderRadius: 8 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 20, textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
});
