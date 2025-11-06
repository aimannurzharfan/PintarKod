import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Image, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { API_URL } from './config';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function DeleteAccountScreen() {
  const { username } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const [loading, setLoading] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(username as string)}`);
        const data = await res.json();
        if (res.ok) {
          setUser(data);
        } else {
          Alert.alert('Error', data.error || 'Failed to load user');
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Network error');
      }
    })();
  }, [username]);

  async function handleDelete() {
    if (!username) {
      Alert.alert('Error', 'Missing username');
      return;
    }

    if (confirmUsername !== username) {
      Alert.alert('Error', 'Username does not match. Please retype your username correctly.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]
    );
  }

  async function confirmDelete() {
    if (!username) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(username as string)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to delete');
      } else {
        Alert.alert('Deleted', 'Account deleted successfully');
        router.replace('/');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Delete Account</Text>

      {/* Profile Picture and Username Section */}
      <View style={styles.userSection}>
        {user?.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}` }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <IconSymbol size={60} name="person.fill" color="#fff" />
          </View>
        )}
        <Text style={styles.usernameText}>@{String(username)}</Text>
      </View>

      {/* Confirmation Section */}
      <View style={styles.confirmationSection}>
        <Text style={styles.warningText}>
          This action cannot be undone. To confirm deletion, please retype your username:
        </Text>
        <TextInput
          placeholder="Retype your username"
          value={confirmUsername}
          onChangeText={setConfirmUsername}
          style={styles.input}
          autoCapitalize="none"
          placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
        />
      </View>

      <Button
        title={loading ? 'Deleting...' : 'Delete Account'}
        color="#b00"
        onPress={handleDelete}
        disabled={loading || confirmUsername !== username}
      />
    </ScrollView>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7'
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 30,
    textAlign: 'center',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
  },
  userSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DDD',
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  usernameText: {
    fontSize: 20,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  },
  confirmationSection: {
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#FF6B6B' : '#b00',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
});
