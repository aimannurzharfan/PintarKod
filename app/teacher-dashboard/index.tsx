import { AIChatbot } from '@/components/ai-chatbot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

type DashboardCard = {
  id: string;
  title: string;
  description?: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
};

export default function TeacherDashboardScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);
  const [showChatbot, setShowChatbot] = useState(false);

  // Redirect if not a teacher
  useEffect(() => {
    if (user?.role !== 'Teacher') {
      router.replace('/mainpage');
    }
  }, [user, router]);

  const dashboardCards: DashboardCard[] = useMemo(
    () => [
      {
        id: 'register',
        title: t('teacher_ui.register_user'),
        icon: 'user-plus',
        onPress: () => router.push('/register' as any),
      },
      {
        id: 'remove',
        title: t('teacher_ui.remove_student'),
        icon: 'user-minus',
        onPress: () => {
          // Navigate to delete-account page with a query param to indicate it's for removing students
          router.push('/delete-account' as any);
        },
      },
    ],
    [t, router]
  );

  if (user?.role !== 'Teacher') {
    return null; // Will redirect via useEffect
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedText type="title" style={styles.title}>
          {t('teacher_ui.dashboard')}
        </ThemedText>

        <View style={styles.cardsGrid}>
          {dashboardCards.map((card) => (
            <Pressable
              key={card.id}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colorScheme === 'dark'
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'rgba(59, 130, 246, 0.05)',
                  borderColor: colorScheme === 'dark'
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(59, 130, 246, 0.2)',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={card.onPress}
            >
              <View
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor: colorScheme === 'dark'
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'rgba(59, 130, 246, 0.1)',
                  },
                ]}
              >
                <Feather
                  name={card.icon}
                  size={24}
                  color="#000000"
                />
              </View>
              <View style={styles.cardContent}>
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: colorScheme === 'dark' ? '#FFFFFF' : '#0F172A',
                    },
                  ]}
                >
                  {card.title}
                </Text>
                {card.description && (
                  <Text
                    style={[
                      styles.cardDescription,
                      {
                        color: colorScheme === 'dark' ? '#CBD5F5' : '#475569',
                      },
                    ]}
                  >
                    {card.description}
                  </Text>
                )}
              </View>
              <IconSymbol
                name="chevron.right"
                size={20}
                color={colorScheme === 'dark' ? '#93C5FD' : '#3B82F6'}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Floating Chat Bubble */}
      <Pressable
        style={styles.floatingChatButton}
        onPress={() => setShowChatbot(true)}
        accessibilityLabel={t('main.chat_accessibility')}
      >
        <IconSymbol name="message.fill" size={28} color="#FFFFFF" />
      </Pressable>

      {/* AI Chatbot Modal */}
      <AIChatbot visible={showChatbot} onClose={() => setShowChatbot(false)} />
    </ThemedView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 24,
      textAlign: 'center',
    },
    cardsGrid: {
      gap: 16,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderRadius: 18,
      borderWidth: 2,
      gap: 16,
    },
    iconWrapper: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
      gap: 6,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    cardDescription: {
      fontSize: 14,
      lineHeight: 20,
    },
    floatingChatButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#007AFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  });
};

