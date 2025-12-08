import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
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
    BounceIn,
    FadeIn,
} from 'react-native-reanimated';
import { API_URL } from '../../../config';

type DebuggingChallenge = {
  title: { en: string; ms: string };
  description: { en: string; ms: string };
  codeBlock: string;
  buggyLineIndex: number;
  correctFix: string;  // NEW: The correct code fix
  fixOptions: string[];  // NEW: Array of 3 fix options (shuffled)
  explanation: { en: string; ms: string };
  basePoints: number;
};

type QuizResultData = {
  isComplete: boolean;
  totalScore: number;
  correctCount: number;
  totalQuestions: number;
  feedback?: Array<{ title: string; explanation: string }>;
};

export default function DebuggingChallengeScreen() {
  const { user, token } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createStyles(colorScheme ?? null), [colorScheme]);

  const [challenges, setChallenges] = useState<DebuggingChallenge[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Array<{ challenge: DebuggingChallenge; selectedLine: number; selectedFix: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedFix, setSelectedFix] = useState<string | null>(null);  // NEW
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<QuizResultData | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctSound, setCorrectSound] = useState<Audio.Sound | null>(null);
  const [wrongSound, setWrongSound] = useState<Audio.Sound | null>(null);
  
  // NEW: Immediate feedback state
  const [showQuestionFeedback, setShowQuestionFeedback] = useState(false);
  const [currentQuestionCorrect, setCurrentQuestionCorrect] = useState(false);
  const [incorrectQuestions, setIncorrectQuestions] = useState<Array<{questionNum: number; title: string; explanation: string}>>([]);

  const currentLang = i18n.language?.split('-')[0] || 'en';
  const challenge = challenges[currentQuestionIndex];
  const codeLines = challenge?.codeBlock.split('\n') || [];

  // Load sounds - optional, continue if they don't exist
  useEffect(() => {
    let correct: Audio.Sound | null = null;
    let wrong: Audio.Sound | null = null;

    const loadSounds = async () => {
      try {
        // Try to load sound files, but continue without them if they don't exist
        // Try MP3 first, then WAV (expo-av supports both)
        try {
          let correctSoundModule;
          try {
            // Try MP3 first
            correctSoundModule = require('@/assets/sounds/correct.mp3');
          } catch (e1) {
            // Fall back to WAV if MP3 doesn't exist
            try {
              correctSoundModule = require('@/assets/sounds/correct.wav');
            } catch (e2) {
              throw e1; // Use original error
            }
          }
          
          const { sound: correctSoundLoaded } = await Audio.Sound.createAsync(
            correctSoundModule,
            { shouldPlay: false, volume: 0.5 }
          );
          correct = correctSoundLoaded;
          setCorrectSound(correct);
          console.log('Correct sound loaded successfully');
        } catch (e) {
          console.warn('Correct sound not found, continuing without it');
        }

        try {
          let wrongSoundModule;
          try {
            // Try MP3 first
            wrongSoundModule = require('@/assets/sounds/wrong.mp3');
          } catch (e1) {
            // Fall back to WAV if MP3 doesn't exist
            try {
              wrongSoundModule = require('@/assets/sounds/wrong.wav');
            } catch (e2) {
              throw e1; // Use original error
            }
          }
          
          const { sound: wrongSoundLoaded } = await Audio.Sound.createAsync(
            wrongSoundModule,
            { shouldPlay: false, volume: 0.5 }
          );
          wrong = wrongSoundLoaded;
          setWrongSound(wrong);
          console.log('Wrong sound loaded successfully');
        } catch (e) {
          console.warn('Wrong sound not found, continuing without it');
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

  // Timer effect - update every 100ms
  useEffect(() => {
    if (showResult || isLoading || !challenge) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100); // Update every 100ms for smoother display

    return () => clearInterval(interval);
  }, [startTime, showResult, isLoading, challenge]);

  // Fetch quiz on mount
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!token) {
        console.log('Token not ready yet');
        return;
      }

      if (!user?.id) {
        router.replace('/games');
        return;
      }

      try {
        setIsLoading(true);
        
        const url = `${API_URL}/api/games/debugging/quiz`;
        console.log('Fetching quiz from:', url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Server returned non-JSON response:', text.substring(0, 200));
          throw new Error('Server returned invalid response. Expected JSON but got: ' + contentType);
        }
        
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || t('game_ui.error'));
        }

        if (!Array.isArray(data)) {
          console.error('Invalid quiz data format:', data);
          throw new Error('Invalid quiz data format');
        }

        console.log('Quiz fetched successfully:', data.length, 'challenges');
        setChallenges(data);
        setIsLoading(false);
        setStartTime(Date.now()); // Start timer
        setElapsedTime(0);
        setCurrentQuestionIndex(0);
        setSelectedLine(null);
        setUserAnswers([]);
      } catch (err: any) {
        console.error('Failed to fetch quiz', err);
        setIsLoading(false);
        const errorMsg = err.message || t('game_ui.error');
        Alert.alert(t('common.error'), errorMsg, [
          { text: t('common.ok'), onPress: () => router.back() },
        ]);
      }
    };

    fetchQuiz();
  }, [user, token, router, t]);

  const handleNextOrSubmit = useCallback(async () => {
    if (selectedLine === null) {
      Alert.alert(t('common.error'), t('game_ui.no_selection'));
      return;
    }

    // If correct line selected, require fix selection
    if (selectedLine === challenge.buggyLineIndex && selectedFix === null) {
      Alert.alert(t('common.error'), 'Please select a fix option');
      return;
    }

    if (!user?.id || !challenge || submitting) return;

    try {
      setSubmitting(true);
      
      // Store the user's answer with both line and fix (if applicable)
      const currentChallenge = challenges[currentQuestionIndex];
      const newAnswers = [...userAnswers, {
        challenge: currentChallenge,
        selectedLine: selectedLine,
        selectedFix: selectedFix || '',  // Empty string if no fix selected (wrong line)
      }];
      setUserAnswers(newAnswers);

      // NEW: Check if answer is correct immediately
      let isCorrect = false;
      if (currentChallenge.fixOptions && currentChallenge.correctFix) {
        // Debugging game: check both line and fix
        isCorrect = (currentChallenge.buggyLineIndex === selectedLine) && 
                    (selectedFix === currentChallenge.correctFix);
      } else {
        // Troubleshooting or old format: just check line
        isCorrect = (currentChallenge.buggyLineIndex === selectedLine);
      }

      // Play sound immediately
      if (isCorrect && correctSound) {
        await correctSound.replayAsync();
      } else if (!isCorrect && wrongSound) {
        await wrongSound.replayAsync();
      }

      // Track incorrect answers with question number
      if (!isCorrect) {
        const langKey = (currentLang === 'ms' ? 'ms' : 'en') as 'en' | 'ms';
        setIncorrectQuestions(prev => [...prev, {
          questionNum: currentQuestionIndex + 1,
          title: currentChallenge.title[langKey],
          explanation: currentChallenge.explanation[langKey],
        }]);
      }

      // Show immediate feedback
      setCurrentQuestionCorrect(isCorrect);
      setShowQuestionFeedback(true);

      const isLastQuestion = currentQuestionIndex === 9;

      if (isLastQuestion) {
        // After showing feedback, will submit the quiz
        // (submission happens in handleContinueAfterFeedback)
      } else {
        // Will move to next question after user clicks continue
      }
    } catch (err) {
      console.error('Error in handleNextOrSubmit', err);
      Alert.alert(t('common.error'), t('common.network_error'));
    } finally {
      setSubmitting(false);
    }
  }, [selectedLine, selectedFix, user, challenge, submitting, startTime, currentQuestionIndex, challenges, userAnswers, token, router, t, correctSound, wrongSound, currentLang]);

  // NEW: Handle continuing after viewing feedback
  const handleContinueAfterFeedback = useCallback(async () => {
    setShowQuestionFeedback(false);
    
    const isLastQuestion = currentQuestionIndex === 9;
    
    if (isLastQuestion) {
      // Submit the entire quiz
      try {
        setSubmitting(true);
        const totalTimeMs = Date.now() - startTime;
        
        if (!token) {
          throw new Error('No authentication token available');
        }
        
        const lang = currentLang || 'en';
        const response = await fetch(
          `${API_URL}/api/games/submit-quiz?lang=${lang}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              answers: userAnswers,
              totalTimeMs: totalTimeMs,
            }),
          }
        );

        const result: QuizResultData = await response.json();

        if (!response.ok) {
          throw new Error('Failed to submit quiz');
        }

        // Show final result modal
        setResultData(result);
        setShowResult(true);
      } catch (err) {
        console.error('Submit quiz error', err);
        Alert.alert(t('common.error'), t('common.network_error'));
      } finally {
        setSubmitting(false);
      }
    } else {
      // Go to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedLine(null);
      setSelectedFix(null);
    }
  }, [currentQuestionIndex, startTime, token, currentLang, userAnswers, t]);

  const handleNext = useCallback(() => {
    setShowResult(false);
    setResultData(null);
    setSelectedLine(null);
    router.back();
  }, [router]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${totalSeconds}s`;
  }, []);

  if (isLoading || !challenge) {
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

  const isLastQuestion = currentQuestionIndex === 9;
  const buttonText = isLastQuestion ? t('game_ui.submit_answer') : t('game_ui.next_question');

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Indicator */}
        <View
          style={[
            styles.progressContainer,
            {
              backgroundColor:
                colorScheme === 'dark'
                  ? 'rgba(59, 130, 246, 0.1)'
                  : 'rgba(59, 130, 246, 0.05)',
            },
          ]}
        >
          <Text
            style={[
              styles.progressText,
              {
                color: colorScheme === 'dark' ? '#E2E8F0' : '#0F172A',
              },
            ]}
          >
            {t('game_ui.question_progress')
              .replace('{{current}}', String(currentQuestionIndex + 1))
              .replace('{{total}}', '10')}
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {currentLang === 'ms' ? challenge.title.ms : challenge.title.en}
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
              ? challenge.description.ms
              : challenge.description.en}
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


        {/* Fix Options - Only show when CORRECT buggy line is selected */}
        {selectedLine !== null && selectedLine === challenge.buggyLineIndex && challenge.fixOptions && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.fixOptionsContainer}
          >
            <Text
              style={[
                styles.fixOptionsTitle,
                { color: colorScheme === 'dark' ? '#E2E8F0' : '#0F172A' },
              ]}
            >
              Select the correct fix:
            </Text>
            {challenge.fixOptions.map((fix, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.fixOptionButton,
                  selectedFix === fix && styles.fixOptionSelected,
                  {
                    backgroundColor:
                      selectedFix === fix
                        ? colorScheme === 'dark'
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'rgba(59, 130, 246, 0.15)'
                        : colorScheme === 'dark'
                        ? 'rgba(59, 130, 246, 0.05)'
                        : 'rgba(59, 130, 246, 0.02)',
                    borderColor:
                      selectedFix === fix
                        ? '#3B82F6'
                        : colorScheme === 'dark'
                        ? 'rgba(148, 163, 184, 0.2)'
                        : 'rgba(148, 163, 184, 0.1)',
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
                onPress={() => setSelectedFix(fix)}
              >
                <View style={styles.fixOptionContent}>
                  <View
                    style={[
                      styles.fixOptionRadio,
                      {
                        borderColor:
                          selectedFix === fix
                            ? '#3B82F6'
                            : colorScheme === 'dark'
                            ? '#64748B'
                            : '#94A3B8',
                        backgroundColor:
                          selectedFix === fix ? '#3B82F6' : 'transparent',
                      },
                    ]}
                  >
                    {selectedFix === fix && (
                      <View style={styles.fixOptionRadioInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.fixOptionText,
                      {
                        color:
                          selectedFix === fix
                            ? '#3B82F6'
                            : colorScheme === 'dark'
                            ? '#F8FAFC'
                            : '#0F172A',
                      },
                    ]}
                  >
                    {fix}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* Submit/Next Button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            (submitting || selectedLine === null || 
             (selectedLine === challenge.buggyLineIndex && selectedFix === null)) &&
              styles.submitButtonDisabled,
            {
              transform: [{ scale: pressed && !submitting ? 0.98 : 1 }],
            },
          ]}
          onPress={handleNextOrSubmit}
          disabled={submitting || selectedLine === null || 
                   (selectedLine === challenge.buggyLineIndex && selectedFix === null)}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {buttonText}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* NEW: Question Feedback Modal - Shows after each question */}
      <Modal
        visible={showQuestionFeedback}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
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
            <View style={styles.modalHeader}>
              <IconSymbol
                name={currentQuestionCorrect ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                size={64}
                color={currentQuestionCorrect ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: currentQuestionCorrect ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                {currentQuestionCorrect ? t('game_ui.correct') : t('game_ui.incorrect')}
              </Text>
            </View>
            
            {!currentQuestionCorrect && challenge && (
              <View style={styles.modalBody}>
                <Text
                  style={[
                    styles.feedbackText,
                    { color: colorScheme === 'dark' ? '#CBD5F5' : '#475569' },
                  ]}
                >
                  {currentLang === 'ms' ? challenge.explanation.ms : challenge.explanation.en}
                </Text>
              </View>
            )}

            <Pressable
              style={styles.nextButton}
              onPress={handleContinueAfterFeedback}
            >
              <Text style={styles.nextButtonText}>
                {currentQuestionIndex === 9 ? t('game_ui.submit_answer') : t('game_ui.next_question')}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

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
                name={resultData && resultData.correctCount > resultData.totalQuestions / 2 ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                size={64}
                color={resultData && resultData.correctCount > resultData.totalQuestions / 2 ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: resultData && resultData.correctCount > resultData.totalQuestions / 2 ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                {resultData && resultData.correctCount > resultData.totalQuestions / 2
                  ? t('game_ui.correct')
                  : t('game_ui.incorrect')}
              </Text>
            </Animated.View>

            {resultData && (
              <Animated.View
                entering={FadeIn.delay(200)}
                style={styles.modalBody}
              >
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
                    {resultData.totalScore}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.resultText,
                    {
                      color:
                        colorScheme === 'dark' ? '#CBD5F5' : '#475569',
                    },
                  ]}
                >
                  {resultData.correctCount} / {resultData.totalQuestions}
                </Text>
              </Animated.View>
            )}

            <Animated.View entering={FadeIn.delay(300)}>
              {incorrectQuestions.length > 0 && (
                <Pressable
                  style={styles.feedbackButton}
                  onPress={() => setShowFeedback(true)}
                >
                  <Text style={styles.feedbackButtonText}>
                    {t('game_ui.get_feedback')} ({incorrectQuestions.length} incorrect)
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={styles.nextButton}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>{t('game_ui.close_game')}</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Modal 2: Feedback Modal */}
      <Modal
        transparent={true}
        visible={showFeedback}
        animationType="fade"
        onRequestClose={() => setShowFeedback(false)}
      >
        <Pressable 
          style={styles.feedbackOverlay}
          onPress={() => setShowFeedback(false)}
        >
          <Animated.View 
            style={[
              styles.feedbackContainer,
              {
                backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF',
              }
            ]}
            entering={FadeIn.duration(300)}
            exiting={FadeIn.duration(300)}
            onStartShouldSetResponder={() => true}
          >
              <Text 
                style={[
                  styles.reviewTitle,
                  {
                    color: colorScheme === 'dark' ? '#E2E8F0' : '#0F172A',
                  }
                ]}
              >
                {t('game_ui.review_wrong_answers')}
              </Text>
              <ScrollView style={styles.feedbackScroll}>
                {incorrectQuestions.map((item, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.feedbackItem,
                      {
                        backgroundColor: colorScheme === 'dark' ? '#334155' : '#F1F5F9',
                      }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.feedbackTitle,
                        {
                          color: colorScheme === 'dark' ? '#CBD5E1' : '#334155',
                        }
                      ]}
                    >
                      Question {item.questionNum}: {item.title}
                    </Text>
                    <Text 
                      style={[
                        styles.feedbackText,
                        {
                          color: colorScheme === 'dark' ? '#94A3B8' : '#475569',
                        }
                      ]}
                    >
                      {item.explanation}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowFeedback(false)}
              >
                <Text style={styles.buttonText}>{t('game_ui.close')}</Text>
              </Pressable>
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
    progressContainer: {
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    progressText: {
      fontSize: 14,
      fontWeight: '600',
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
      alignItems: 'center',
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
    resultText: {
      fontSize: 18,
      fontWeight: '600',
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
    // Styles for "Get Feedback" button
    feedbackButton: {
      backgroundColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 10,
    },
    feedbackButtonText: {
      color: isDark ? '#F1F5F9' : '#1E293B',
      fontSize: 16,
      fontWeight: '600',
    },
    // Styles for Feedback Modal
    feedbackOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    feedbackContainer: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 16,
      padding: 20,
      maxHeight: '60%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    reviewTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 16,
      textAlign: 'center',
    },
    feedbackScroll: {
      marginBottom: 16,
    },
    feedbackItem: {
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
    },
    feedbackTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    feedbackText: {
      fontSize: 14,
      marginTop: 5,
    },
    closeButton: {
      backgroundColor: '#2563EB',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    // NEW: Fix options styles
    fixOptionsContainer: {
      marginTop: 20,
      marginBottom: 20,
      gap: 12,
    },
    fixOptionsTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
      textAlign: 'center',
    },
    fixOptionButton: {
      borderRadius: 12,
      borderWidth: 2,
      padding: 16,
      minHeight: 60,
    },
    fixOptionSelected: {
      borderWidth: 3,
    },
    fixOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    fixOptionRadio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fixOptionRadioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#FFFFFF',
    },
    fixOptionText: {
      fontSize: 14,
      fontFamily: 'monospace',
      flex: 1,
      lineHeight: 20,
    },
    // NEW: Instruction panel styles
    instructionPanel: {
      borderRadius: 16,
      borderWidth: 2,
      padding: 16,
      marginBottom: 20,
    },
    instructionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    instructionTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    stepsContainer: {
      gap: 12,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    stepRowActive: {
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    stepIndicator: {
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    stepText: {
      fontSize: 15,
      flex: 1,
      fontWeight: '500',
    },
    stepTextActive: {
      fontWeight: '700',
    },
    stepTextCompleted: {
      textDecorationLine: 'none',
    },
    currentStepArrow: {
      fontSize: 20,
      fontWeight: '700',
      color: '#8B5CF6',
    },
  });
};
