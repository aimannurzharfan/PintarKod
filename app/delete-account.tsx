import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { API_URL } from './config';

export default function DeleteAccountScreen() {
  const { username } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
  if (!username) { Alert.alert('Error', 'Missing username'); return; }
    Alert.alert('Confirm', 'Are you sure you want to delete this account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete }
    ]);
  }

  async function confirmDelete() {
    setLoading(true);
    try {
  const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(username as string)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to delete');
      } else {
        Alert.alert('Deleted', 'Account deleted');
        router.replace('/');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error');
    } finally { setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delete Account</Text>
      <Text style={styles.info}>Account username: {String(username)}</Text>
      <Button title={loading ? 'Deleting...' : 'Delete Account'} color="#b00" onPress={handleDelete} disabled={loading} />
    </View>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 20, textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' },
  info: { marginBottom: 12, color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
});
