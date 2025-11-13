import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { API_URL } from './config';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [role, setRole] = useState('Student');
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);
  const { t } = useTranslation();
  const isTeacher = user?.role === 'Teacher';
  const placeholderColor = colorScheme === 'dark' ? '#94A3B8' : '#64748B';

  useEffect(() => {
    if (isTeacher && role === 'Teacher') {
      setClassName(t('register.class_placeholder_teacher'));
    } else if (isTeacher && role === 'Student') {
      setClassName('');
    }
  }, [role, isTeacher, t]);

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('register.title'), t('register.validation'));
      return;
    }

    if (isTeacher) {
      if (!role || (role !== 'Student' && role !== 'Teacher')) {
        Alert.alert(t('register.title'), t('register.validation_role'));
        return;
      }
      if (!className.trim()) {
        Alert.alert(t('register.title'), t('register.validation_class'));
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {
        username: username.trim(),
        email: email.trim(),
        password,
      };

      if (isTeacher) {
        payload.role = role;
        if (className.trim()) {
          payload.className = className.trim();
        }
      }

      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert(t('register.title'), data.error || t('register.error'));
      } else {
        Alert.alert(t('register.success_title'), t('register.success'), [
          {
            text: t('common.ok'),
            onPress: () => {
              setUsername('');
              setEmail('');
              setPassword('');
              setRole('Student');
              setClassName('');
              if (isTeacher) {
                router.back();
              } else {
                router.push('/');
              }
            },
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t('register.title'), t('register.network'));
    } finally {
      setLoading(false);
    }
  }

  const roleLabel = role === 'Teacher' ? t('register.role_teacher') : t('register.role_student');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isTeacher ? t('register.title') : t('tabs.register')}
            </Text>
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('register.username')}</Text>
                <View style={styles.inputWrapper}>
                  <Feather
                    name="user"
                    size={18}
                    color={placeholderColor}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder={t('register.username')}
                    placeholderTextColor={placeholderColor}
                    value={username}
                    onChangeText={setUsername}
                    style={styles.inputField}
                    autoCapitalize="words"
                    textContentType="name"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t('register.email')}</Text>
                <View style={styles.inputWrapper}>
                  <Feather
                    name="mail"
                    size={18}
                    color={placeholderColor}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder={t('register.email')}
                    placeholderTextColor={placeholderColor}
                    value={email}
                    onChangeText={setEmail}
                    style={styles.inputField}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t('register.password')}</Text>
                <View style={styles.inputWrapper}>
                  <Feather
                    name="lock"
                    size={18}
                    color={placeholderColor}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder={t('register.password')}
                    placeholderTextColor={placeholderColor}
                    value={password}
                    onChangeText={setPassword}
                    style={styles.inputField}
                    secureTextEntry={!passwordVisible}
                    textContentType="password"
                  />
                  <Pressable
                    onPress={() => setPasswordVisible((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.passwordToggle,
                      pressed && styles.passwordTogglePressed,
                    ]}
                    hitSlop={8}
                  >
                    <Feather
                      name={passwordVisible ? 'eye-off' : 'eye'}
                      size={18}
                      color={placeholderColor}
                    />
                  </Pressable>
                </View>
              </View>

              {isTeacher && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>{t('register.role')}</Text>
                    <Pressable
                      onPress={() => setShowRoleModal(true)}
                      style={({ pressed }) => [
                        styles.selectControl,
                        pressed && styles.selectControlPressed,
                      ]}
                    >
                      <Text style={styles.selectText}>{roleLabel}</Text>
                      <Text style={styles.selectIcon}>⌄</Text>
                    </Pressable>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>{t('register.class_label')}</Text>
                    <TextInput
                      placeholder={
                        role === 'Teacher'
                          ? t('register.class_placeholder_teacher')
                          : t('register.class_placeholder_student')
                      }
                      placeholderTextColor={placeholderColor}
                      value={className}
                      onChangeText={setClassName}
                      style={styles.inputStandalone}
                      editable={role !== 'Teacher'}
                    />
                    {role === 'Teacher' && (
                      <Text style={styles.hintText}>{t('register.class_hint')}</Text>
                    )}
                  </View>
                </>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  loading && styles.primaryButtonDisabled,
                  pressed && !loading && styles.primaryButtonPressed,
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t('register.button_loading')}</Text>
                  </>
                ) : (
                  <Text style={styles.primaryButtonText}>{t('register.button')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRoleModal(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('register.modal_title')}</Text>
            <View style={styles.modalOptions}>
              <Pressable
                style={[
                  styles.modalOption,
                  role === 'Student' && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setRole('Student');
                  setShowRoleModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{t('register.role_student')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalOption,
                  role === 'Teacher' && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setRole('Teacher');
                  setShowRoleModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{t('register.role_teacher')}</Text>
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={styles.modalSecondaryText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colorScheme: any) => {
  const palette =
    colorScheme === 'dark'
      ? {
          background: '#020617',
          card: 'rgba(15, 23, 42, 0.88)',
          border: 'rgba(148, 163, 184, 0.35)',
          input: 'rgba(15, 23, 42, 0.92)',
          text: '#E2E8F0',
          muted: '#94A3B8',
          shadowOpacity: 0.25,
          accent: '#93C5FD',
        }
      : {
          background: '#F0F4FF',
          card: '#FFFFFF',
          border: '#E2E8F0',
          input: '#F8FAFC',
          text: '#0F172A',
          muted: '#64748B',
          shadowOpacity: 0.12,
          accent: '#2563EB',
        };

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    flex: {
      flex: 1,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingVertical: 32,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: 28,
      padding: 28,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: '#0F172A',
      shadowOpacity: palette.shadowOpacity,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      gap: 24,
    },
    cardTitle: {
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      color: palette.text,
    },
    form: {
      gap: 20,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: palette.input,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 14,
    },
    inputIcon: {
      marginTop: 1,
    },
    inputField: {
      flex: 1,
      fontSize: 15,
      color: palette.text,
      paddingVertical: 12,
    },
    inputStandalone: {
      backgroundColor: palette.input,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: palette.text,
    },
    passwordToggle: {
      padding: 4,
    },
    passwordTogglePressed: {
      opacity: 0.75,
    },
    hintText: {
      fontSize: 12,
      color: palette.muted,
    },
    selectControl: {
      backgroundColor: palette.input,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectControlPressed: {
      opacity: 0.85,
    },
    selectText: {
      fontSize: 15,
      color: palette.text,
      fontWeight: '600',
    },
    selectIcon: {
      fontSize: 18,
      color: palette.muted,
      marginLeft: 12,
    },
    primaryButton: {
      marginTop: 12,
      backgroundColor: '#2563EB',
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    primaryButtonDisabled: {
      opacity: 0.75,
    },
    primaryButtonPressed: {
      opacity: 0.9,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: palette.card,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: '#0F172A',
      shadowOpacity: palette.shadowOpacity,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
      gap: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.text,
      textAlign: 'center',
    },
    modalOptions: {
      gap: 12,
    },
    modalOption: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: palette.input,
    },
    modalOptionSelected: {
      borderColor: '#2563EB',
      backgroundColor: colorScheme === 'dark' ? 'rgba(37, 99, 235, 0.18)' : 'rgba(37, 99, 235, 0.12)',
    },
    modalOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.text,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    modalSecondaryButton: {
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 18,
      backgroundColor: palette.input,
      borderWidth: 1,
      borderColor: palette.border,
    },
    modalSecondaryText: {
      color: palette.text,
      fontWeight: '600',
      fontSize: 14,
    },
    modalButtonPressed: {
      opacity: 0.85,
    },
  });
};
