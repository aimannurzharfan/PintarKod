import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Audio } from 'expo-av';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    BackHandler,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';

interface Challenge {
  title: { en: string; ms: string };
  description: { en: string; ms: string };
  codeBlock: string;
  buggyLineIndex: number;
  explanation: { en: string; ms: string };
  correctFix: string;
  fixOptions: string[];
  basePoints: number;
}

export default function DebuggingGame() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedFix, setSelectedFix] = useState<string | null>(null);
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
    selectedLine: number;
    selectedFix: string;
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

  const isDark = colorScheme === 'dark';
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const challenge = challenges[currentQuestionIndex];
  const codeLines = challenge?.codeBlock.split('\n') || [];

  // Timer
  useEffect(() => {
    if (!showResults) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, showResults]);

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
        const response = await fetch(`${API_URL}/api/games/debugging/quiz`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setChallenges(data);
        setIsLoading(false);
        setQuestionStartTime(Date.now()); // Start timer for first question
      } catch (error) {
        setIsLoading(false);
      }
    };
    fetchQuiz();
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
        // Allow normal back behavior when viewing results
        return false;
      }
      // Show exit confirmation when game is in progress
      setShowExitConfirm(true);
      return true; // Prevent default back behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [showResults, showFeedbackReview]);

  const attemptLeave = () => {
    if (showResults || showFeedbackReview) {
      router.back();
      return;
    }
    setShowExitConfirm(true);
  };

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

  const handleSubmit = useCallback(async () => {
    if (selectedLine === null || selectedFix === null) return;

    const correct = selectedLine === challenge.buggyLineIndex && selectedFix === challenge.correctFix;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      soundCorrect?.replayAsync()?.catch(() => {});
    } else {
      soundWrong?.replayAsync()?.catch(() => {});
    }

    // Calculate time for this question
    const timeForQuestion = Date.now() - questionStartTime;

    const newAnswers = [...userAnswers, {
      challenge,
      selectedLine,
      selectedFix,
      timeMs: timeForQuestion,
    }];
    setUserAnswers(newAnswers);
  }, [selectedLine, selectedFix, challenge, userAnswers, soundCorrect, soundWrong, questionStartTime]);

  const handleContinue = useCallback(async () => {
    setShowFeedback(false);
    
    if (currentQuestionIndex < challenges.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedLine(null);
      setSelectedFix(null);
      setQuestionStartTime(Date.now()); // Start timer for next question
    } else {
      // Submit quiz - use userAnswers which now includes the last answer
      try {
        const response = await fetch(`${API_URL}/api/games/submit-quiz`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: userAnswers, // This now has all answers including the last one with timeMs
            totalTimeMs: elapsedTime * 1000, // Convert seconds to milliseconds (for backward compatibility)
            gameType: 'DEBUGGING_QUIZ',
          }),
        });
        const result = await response.json();
        console.log('Quiz result:', result);
        setTotalScore(result.totalScore || 0);
        // Store feedback for wrong answers
        if (result.feedback && result.feedback.length > 0) {
          setQuizFeedback(result.feedback);
        }
        setShowResults(true);
      } catch (error) {
        console.error('Submit error:', error);
        setShowResults(true);
      }
    }
  }, [currentQuestionIndex, challenges.length, userAnswers, token, elapsedTime]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={[styles.loadingText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
            Loading Java Challenges...
          </Text>
        </View>
      </View>
    );
  }

  if (!challenge) return null;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header with gradient */}
        <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="bug" size={20} color={isDark ? '#E2E8F0' : '#1E293B'} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>Code Debugger</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Progress */}
          <View style={styles.progressSection}>
            <Text style={[styles.questionNumber, { color: '#8B5CF6' }]}>
              Question {currentQuestionIndex + 1} of {challenges.length}
            </Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${((currentQuestionIndex + 1) / challenges.length) * 100}%` }
                ]} 
              />
            </View>
          </View>

          {/* Timer */}
          <View style={styles.timerBadge}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#8B5CF6" />
            <Text style={styles.timerText}>{elapsedTime}s</Text>
          </View>
        </View>

        {/* Challenge Card */}
        <View style={[styles.challengeCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.challengeHeader}>
            <View style={styles.bugIcon}>
              <MaterialCommunityIcons name="magnify" size={24} color={isDark ? '#E2E8F0' : '#1E293B'} />
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

          {/* Code Block */}
          <View style={[styles.codeContainer, { 
            backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          }]}>
            <View style={styles.codeHeader}>
              <MaterialCommunityIcons name="file-document-outline" size={14} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[styles.codeHeaderText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Main.java
              </Text>
            </View>
            {codeLines.map((line, index) => (
              <Pressable
                key={index}
                style={[
                  styles.codeLine,
                  selectedLine === index && {
                    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                    borderLeftColor: '#8B5CF6',
                    borderLeftWidth: 3,
                  },
                ]}
                onPress={() => setSelectedLine(index)}
              >
                <Text style={[styles.lineNumber, { color: isDark ? '#475569' : '#94A3B8' }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.codeText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                  {line || ' '}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Fix Options */}
          {selectedLine === challenge.buggyLineIndex && challenge.fixOptions && (
            <View style={styles.fixOptionsContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="stethoscope" size={16} color={isDark ? '#E2E8F0' : '#1E293B'} style={{ marginRight: 8 }} />
                <Text style={[styles.fixOptionsTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>Choose the fix:</Text>
              </View>
              {challenge.fixOptions.map((option, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.fixOption,
                    {
                      backgroundColor: selectedFix === option
                        ? '#8B5CF6'
                        : isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: selectedFix === option ? '#8B5CF6' : isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => setSelectedFix(option)}
                >
                  <Text
                    style={[
                      styles.fixOptionText,
                      { color: selectedFix === option ? '#FFFFFF' : isDark ? '#E2E8F0' : '#1E293B' },
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              (selectedLine === null || selectedFix === null) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={selectedLine === null || selectedFix === null}
          >
            <Text style={styles.submitButtonText}>
              {currentQuestionIndex < challenges.length - 1 ? 'Next Question' : 'Finish'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Feedback Modal - Shows after each answer */}
      <Modal visible={showFeedback} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackModal, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <MaterialCommunityIcons
              name={isCorrect ? 'check-circle-outline' : 'close-circle-outline'}
              size={64}
              color={isCorrect ? '#10B981' : '#EF4444'}
            />
            <Text style={[styles.feedbackTitle, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
              {isCorrect ? 'Correct!' : 'Wrong!'}
            </Text>
            <Text style={[styles.feedbackText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {currentLang === 'ms' ? challenge?.explanation.ms : challenge?.explanation.en}
            </Text>
            <Pressable style={[styles.continueButton, { backgroundColor: isCorrect ? '#10B981' : '#EF4444' }]} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>
                {currentQuestionIndex < challenges.length - 1 ? 'Next Question' : 'See Results'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Results Modal */}
      <Modal visible={showResults} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <MaterialCommunityIcons name="trophy-outline" size={64} color="#8B5CF6" />
            <Text style={[styles.resultsTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Challenge Complete!
            </Text>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={styles.scoreValue}>{totalScore}</Text>
              <Text style={[styles.scoreSubtext, { color: isDark ? '#94A3B8' : '#64748B' }]}> 
                {totalScore >= 800 ? 'Excellent!' : totalScore >= 600 ? 'Good Job!' : 'Keep Practicing!'}
              </Text>
            </View>
            {quizFeedback.length > 0 && (
              <Pressable 
                style={[styles.feedbackButton]} 
                onPress={() => setShowFeedbackReview(true)}
              >
                <Text style={styles.feedbackButtonText}>View Feedback ({quizFeedback.length} wrong)</Text>
              </Pressable>
            )}
            <Pressable style={styles.closeButton} onPress={attemptLeave}>
              <Text style={styles.closeButtonText}>{t('game_ui.close_game') || 'Back to Games'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Feedback Review Modal */}
      <Modal visible={showFeedbackReview} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackReviewModal, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="note-text-outline" size={18} color={isDark ? '#E2E8F0' : '#1E293B'} style={{ marginRight: 8 }} />
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
              <Pressable style={styles.exitLeaveButton} onPress={() => { setAllowExit(true); setShowExitConfirm(false); router.replace('/games'); }}>
                <Text style={styles.exitLeaveButtonText}>{t('game_ui.exit_confirm_leave') || 'Exit'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  header: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  progressSection: {
    gap: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  challengeCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 20,
  },
  challengeHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  bugIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bugEmoji: {
    fontSize: 24,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  codeContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  codeHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  codeLine: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  lineNumber: {
    fontSize: 14,
    fontFamily: 'monospace',
    minWidth: 24,
    textAlign: 'right',
  },
  codeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1,
  },
  fixOptionsContainer: {
    gap: 12,
  },
  fixOptionsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  fixOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  fixOptionText: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 20,
  },
  resultsEmoji: {
    fontSize: 64,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  scoreCard: {
    alignItems: 'center',
    gap: 8,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '900',
    color: '#8B5CF6',
  },
  scoreSubtext: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  feedbackTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  feedbackText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  continueButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    marginTop: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackReviewModal: {
    width: '95%',
    maxWidth: 450,
    maxHeight: '80%',
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  feedbackReviewTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  feedbackReviewScroll: {
    maxHeight: 350,
  },
  feedbackItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  feedbackItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackItemExplanation: {
    fontSize: 13,
    lineHeight: 20,
  },
  feedbackCloseButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
  },
  feedbackCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  exitConfirmModal: {
    width: '90%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  exitConfirmTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  exitConfirmText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  exitConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  exitStayButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exitStayButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  exitLeaveButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exitLeaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
