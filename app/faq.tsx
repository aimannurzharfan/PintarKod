import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FAQScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  // Fix: Explicitly cast or handle undefined for createStyles
  const styles = useMemo(() => createStyles(colorScheme ?? 'light'), [colorScheme]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqs = [
    { id: '1', question: t('faq.q1'), answer: t('faq.a1') },
    { id: '2', question: t('faq.q2'), answer: t('faq.a2') },
    { id: '3', question: t('faq.q3'), answer: t('faq.a3') },
    { id: '4', question: t('faq.q4'), answer: t('faq.a4') },
  ];

  const handleToggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: t('faq.title'),
          headerShown: true,
          // headerBackTitleVisible is iOS only and might error on some types if strict
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? '#020617' : '#EEF2FF',
          },
          headerTitleStyle: {
            color: colorScheme === 'dark' ? '#F8FAFC' : '#0F172A',
          },
          headerTintColor: colorScheme === 'dark' ? '#F8FAFC' : '#0F172A',
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {faqs.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <View key={item.id} style={styles.card}>
              <Pressable
                onPress={() => handleToggle(item.id)}
                style={styles.cardHeader}
              >
                <Text style={styles.question}>{item.question}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                />
              </Pressable>
              {isExpanded && (
                <View style={styles.answerContainer}>
                  <Text style={styles.answer}>{item.answer}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? '#020617' : '#EEF2FF',
    },
    content: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      gap: 16,
    },
    card: {
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0',
      shadowColor: '#0F172A',
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
    },
    question: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F8FAFC' : '#0F172A',
      lineHeight: 24,
    },
    answerContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(148, 163, 184, 0.1)' : '#F1F5F9',
    },
    answer: {
      marginTop: 12,
      fontSize: 15,
      lineHeight: 24,
      color: isDark ? '#CBD5E1' : '#475569',
    },
  });
};
