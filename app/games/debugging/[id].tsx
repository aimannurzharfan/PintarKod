import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { Audio } from 'expo-av';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  BounceIn,
} from 'react-native-reanimated';
import { API_URL } from '../../config';

type DebuggingChallenge = {
  id: string;
  title_en: string;
  title_ms: string;
  description_en: string;
  description_ms: string;
  codeBlock: string;
  buggyLineIndex: number;
  explanation_en: string;
  explanation_ms: string;
  basePoints: number;
};

type ResultData = {
  isCorrect: boolean;
  score?: number;
  explanation: string;
};

export default function DebuggingChallengeScreen() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme), [colorScheme]);

  const [challenge, setChallenge] = useState<DebuggingChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [correctSound, setCorrectSound] = useState<Audio.Sound | null>(null);
  const [wrongSound, setWrongSound] = useState<Audio.Sound | null>(null);

  const currentLang = i18n.language?.split('-')[0] || 'en';
  const codeLines = challenge?.codeBlock.split('\n') || [];

  // Load sounds - optional, continue if they don't exist
  useEffect(() => {
    let correct: Audio.Sound | null = null;
    let wrong: Audio.Sound | null = null;

    const loadSounds = async () => {
      try {
        // Try to load sound files, but continue without them if they don't exist
        try {
          // Dynamic import to avoid errors if files don't exist
          const correctSoundModule = require('@/assets/sounds/correct.mp3');
          const { sound: correctSoundLoaded } = await Audio.Sound.createAsync(
            correctSoundModule,
            { shouldPlay: false, volume: 0.5 }
          );
          correct = correctSoundLoaded;
          setCorrectSound(correct);
          console.log('Correct sound loaded successfully');
        } catch (e) {
          console.warn('Correct sound not found, continuing without it:', e);
        }

        try {
          // Dynamic import to avoid errors if files don't exist
          const wrongSoundModule = require('@/assets/sounds/wrong.mp3');
          const { sound: wrongSoundLoaded } = await Audio.Sound.createAsync(
            wrongSoundModule,
            { shouldPlay: false, volume: 0.5 }
          );
          wrong = wrongSoundLoaded;
          setWrongSound(wrong);
          console.log('Wrong sound loaded successfully');
        } catch (e) {
          console.warn('Wrong sound not found, continuing without it:', e);
        }
      } catch (error) {
        console.warn('Failed to load sounds:', error);
        // Sounds are optional, continue without them
      }
    };

    loadSounds();

    return () => {
      correct?.unloadAsync().catch(console.warn);
      wrong?.unloadAsync().catch(console.warn);
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !id) {
      router.replace('/games');
      return;
    }

    fetchChallenge();
  }, [user, id]);

  const fetchChallenge = useCallback(async () => {
    if (!user?.id || !id) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/games/debugging/${id}?userId=${user.id}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('game_ui.error'));
      }

      setChallenge(data);
    } catch (err) {
      console.error('Fetch challenge error', err);
      Alert.alert(t('common.error'), t('game_ui.error'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user, id, t, router]);

  const handleSubmit = useCallback(async () => {
    if (selectedLine === null) {
      Alert.alert(t('common.error'), t('game_ui.no_selection'));
      return;
    }

    if (!user?.id || !challenge || submitting) return;

    try {
      setSubmitting(true);
      const timeTakenMs = Date.now() - startTime;

      const response = await fetch(
        `${API_URL}/api/games/debugging/${challenge.id}/submit?lang=${currentLang}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            selectedLine,
            timeTakenMs,
          }),
        }
      );

      const data: ResultData = await response.json();

      if (!response.ok) {
        throw new Error(data.explanation || t('common.error'));
      }

      setResultData(data);
      setShowResult(true);

      // Play sound
      try {
        if (data.isCorrect && correctSound) {
          await correctSound.replayAsync();
        } else if (!data.isCorrect && wrongSound) {
          await wrongSound.replayAsync();
        }
      } catch (soundError) {
        console.warn('Sound playback error:', soundError);
      }
    } catch (err) {
      console.error('Submit error', err);
      Alert.alert(t('common.error'), t('common.network_error'));
    } finally {
      setSubmitting(false);
    }
  }, [selectedLine, user, challenge, submitting, startTime, currentLang, t, correctSound, wrongSound]);

  const handleNext = useCallback(() => {
    setShowResult(false);
    setResultData(null);
    setSelectedLine(null);
    router.back();
  }, [router]);

  const formatTime = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  }, []);

  const elapsedTime = Date.now() - startTime;

  if (loading || !challenge) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text
            style={[
              styles.loadingText,
              {
                color: colorScheme === 'dark' ? '#CBD5F5' : '#475569',
              },
            ]}
          >
            {t('game_ui.loading')}
          </Text>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {currentLang === 'ms' ? challenge.title_ms : challenge.title_en}
          </ThemedText>
          <Text
            style={[
              styles.description,
              {
                color: colorScheme === 'dark' ? '#CBD5F5' : '#475569',
              },
            ]}
          >
            {currentLang === 'ms'
              ? challenge.description_ms
              : challenge.description_en}
          </Text>
        </View>

        {/* Timer */}
        <View
          style={[
            styles.timerContainer,
            {
              backgroundColor:
                colorScheme === 'dark'
                  ? 'rgba(59, 130, 246, 0.1)'
                  : 'rgba(59, 130, 246, 0.05)',
            },
          ]}
        >
          <IconSymbol
            name="clock.fill"
            size={18}
            color={colorScheme === 'dark' ? '#93C5FD' : '#3B82F6'}
          />
          <Text
            style={[
              styles.timerText,
              {
                color: colorScheme === 'dark' ? '#E2E8F0' : '#0F172A',
              },
            ]}
          >
            {t('game_ui.time')}: {formatTime(elapsedTime)}
          </Text>
        </View>

        {/* Code Block */}
        <View
          style={[
            styles.codeContainer,
            {
              backgroundColor:
                colorScheme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : '#F8FAFC',
              borderColor:
                colorScheme === 'dark'
                  ? 'rgba(148, 163, 184, 0.3)'
                  : '#E2E8F0',
            },
          ]}
        >
          <Text
            style={[
              styles.codeLabel,
              {
                color: colorScheme === 'dark' ? '#CBD5F5' : '#475569',
              },
            ]}
          >
            {t('game_ui.select_line')}:
          </Text>
          {codeLines.map((line, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.codeLine,
                selectedLine === index && styles.codeLineSelected,
                {
                  backgroundColor:
                    selectedLine === index
                      ? colorScheme === 'dark'
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(59, 130, 246, 0.1)'
                      : 'transparent',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => setSelectedLine(index)}
            >
              <Text
                style={[
                  styles.lineNumber,
                  {
                    color:
                      colorScheme === 'dark' ? '#94A3B8' : '#64748B',
                  },
                ]}
              >
                {index + 1}
              </Text>
              <Text
                style={[
                  styles.codeText,
                  {
                    color:
                      colorScheme === 'dark' ? '#F8FAFC' : '#0F172A',
                  },
                ]}
              >
                {line || ' '}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Submit Button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            (submitting || selectedLine === null) &&
              styles.submitButtonDisabled,
            {
              transform: [{ scale: pressed && !submitting ? 0.98 : 1 }],
            },
          ]}
          onPress={handleSubmit}
          disabled={submitting || selectedLine === null}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {t('game_ui.submit_answer')}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Result Modal */}
      <Modal
        visible={showResult}
        transparent
        animationType="fade"
        onRequestClose={handleNext}
      >
        <Pressable style={styles.modalOverlay} onPress={handleNext}>
          <Animated.View
            entering={BounceIn}
            style={[
              styles.modalContent,
              {
                backgroundColor:
                  colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
              },
            ]}
          >
            <Animated.View
              entering={FadeIn.delay(100)}
              style={styles.modalHeader}
            >
              <IconSymbol
                name={resultData?.isCorrect ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                size={64}
                color={resultData?.isCorrect ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: resultData?.isCorrect ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                {resultData?.isCorrect
                  ? t('game_ui.correct')
                  : t('game_ui.incorrect')}
              </Text>
            </Animated.View>

            {resultData && (
              <Animated.View
                entering={FadeIn.delay(200)}
                style={styles.modalBody}
              >
                {resultData.isCorrect && resultData.score !== undefined && (
                  <View style={styles.scoreContainer}>
                    <Text
                      style={[
                        styles.scoreLabel,
                        {
                          color:
                            colorScheme === 'dark' ? '#CBD5F5' : '#475569',
                        },
                      ]}
                    >
                      {t('game_ui.score')}:
                    </Text>
                    <Text
                      style={[
                        styles.scoreValue,
                        {
                          color:
                            colorScheme === 'dark' ? '#E2E8F0' : '#0F172A',
                        },
                      ]}
                    >
                      {resultData.score}
                    </Text>
                  </View>
                )}

                <Text
                  style={[
                    styles.explanationText,
                    {
                      color:
                        colorScheme === 'dark' ? '#CBD5F5' : '#475569',
                    },
                  ]}
                >
                  {resultData.explanation}
                </Text>
              </Animated.View>
            )}

            <Animated.View entering={FadeIn.delay(300)}>
              <Pressable
                style={styles.nextButton}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>{t('game_ui.next')}</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 20,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
    },
    header: {
      gap: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
    },
    timerText: {
      fontSize: 14,
      fontWeight: '600',
    },
    codeContainer: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      gap: 4,
    },
    codeLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    codeLine: {
      flexDirection: 'row',
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 6,
      gap: 12,
    },
    codeLineSelected: {
      borderWidth: 2,
      borderColor: '#3B82F6',
    },
    lineNumber: {
      fontSize: 13,
      fontFamily: 'monospace',
      minWidth: 32,
      textAlign: 'right',
    },
    codeText: {
      fontSize: 13,
      fontFamily: 'monospace',
      flex: 1,
    },
    submitButton: {
      backgroundColor: '#2563EB',
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 24,
      padding: 24,
      gap: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    modalHeader: {
      alignItems: 'center',
      gap: 12,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700',
    },
    modalBody: {
      gap: 16,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: isDark
        ? 'rgba(59, 130, 246, 0.1)'
        : 'rgba(59, 130, 246, 0.05)',
    },
    scoreLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    scoreValue: {
      fontSize: 24,
      fontWeight: '700',
    },
    explanationText: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    nextButton: {
      backgroundColor: '#2563EB',
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
};

