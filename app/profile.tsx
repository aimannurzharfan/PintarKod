import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Image, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { API_URL } from './config';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const [id, setId] = useState('');
  const [user, setUser] = useState(null as any);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const { user: authUser } = useAuth();

  async function fetchUser() {
    if (!id) { Alert.alert('Validation', 'Please enter a username'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to fetch user');
      } else {
        setUser(data);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (authUser?.username) {
      setId(authUser.username);
    }
  }, [authUser?.username]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>View Account</Text>
      <TextInput placeholder="Username" value={id} onChangeText={setId} style={styles.input} autoCapitalize="none" placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} />
      <Button title={loading ? 'Loading...' : 'Load Account'} onPress={fetchUser} disabled={loading} />

      {user && (
        <View style={styles.card}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}` }} style={{ width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 12 }} />
          ) : null}
          <Text style={styles.field}>ID: {user.id}</Text>
          <Text style={styles.field}>Username: {user.username}</Text>
          <Text style={styles.field}>Email: {user.email}</Text>
          <Text style={styles.field}>Role: {user.role}</Text>
          <Text style={styles.field}>Created: {new Date(user.createdAt).toLocaleString()}</Text>
          <View style={{ marginTop: 12 }}>
            <Button title="Edit" onPress={() => router.push(`/edit-profile?username=${encodeURIComponent(user.username)}`)} />
            <View style={{ height: 8 }} />
            <Button title="Delete" color="#b00" onPress={() => router.push(`/delete-account?username=${encodeURIComponent(user.username)}`)} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: { padding: 20, flexGrow: 1, backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 16, textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' },
  input: { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', borderColor: colorScheme === 'dark' ? '#555' : '#CCC', borderWidth: 1, padding: 10, marginBottom: 12, borderRadius: 8 },
  card: { marginTop: 20, padding: 12, borderWidth: 1, borderColor: colorScheme === 'dark' ? '#333' : '#eee', borderRadius: 8, backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF' },
  field: { marginBottom: 6, color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
});
