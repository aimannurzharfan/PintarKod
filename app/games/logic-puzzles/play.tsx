import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Audio } from 'expo-av';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from 'react-native';

interface Challenge {
  title: { en: string; ms: string };
  description: { en: string; ms: string };
  codeBlock: string;
  correctOutput: string;
  options: string[];
  explanation: { en: string; ms: string };
  basePoints: number;
}

export default function LogicPuzzlesGame() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [userAnswers, setUserAnswers] = useState<Array<{
    challenge: Challenge;
    selectedOutput: string;
    timeMs: number;
  }>>([]);
  
  // Feedback review state
  const [quizFeedback, setQuizFeedback] = useState<Array<{ title: string; explanation: string }>>([]);
  const [showFeedbackReview, setShowFeedbackReview] = useState(false);
  
  // Exit confirmation state
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Allow navigating away after user confirmed leave
  const [allowExit, setAllowExit] = useState(false);
  
  // Sound effects
  const [soundCorrect, setSoundCorrect] = useState<Audio.Sound | null>(null);
  const [soundWrong, setSoundWrong] = useState<Audio.Sound | null>(null);

  // Animation values
  const [pulseAnim] = useState(new Animated.Value(1));
  const [shakeAnim] = useState(new Animated.Value(0));

  const isDark = colorScheme === 'dark';
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const challenge = challenges[currentQuestionIndex];
  const codeLines = challenge?.codeBlock.split('\n') || [];

  // Set header title
  useEffect(() => {
    try {
      navigation.setOptions({
        headerTitle: t('game_ui.puzzle_title') || 'Logic Puzzles',
        headerBackTitleVisible: false,
      });
    } catch (err) {
      console.debug('Failed to set header title:', err);
    }
  }, [navigation, t]);

  // Timer
  useEffect(() => {
    if (!showResults) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, showResults]);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Load sounds
  useEffect(() => {
    let correct: Audio.Sound | null = null;
    let wrong: Audio.Sound | null = null;

    Audio.Sound.createAsync(require('@/assets/sounds/correct.mp3'))
      .then(({ sound }) => {
        correct = sound;
        setSoundCorrect(sound);
      })
      .catch(() => {});

    Audio.Sound.createAsync(require('@/assets/sounds/wrong.mp3'))
      .then(({ sound }) => {
        wrong = sound;
        setSoundWrong(sound);
      })
      .catch(() => {});

    return () => {
      correct?.unloadAsync();
      wrong?.unloadAsync();
    };
  }, []);

  // Fetch quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await fetch(`${API_URL}/api/games/logic-puzzles/quiz`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error:', response.status, errorText);
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        setChallenges(data);
        setIsLoading(false);
        setQuestionStartTime(Date.now()); // Start timer for first question
      } catch (error) {
        console.error('Error fetching quiz:', error);
        setIsLoading(false);
      }
    };
    
    if (token) {
      fetchQuiz();
    }
  }, [token]);

  // Reset question timer when moving to next question
  useEffect(() => {
    if (currentQuestionIndex > 0 && !showResults) {
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex]);

  // Handle back button press
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    const handleBackPress = () => {
      if (showResults || showFeedbackReview) {
        return false;
      }
      setShowExitConfirm(true);
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [showResults, showFeedbackReview]);

  // Shake animation for wrong answer
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = useCallback(async () => {
    if (selectedOutput === null) return;

    const correct = selectedOutput === challenge.correctOutput;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      soundCorrect?.replayAsync()?.catch(() => {});
    } else {
      soundWrong?.replayAsync()?.catch(() => {});
      triggerShake();
    }

    // Calculate time for this question
    const timeForQuestion = Date.now() - questionStartTime;

    const newAnswers = [...userAnswers, {
      challenge,
      selectedOutput,
      timeMs: timeForQuestion,
    }];
    setUserAnswers(newAnswers);
  }, [selectedOutput, challenge, userAnswers, soundCorrect, soundWrong, questionStartTime]);

  const handleContinue = useCallback(async () => {
    setShowFeedback(false);
    
    if (currentQuestionIndex < challenges.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOutput(null);
      setQuestionStartTime(Date.now()); // Start timer for next question
    } else {
      // Submit quiz - include the last answer directly
      try {
        // Calculate the last answer
        const timeForQuestion = Date.now() - questionStartTime;
        const lastAnswer = {
          challenge,
          selectedOutput: selectedOutput!,
          timeMs: timeForQuestion,
        };
        
        // Include all previous answers plus the last one
        const allAnswers = [...userAnswers, lastAnswer];
        
        const response = await fetch(`${API_URL}/api/games/submit-quiz`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: allAnswers, // Now includes the last answer
            totalTimeMs: elapsedTime * 1000, // Convert to milliseconds (for backward compatibility)
            gameType: 'LOGIC_PUZZLES_QUIZ',
          }),
        });
        const result = await response.json();
        setTotalScore(result.totalScore || 0);
        if (result.feedback && result.feedback.length > 0) {
          setQuizFeedback(result.feedback);
        }
        setShowResults(true);
      } catch (error) {
        console.error('Submit error:', error);
        setShowResults(true);
      }
    }
  }, [currentQuestionIndex, challenges.length, userAnswers, challenge, selectedOutput, questionStartTime, token, elapsedTime]);

  // Attempt leave helper (shows confirm when mid-quiz)
  const attemptLeave = useCallback(() => {
    if (showResults || showFeedbackReview) {
      router.back();
      return;
    }
    setShowExitConfirm(true);
  }, [router, showResults, showFeedbackReview]);

  // Intercept header/back navigation (top-left back button)
  useEffect(() => {
    const beforeRemove = (e: any) => {
      if (allowExit) return; // already confirmed
      if (showResults || showFeedbackReview) return;
      e.preventDefault();
      setShowExitConfirm(true);
    };

    const unsub = navigation.addListener('beforeRemove', beforeRemove as any);
    return () => unsub && unsub();
  }, [navigation, showResults, showFeedbackReview, allowExit]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
            {t('game_ui.loading') || 'Loading Logic Puzzles...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!challenge) return null;

  const shakeStyle = {
    transform: [{ translateX: shakeAnim }],
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header with animated badge */}
        <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.headerTop}>
            <Animated.View style={[styles.badgeContainer, { transform: [{ scale: pulseAnim }] }]}>
                <MaterialCommunityIcons name="puzzle-outline" size={28} color={isDark ? '#E2E8F0' : '#1E293B'} />
              </Animated.View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.headerTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                Predict the Output!
              </Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Question {currentQuestionIndex + 1} of {challenges.length}
              </Text>
            </View>
            <View style={[styles.timerBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }]}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#3B82F6" />
                <Text style={[styles.timerText, { color: '#3B82F6' }]}>{elapsedTime}s</Text>
              </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${((currentQuestionIndex + 1) / challenges.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Challenge Card */}
        <Animated.View style={[styles.challengeCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }, shakeStyle]}>
          <View style={styles.challengeHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={isDark ? '#E2E8F0' : '#1E293B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.challengeTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                {currentLang === 'ms' ? challenge.title.ms : challenge.title.en}
              </Text>
              <Text style={[styles.challengeDescription, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {currentLang === 'ms' ? challenge.description.ms : challenge.description.en}
              </Text>
            </View>
          </View>

          {/* Code Block with interactive styling */}
          <View style={[styles.codeContainer, { 
            backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          }]}>
            <View style={[styles.codeHeader, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }]}>
              <MaterialCommunityIcons name="file-document-outline" size={14} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[styles.codeHeaderText, { color: isDark ? '#94A3B8' : '#64748B' }]}> 
                Code to Analyze
              </Text>
            </View>
            {codeLines.map((line, index) => (
              <View key={index} style={styles.codeLine}>
                <Text style={[styles.lineNumber, { color: isDark ? '#475569' : '#94A3B8' }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.codeText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                  {line || ' '}
                </Text>
              </View>
            ))}
          </View>

          {/* Output Prediction Section */}
          <View style={styles.predictionSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="bullseye" size={16} color={isDark ? '#E2E8F0' : '#1E293B'} style={{ marginRight: 8 }} />
              <Text style={[styles.predictionTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>What will be printed?</Text>
            </View>
            <View style={styles.optionsGrid}>
              {challenge.options?.map((option, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.optionButton,
                    {
                      backgroundColor: selectedOutput === option
                        ? '#3B82F6'
                        : isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: selectedOutput === option ? '#3B82F6' : (isDark ? '#334155' : '#E2E8F0'),
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                  onPress={() => setSelectedOutput(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { 
                        color: selectedOutput === option 
                          ? '#FFFFFF' 
                          : (isDark ? '#E2E8F0' : '#1E293B'),
                        fontWeight: selectedOutput === option ? '700' : '600',
                      },
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              selectedOutput === null && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={selectedOutput === null}
          >
            <Text style={styles.submitButtonText}>
              {currentQuestionIndex < challenges.length - 1 ? 'Submit Answer' : 'Finish Quiz'}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal visible={showFeedback} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackModal, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <MaterialCommunityIcons name={isCorrect ? 'check-circle-outline' : 'emoticon-sad-outline'} size={72} color={isCorrect ? '#10B981' : '#EF4444'} />
            <Text style={[styles.feedbackTitle, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
              {isCorrect ? 'Excellent!' : 'Not Quite'}
            </Text>
            <Text style={[styles.feedbackText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {currentLang === 'ms' ? challenge?.explanation.ms : challenge?.explanation.en}
            </Text>
            <View style={styles.correctAnswerBox}>
              <Text style={[styles.correctAnswerLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Correct Output:
              </Text>
              <Text style={[styles.correctAnswerValue, { color: '#3B82F6' }]}> 
                {challenge?.correctOutput}
              </Text>
            </View>
            <Pressable 
              style={[styles.continueButton, { backgroundColor: isCorrect ? '#10B981' : '#EF4444' }]} 
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>
                {currentQuestionIndex < challenges.length - 1 ? 'Next Puzzle →' : 'See Results'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Results Modal */}
      <Modal visible={showResults} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <MaterialCommunityIcons name="trophy-outline" size={64} color="#3B82F6" />
            <Text style={[styles.resultsTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Puzzle Master!
            </Text>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={[styles.scoreValue, { color: '#3B82F6' }]}>{totalScore}</Text>
              <Text style={[styles.scoreSubtext, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {totalScore >= 800 ? 'Perfect Logic!' : totalScore >= 600 ? 'Great Thinking!' : 'Keep Practicing!'}
              </Text>
            </View>
            {quizFeedback.length > 0 && (
              <Pressable 
                style={styles.feedbackButton} 
                onPress={() => setShowFeedbackReview(true)}
              >
                <Text style={styles.feedbackButtonText}>
                  Review Mistakes ({quizFeedback.length})
                </Text>
              </Pressable>
            )}
            <Pressable style={styles.closeButton} onPress={attemptLeave}>
              <Text style={styles.closeButtonText}>{t('game_ui.close_game')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Feedback Review Modal */}
      <Modal visible={showFeedbackReview} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackReviewModal, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="book-open-outline" size={18} color={isDark ? '#E2E8F0' : '#1E293B'} style={{ marginRight: 8 }} />
              <Text style={[styles.feedbackReviewTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>Review Your Mistakes</Text>
            </View>
            <ScrollView style={styles.feedbackReviewScroll} showsVerticalScrollIndicator={false}>
              {quizFeedback.map((item, index) => (
                <View key={index} style={[styles.feedbackItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                  <Text style={[styles.feedbackItemTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                    {index + 1}. {item.title}
                  </Text>
                  <Text style={[styles.feedbackItemExplanation, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {item.explanation}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.feedbackCloseButton} onPress={() => setShowFeedbackReview(false)}>
              <Text style={styles.feedbackCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal visible={showExitConfirm} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.exitConfirmModal, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#F59E0B" />
            <Text style={[styles.exitConfirmTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              {t('game_ui.exit_confirm_title')}
            </Text>
            <Text style={[styles.exitConfirmText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {t('game_ui.exit_confirm_message')}
            </Text>
            <View style={styles.exitConfirmButtons}>
              <Pressable style={styles.exitStayButton} onPress={() => setShowExitConfirm(false)}>
                <Text style={styles.exitStayButtonText}>{t('game_ui.exit_confirm_stay')}</Text>
              </Pressable>
              <Pressable
                style={styles.exitLeaveButton}
                onPress={() => {
                  setAllowExit(true);
                  setShowExitConfirm(false);
                  // avoid calling navigation.reset synchronously (can trigger
                  // unhandled navigation actions). Close modal then replace
                  // route shortly after to allow state to settle.
                  setTimeout(() => {
                    router.replace('/mainpage');
                  }, 50);
                }}
              >
                <Text style={styles.exitLeaveButtonText}>{t('game_ui.exit_confirm_leave')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  header: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  badgeContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(59, 130, 246, 0.2)', alignItems: 'center', justifyContent: 'center' },
  badgeEmoji: { fontSize: 28 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  timerText: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
  progressBarContainer: { height: 8, backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
  challengeCard: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, gap: 20 },
  challengeHeader: { flexDirection: 'row', gap: 12 },
  iconWrapper: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 24 },
  challengeTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  challengeDescription: { fontSize: 14, lineHeight: 20 },
  codeContainer: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  codeHeaderText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  codeLine: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, gap: 12 },
  lineNumber: { fontSize: 14, fontFamily: 'monospace', minWidth: 24, textAlign: 'right' },
  codeText: { fontSize: 14, fontFamily: 'monospace', flex: 1 },
  predictionSection: { gap: 12 },
  predictionTitle: { fontSize: 18, fontWeight: '700' },
  optionsGrid: { gap: 12 },
  optionButton: { padding: 18, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  optionText: { fontSize: 16, fontFamily: 'monospace' },
  submitButton: { backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 18, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  submitButtonDisabled: { backgroundColor: '#94A3B8', opacity: 0.5 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 32, alignItems: 'center', gap: 20 },
  resultsEmoji: { fontSize: 64 },
  resultsTitle: { fontSize: 28, fontWeight: '800' },
  scoreCard: { alignItems: 'center', gap: 8 },
  scoreLabel: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  scoreValue: { fontSize: 56, fontWeight: '900' },
  scoreSubtext: { fontSize: 16, fontWeight: '600' },
  closeButton: { backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%' },
  closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  feedbackModal: { width: '90%', maxWidth: 400, borderRadius: 24, padding: 32, alignItems: 'center', gap: 16 },
  feedbackTitle: { fontSize: 28, fontWeight: '800' },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  correctAnswerBox: { width: '100%', padding: 16, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', gap: 8 },
  correctAnswerLabel: { fontSize: 12, fontWeight: '600' },
  correctAnswerValue: { fontSize: 24, fontWeight: '800', fontFamily: 'monospace' },
  continueButton: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%', marginTop: 8 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  feedbackButton: { backgroundColor: '#8B5CF6', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, width: '100%' },
  feedbackButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  feedbackReviewModal: { width: '95%', maxWidth: 450, maxHeight: '80%', borderRadius: 24, padding: 24, gap: 16 },
  feedbackReviewTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  feedbackReviewScroll: { maxHeight: 350 },
  feedbackItem: { padding: 16, borderRadius: 12, marginBottom: 12, gap: 8 },
  feedbackItemTitle: { fontSize: 15, fontWeight: '700' },
  feedbackItemExplanation: { fontSize: 13, lineHeight: 20 },
  feedbackCloseButton: { backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 14, width: '100%' },
  feedbackCloseButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  exitConfirmModal: { width: '90%', maxWidth: 380, borderRadius: 24, padding: 28, alignItems: 'center', gap: 12 },
  exitConfirmTitle: { fontSize: 24, fontWeight: '800' },
  exitConfirmText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  exitConfirmButtons: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  exitStayButton: { flex: 1, backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  exitStayButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  exitLeaveButton: { flex: 1, backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  exitLeaveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

