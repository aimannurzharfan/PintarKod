import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Image, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { API_URL } from './config';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';

export default function EditProfileScreen() {
  const { username: usernameParam } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const [formUsername, setFormUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const { user, setUser } = useAuth();

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
        setAvatarUrl(data.avatarUrl);
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
        // If current user updated self, sync auth context (except password)
        if (user && (user.username === usernameParam)) {
          setUser({ ...user, username: data.username, email: data.email, role: data.role, avatarUrl: data.avatarUrl });
        }
        router.replace(`/profile?username=${encodeURIComponent(formUsername)}`);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error');
    } finally { setLoading(false); }
  }

  async function pickAndUploadAvatar() {
    if (!usernameParam) { Alert.alert('Error', 'Missing username'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('Permission required', 'Please allow photo library access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.9 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;

    try {
      setLoading(true);
      const form = new FormData();
      const uri = asset.uri;
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const file: any = { uri, name: filename, type: 'image/jpeg' };
      form.append('avatar', file);

      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(usernameParam as string)}/avatar`, {
        method: 'PUT',
        body: form as any,
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to upload avatar');
      } else {
        setAvatarUrl(data.avatarUrl);
        if (user && (user.username === usernameParam)) {
          setUser({ ...user, avatarUrl: data.avatarUrl });
        }
        Alert.alert('Updated', 'Profile picture updated');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}` }} style={{ width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 16 }} />
      ) : null}
      <Button title="Change Profile Picture" onPress={pickAndUploadAvatar} disabled={loading} />
      <View style={{ height: 12 }} />
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
