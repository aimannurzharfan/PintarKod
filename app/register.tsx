import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { API_URL } from './config';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [className, setClassName] = useState(''); // Text input for class name
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const isTeacher = user?.role === 'Teacher';

  // When role changes to Teacher, automatically set className to "Educator"
  useEffect(() => {
    if (isTeacher && role === 'Teacher') {
      setClassName('Educator');
    } else if (isTeacher && role === 'Student') {
      setClassName(''); // Clear className when switching to Student
    }
  }, [role, isTeacher]);

  async function handleRegister() {
    if (!username || !email || !password) {
      Alert.alert('Validation', 'Please fill all fields');
      return;
    }

    // If teacher is registering, role and className are required
    if (isTeacher) {
      if (!role || (role !== 'Student' && role !== 'Teacher')) {
        Alert.alert('Validation', 'Please select a valid role for the user');
        return;
      }
      if (!className || className.trim() === '') {
        Alert.alert('Validation', 'Please enter a class name');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = { username, email, password };
      
      // Only include role and className if user is a teacher
      if (isTeacher) {
        // Always include role when teacher is registering
        payload.role = role;
        // Include className (text field)
        if (className && className.trim() !== '') {
          payload.className = className.trim();
        }
      }

      // Debug logging
      console.log('=== REGISTRATION DEBUG ===');
      console.log('isTeacher:', isTeacher);
      console.log('user object:', JSON.stringify(user, null, 2));
      console.log('role state:', role);
      console.log('className:', className);
      console.log('Registration payload:', JSON.stringify(payload, null, 2));
      console.log('========================');

      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Registration failed');
      } else {
        // On successful registration
        Alert.alert('Success', 'User registered successfully', [
          {
            text: 'OK',
            onPress: () => {
              setUsername('');
              setEmail('');
              setPassword('');
              setRole('Student');
              setClassName('');
              if (isTeacher) {
                router.back(); // Go back to previous screen for teachers
              } else {
                router.push('/'); // Go to login for regular users
              }
            }
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  }

  // Debug: Log current state
  React.useEffect(() => {
    console.log('Register screen - isTeacher:', isTeacher);
    console.log('Register screen - user:', user);
    console.log('Register screen - current role state:', role);
    console.log('Register screen - className:', className);
  }, [isTeacher, user, role, className]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{isTeacher ? 'Register New User' : 'Register'}</Text>
      {isTeacher && (
        <Text style={[styles.debugText, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
          Current role selection: {role}
        </Text>
      )}
      
      <TextInput 
        placeholder="Username" 
        value={username} 
        onChangeText={setUsername} 
        style={styles.input} 
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} 
      />
      
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

      {/* Role selector - only for teachers */}
      {isTeacher && (
        <>
          <Text style={styles.label}>Role</Text>
          <Pressable
            style={styles.selectButton}
            onPress={() => setShowRoleModal(true)}
          >
            <Text style={[styles.selectButtonText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
              {role}
            </Text>
            <Text style={[styles.selectButtonArrow, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>▼</Text>
          </Pressable>

          {/* Class text input - for both Students and Teachers */}
          <Text style={styles.label}>Class *</Text>
          <TextInput
            placeholder={role === 'Teacher' ? 'Educator' : 'Enter class name'}
            value={className}
            onChangeText={setClassName}
            style={styles.input}
            placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'}
            editable={role === 'Student'} // Only editable for Students, auto-filled for Teachers
          />
          {role === 'Teacher' && (
            <Text style={[styles.hintText, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
              Class is automatically set to "Educator" for Teachers
            </Text>
          )}
        </>
      )}

      <Button title={loading ? 'Registering...' : 'Register'} onPress={handleRegister} disabled={loading} />

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRoleModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF' }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>Select Role</Text>
            <Pressable
              style={[styles.modalOption, role === 'Student' && styles.modalOptionSelected]}
              onPress={() => {
                setRole('Student');
                setShowRoleModal(false);
              }}
            >
              <Text style={[styles.modalOptionText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>Student</Text>
            </Pressable>
            <Pressable
              style={[styles.modalOption, role === 'Teacher' && styles.modalOptionSelected]}
              onPress={() => {
                setRole('Teacher');
                setShowRoleModal(false);
              }}
            >
              <Text style={[styles.modalOptionText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>Teacher</Text>
            </Pressable>
            <Button title="Cancel" onPress={() => setShowRoleModal(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (colorScheme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
  contentContainer: { padding: 20, paddingTop: 40 },
  input: { 
    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF', 
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', 
    borderColor: colorScheme === 'dark' ? '#555' : '#CCC', 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 10, 
    marginBottom: 12 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '600', 
    marginBottom: 20, 
    textAlign: 'center', 
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' 
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
  },
  selectButton: {
    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selectButtonText: {
    fontSize: 16,
    flex: 1
  },
  selectButtonArrow: {
    fontSize: 12,
    marginLeft: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center'
  },
  modalScrollView: {
    maxHeight: 300,
    marginBottom: 16
  },
  modalOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'transparent'
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)'
  },
  modalOptionText: {
    fontSize: 16
  },
  modalOptionDescription: {
    fontSize: 12,
    marginTop: 4
  },
  debugText: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  hintText: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    fontStyle: 'italic'
  }
});
