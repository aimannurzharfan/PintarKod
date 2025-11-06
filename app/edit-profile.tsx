import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';

export default function EditProfileScreen() {
  const { username: usernameParam } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const [formUsername, setFormUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const { user, setUser } = useAuth();
  const [originalUsername, setOriginalUsername] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string; general?: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // If no username param provided, default to current authenticated user
    const target = (usernameParam as string) || user?.username;
    if (!target) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(target)}`);
        const data = await res.json();
        if (res.ok) {
          setFormUsername(data.username);
          setOriginalUsername(data.username);
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
  }, [usernameParam, user?.username]);

  async function handleSave() {
    const target = (usernameParam as string) || user?.username;
    if (!target) { Alert.alert('Error', 'Missing username'); return; }
    setLoading(true);
    setErrors({});
    setSuccessMessage(null);

    // Client-side validation
    const newErrors: typeof errors = {};
    if (!formUsername || formUsername.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(formUsername)) newErrors.username = 'Username may contain letters, numbers, - and _ only';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Enter a valid email';
    if (password && password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (Object.keys(newErrors).length) { setErrors(newErrors); setLoading(false); return; }

    // If username changed from original, confirm with the user
    if (originalUsername && formUsername !== originalUsername) {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert('Change username', 'Changing your username will update your profile URL. Continue?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Yes', onPress: () => resolve(true) },
        ]);
      });
      if (!ok) { setLoading(false); return; }
    }

    try {
      // Build payload, only include password if provided
      const payload: any = { username: formUsername, email, role };
      if (password) payload.password = password;

      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(target)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error || 'Failed to update' });
      } else {
        setSuccessMessage('Profile updated');
        // If current user updated self, sync auth context (except password)
        if (user && (user.username === target)) {
          setUser({ ...user, username: data.username, email: data.email, role: data.role, avatarUrl: data.avatarUrl });
        }
        // Update original username for further edits
        setOriginalUsername(data.username);
        // Navigate after short delay so user sees confirmation
        setTimeout(() => router.replace(`/profile?username=${encodeURIComponent(data.username)}`), 900);
      }
    } catch (err) {
      console.error(err);
      setErrors({ general: 'Network error' });
    } finally { setLoading(false); }
  }

  async function pickAndUploadAvatar() {
    if (!usernameParam) { Alert.alert('Error', 'Missing username'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('Permission required', 'Please allow photo library access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.9 
    });
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

      const target = (usernameParam as string) || user?.username;
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(target as string)}/avatar`, {
        method: 'PUT',
        body: form as any,
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error || 'Failed to upload avatar' });
      } else {
        setAvatarUrl(data.avatarUrl);
        if (user && (user.username === target)) {
          setUser({ ...user, avatarUrl: data.avatarUrl });
        }
        setSuccessMessage('Profile picture updated');
        setTimeout(() => setSuccessMessage(null), 1200);
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
    {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
    <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} />
    {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
    <TextInput placeholder="New password (leave blank to keep)" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} />
    {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
      <View style={styles.readOnlyField}>
        <Text style={[styles.fieldLabel, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>Role:</Text>
        <Text style={[styles.fieldValue, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>{role || 'N/A'}</Text>
      </View>
  {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}
  {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
  <View style={{ marginTop: 8 }}>{loading ? <ActivityIndicator /> : null}</View>
  <Button title={loading ? 'Saving...' : 'Save'} onPress={handleSave} disabled={loading} />
    </View>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
  input: { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', borderColor: colorScheme === 'dark' ? '#555' : '#CCC', borderWidth: 1, padding: 10, marginBottom: 12, borderRadius: 8 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 20, textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5',
    borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
  fieldLabel: {
    fontWeight: '600',
    marginRight: 8,
    fontSize: 16,
  },
  fieldValue: {
    fontSize: 16,
    flex: 1,
  },
  errorText: { color: '#ff4d4f', marginBottom: 8 },
  successText: { color: '#2f855a', marginBottom: 8 },
});
