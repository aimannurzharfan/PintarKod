import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Image, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { API_URL } from './config';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ProfileScreen() {
  const [searchId, setSearchId] = useState('');
  const [searchedUser, setSearchedUser] = useState(null as any);
  const [currentUser, setCurrentUser] = useState(null as any);
  const [loading, setLoading] = useState(false);
  const [loadingCurrentUser, setLoadingCurrentUser] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const { user: authUser } = useAuth();

  useEffect(() => {
    // Load current user's profile
    if (authUser?.username) {
      loadCurrentUser();
    }
  }, [authUser?.username]);

  async function loadCurrentUser() {
    if (!authUser?.username) return;
    setLoadingCurrentUser(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(authUser.username)}`);
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data);
      } else {
        console.error('Failed to load current user:', data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCurrentUser(false);
    }
  }

  async function fetchUser() {
    if (!searchId) { Alert.alert('Validation', 'Please enter a username'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(searchId)}`);
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to fetch user');
        setSearchedUser(null);
      } else {
        setSearchedUser(data);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error');
    } finally { setLoading(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Current User Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Profile</Text>
        {loadingCurrentUser ? (
          <Text style={[styles.loadingText, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
            Loading...
          </Text>
        ) : currentUser ? (
          <View style={styles.card}>
            {currentUser.avatarUrl ? (
              <Image
                source={{ uri: currentUser.avatarUrl.startsWith('http') ? currentUser.avatarUrl : `${API_URL}${currentUser.avatarUrl}` }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <IconSymbol size={50} name="person.fill" color="#fff" />
              </View>
            )}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>ID:</Text>
              <Text style={styles.fieldValue}>{currentUser.id}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Username:</Text>
              <Text style={styles.fieldValue}>{currentUser.username}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email:</Text>
              <Text style={styles.fieldValue}>{currentUser.email || 'N/A'}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Role:</Text>
              <Text style={styles.fieldValue}>{currentUser.role || 'N/A'}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Created:</Text>
              <Text style={styles.fieldValue}>{new Date(currentUser.createdAt).toLocaleString()}</Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <Button title="Edit Profile" onPress={() => router.push(`/edit-profile?username=${encodeURIComponent(currentUser.username)}`)} />
            </View>
          </View>
        ) : (
          <Text style={[styles.loadingText, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
            No profile data available
          </Text>
        )}
      </View>

      {/* Search Other Users Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search Other Users</Text>
        <TextInput
          placeholder="Enter username"
          value={searchId}
          onChangeText={setSearchId}
          style={styles.input}
          autoCapitalize="none"
          placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
        />
        <Button title={loading ? 'Loading...' : 'Search'} onPress={fetchUser} disabled={loading} />

        {searchedUser && (
          <View style={styles.card}>
            {searchedUser.avatarUrl ? (
              <Image
                source={{ uri: searchedUser.avatarUrl.startsWith('http') ? searchedUser.avatarUrl : `${API_URL}${searchedUser.avatarUrl}` }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <IconSymbol size={50} name="person.fill" color="#fff" />
              </View>
            )}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>ID:</Text>
              <Text style={styles.fieldValue}>{searchedUser.id}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Username:</Text>
              <Text style={styles.fieldValue}>{searchedUser.username}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email:</Text>
              <Text style={styles.fieldValue}>{searchedUser.email || 'N/A'}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Role:</Text>
              <Text style={styles.fieldValue}>{searchedUser.role || 'N/A'}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Created:</Text>
              <Text style={styles.fieldValue}>{new Date(searchedUser.createdAt).toLocaleString()}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7'
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#eee',
    borderRadius: 12,
    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 16,
    backgroundColor: '#DDD',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#888',
    alignSelf: 'center',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  fieldLabel: {
    fontWeight: '600',
    marginRight: 8,
    minWidth: 80,
    color: colorScheme === 'dark' ? '#999' : '#666',
  },
  fieldValue: {
    flex: 1,
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  },
  input: {
    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
  loadingText: {
    textAlign: 'center',
    padding: 16,
  },
});
