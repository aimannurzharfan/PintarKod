import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Challenge {
  title: { en: string; ms: string };
  description: { en: string; ms: string };
  codeBlock: string;
  buggyLineIndex: number;
  explanation: { en: string; ms: string };
  basePoints: number;
}

interface QuizResultData {
  isComplete: boolean;
  totalScore: number;
  correctCount: number;
  totalQuestions: number;
  feedback: Array<{
    title: string;
    explanation: string;
  }>;
}

export default function TroubleshootingPlayScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const iconColor = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5';
  const cardBackgroundColor = colorScheme === 'dark' ? '#2a2a2a' : '#ffffff';
  const cardBorderColor = colorScheme === 'dark' ? '#404040' : '#e0e0e0';

  // State management
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Array<{ challenge: Challenge; selectedLine: number }>>([]);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);
  const [soundFX] = useState<{ correct?: Audio.Sound; wrong?: Audio.Sound }>({});

  // Load sounds
  useEffect(() => {
    const loadSounds = async () => {
      try {
        const { sound: correctSound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/correct.mp3')
        );
        const { sound: wrongSound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/wrong.mp3')
        );
        soundFX.correct = correctSound;
        soundFX.wrong = wrongSound;
      } catch (error) {
        console.log('Sound loading error (non-critical):', error);
      }
    };

    loadSounds();

    return () => {
      soundFX.correct?.unloadAsync().catch(() => {});
      soundFX.wrong?.unloadAsync().catch(() => {});
    };
  }, []);

  // Fetch quiz from server
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/games/troubleshooting/quiz`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch quiz: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received quiz:', data.length, 'challenges');
        setChallenges(data);
      } catch (error) {
        console.error('Error fetching quiz:', error);
        Alert.alert(t('Error'), t('Failed to load troubleshooting quiz'));
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchQuiz();
    }
  }, [token, t]);

  // Timer effect
  useEffect(() => {
    if (loading || resultVisible) return;

    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(timer);
  }, [loading, resultVisible, startTime]);

  // Format time display
  const formatTime = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    return `${minutes}:${displaySeconds.toString().padStart(2, '0')}`;
  }, []);

  // Get current challenge
  const currentChallenge = useMemo(() => {
    return challenges[currentQuestionIndex] || null;
  }, [challenges, currentQuestionIndex]);

  // Code lines for display
  const codeLines = useMemo(() => {
    if (!currentChallenge) return [];
    return currentChallenge.codeBlock.split('\n');
  }, [currentChallenge]);

  // Play sound effect
  const playSound = useCallback(async (type: 'correct' | 'wrong') => {
    try {
      const sound = soundFX[type];
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.log('Sound playback error:', error);
    }
  }, [soundFX]);

  // Handle answer submission
  const handleAnswer = useCallback(async () => {
    if (selectedLine === null || !currentChallenge) {
      Alert.alert(t('Select an answer'), t('Please select a line'));
      return;
    }

    const isCorrect = selectedLine === currentChallenge.buggyLineIndex;

    if (isCorrect) {
      await playSound('correct');
    } else {
      await playSound('wrong');
    }

    const newAnswers = [...answers, { challenge: currentChallenge, selectedLine }];
    setAnswers(newAnswers);

    if (currentQuestionIndex < challenges.length - 1) {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedLine(null);
    } else {
      // Submit quiz
      await submitQuiz(newAnswers);
    }
  }, [selectedLine, currentChallenge, answers, currentQuestionIndex, challenges.length, playSound, t]);

  // Submit quiz to server
  const submitQuiz = useCallback(
    async (finalAnswers: Array<{ challenge: Challenge; selectedLine: number }>) => {
      try {
        setSubmitting(true);
        const totalTimeMs = Date.now() - startTime;

        const response = await fetch(
          `${API_URL}/api/games/submit-quiz?lang=${i18n.language}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              answers: finalAnswers,
              totalTimeMs,
              gameType: 'TROUBLESHOOTING_QUIZ',
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to submit quiz: ${response.status}`);
        }

        const result = await response.json();
        setQuizResult(result);
        setResultVisible(true);
      } catch (error) {
        console.error('Error submitting quiz:', error);
        Alert.alert(t('Error'), t('Failed to submit quiz'));
      } finally {
        setSubmitting(false);
      }
    },
    [token, startTime, i18n.language, t]
  );

  // Handle result modal close
  const handleResultModalClose = useCallback(() => {
    setResultVisible(false);
    router.back();
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ActivityIndicator size="large" color={iconColor} />
        <Text style={[styles.loadingText, { color: textColor }]}>
          {t('Loading troubleshooting quiz')}...
        </Text>
      </View>
    );
  }

  if (!currentChallenge) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: textColor }]}>
          {t('No quiz available')}
        </Text>
      </View>
    );
  }

  const currentLanguage = i18n.language;
  const langKey = (currentLanguage === 'ms' ? 'ms' : 'en') as 'en' | 'ms';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header with progress and timer */}
      <View style={[styles.header, { borderBottomColor: cardBorderColor }]}>
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: textColor }]}>
            {t('Question')} {currentQuestionIndex + 1} / {challenges.length}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: cardBorderColor }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentQuestionIndex + 1) / challenges.length) * 100}%`,
                  backgroundColor: '#4CAF50',
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, { color: '#FF9800' }]}>
            {formatTime(elapsedTime)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {/* Challenge Title and Description */}
        <View style={[styles.challengeCard, { backgroundColor: cardBackgroundColor, borderColor: cardBorderColor }]}>
          <Text style={[styles.challengeTitle, { color: textColor }]}>
            {currentChallenge.title[langKey]}
          </Text>
          <Text style={[styles.challengeDescription, { color: textColor }]}>
            {currentChallenge.description[langKey]}
          </Text>
        </View>

        {/* Code Block */}
        <View
          style={[
            styles.codeBlockContainer,
            { backgroundColor: colorScheme === 'dark' ? '#0d0d0d' : '#f9f9f9', borderColor: cardBorderColor },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.codeScroll}
          >
            <View>
              {codeLines.map((line, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.codeLine,
                    selectedLine === index && styles.selectedCodeLine,
                    {
                      backgroundColor:
                        selectedLine === index
                          ? 'rgba(255, 193, 7, 0.3)'
                          : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedLine(index)}
                >
                  <Text style={[styles.lineNumber, { color: '#888' }]}>
                    {index + 1}
                  </Text>
                  <Text
                    style={[
                      styles.codeText,
                      { color: selectedLine === index ? '#FFC107' : '#00BCD4' },
                    ]}
                  >
                    {line}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Instruction text */}
        <Text style={[styles.instructionText, { color: textColor }]}>
          {t('Tap the line with the error')}
        </Text>

        {/* Submit/Next Button */}
        <Pressable
          style={[
            styles.submitButton,
            { backgroundColor: selectedLine !== null ? '#4CAF50' : '#CCCCCC' },
          ]}
          onPress={handleAnswer}
          disabled={selectedLine === null || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {currentQuestionIndex === challenges.length - 1
                ? t('Finish')
                : t('Next')}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Result Modal */}
      <Modal
        visible={resultVisible}
        transparent
        animationType="fade"
        onRequestClose={handleResultModalClose}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View
            animation="bounceIn"
            duration={600}
            style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}
          >
            {quizResult && (
              <>
                {/* Score Display */}
                <View style={styles.scoreContainer}>
                  <Text style={[styles.scoreLabel, { color: textColor }]}>
                    {t('Total Score')}
                  </Text>
                  <Text style={styles.scoreValue}>{quizResult.totalScore}</Text>
                  <Text style={[styles.correctText, { color: '#4CAF50' }]}>
                    {t('Correct')}: {quizResult.correctCount} / {quizResult.totalQuestions}
                  </Text>
                </View>

                {/* Feedback for wrong answers */}
                {quizResult.feedback.length > 0 && (
                  <View style={styles.feedbackContainer}>
                    <Text style={[styles.feedbackTitle, { color: textColor }]}>
                      {t('Areas to improve')}:
                    </Text>
                    <ScrollView style={styles.feedbackScroll}>
                      {quizResult.feedback.map((item, index) => (
                        <View
                          key={index}
                          style={[
                            styles.feedbackItem,
                            { backgroundColor: colorScheme === 'dark' ? '#3a3a3a' : '#f0f0f0' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.feedbackItemTitle,
                              { color: textColor },
                            ]}
                          >
                            {item.title}
                          </Text>
                          <Text style={[styles.feedbackItemText, { color: textColor }]}>
                            {item.explanation}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Close Button */}
                <Pressable
                  style={styles.closeButton}
                  onPress={handleResultModalClose}
                >
                  <Text style={styles.closeButtonText}>{t('Close')}</Text>
                </Pressable>
              </>
            )}
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  timerContainer: {
    alignItems: 'flex-end',
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  challengeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  codeBlockContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  codeScroll: {
    paddingHorizontal: 12,
  },
  codeLine: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  selectedCodeLine: {
    borderRadius: 4,
  },
  lineNumber: {
    width: 30,
    textAlign: 'right',
    marginRight: 12,
    fontFamily: 'Courier New',
    fontSize: 12,
  },
  codeText: {
    fontFamily: 'Courier New',
    fontSize: 12,
    minWidth: 250,
  },
  instructionText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
    width: SCREEN_WIDTH - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  correctText: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackContainer: {
    marginBottom: 20,
    maxHeight: 250,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  feedbackScroll: {
    maxHeight: 200,
  },
  feedbackItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  feedbackItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  feedbackItemText: {
    fontSize: 12,
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
