import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { API_URL } from './config';

export default function Index() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);
  const { t } = useTranslation();
  const placeholderColor = colorScheme === 'dark' ? '#94A3B8' : '#64748B';

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('login.title'), t('login.validation'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert(t('login.title'), data.error || t('login.error'));
      } else if (data.user) {
        setUser(data.user);
        router.replace('/mainpage');
      } else {
        Alert.alert(t('login.title'), t('login.missing_user'));
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t('login.title'), t('login.network'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.brand}>PintarKod</Text>
            <Text style={styles.cardTitle}>{t('login.title')}</Text>
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('login.email')}</Text>
                <TextInput
                  placeholder={t('login.email')}
                  placeholderTextColor={placeholderColor}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  textContentType="username"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t('login.password')}</Text>
                <TextInput
                  placeholder={t('login.password')}
                  placeholderTextColor={placeholderColor}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  textContentType="password"
                />
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  loading && styles.primaryButtonDisabled,
                  pressed && !loading && styles.primaryButtonPressed,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t('login.button_loading')}</Text>
                  </>
                ) : (
                  <Text style={styles.primaryButtonText}>{t('login.button')}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => router.push('/forgot-password' as any)}
                style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
              >
                <Text style={styles.linkText}>{t('login.forgot')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
          shadow: 0,
          link: '#93C5FD',
        }
      : {
          background: '#EEF2FF',
          card: '#FFFFFF',
          border: '#E2E8F0',
          input: '#F8FAFC',
          text: '#0F172A',
          muted: '#64748B',
          shadow: 12,
          link: '#2563EB',
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
      flex: 1,
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
      shadowOpacity: colorScheme === 'dark' ? 0.25 : 0.12,
      shadowRadius: palette.shadow,
      shadowOffset: { width: 0, height: palette.shadow ? 12 : 6 },
      elevation: 6,
      maxWidth: 420,
      width: '100%',
      alignSelf: 'center',
      gap: 24,
    },
    brand: {
      fontSize: 32,
      fontWeight: '800',
      textAlign: 'center',
      color: '#2563EB',
      letterSpacing: 0.5,
    },
    cardTitle: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      color: palette.text,
    },
    form: {
      gap: 18,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
    },
    input: {
      backgroundColor: palette.input,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: palette.text,
      fontSize: 15,
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
    link: {
      marginTop: 12,
      alignSelf: 'center',
    },
    linkPressed: {
      opacity: 0.75,
    },
    linkText: {
      color: palette.link,
      fontWeight: '600',
      fontSize: 14,
    },
  });
};
