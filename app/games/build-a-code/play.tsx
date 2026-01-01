import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
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
    View,
} from 'react-native';

interface CodeBlock {
  id: number;
  code: string;
  order: number;
  displayOrder: number;
}

interface Challenge {
  id: string;
  title: { en: string; ms: string };
  scenario: { en: string; ms: string };
  expectedOutput: string;
  blocks: CodeBlock[];
  correctOrder: number[];
  explanation: { en: string; ms: string };
  basePoints: number;
}

export default function BuildACodeGame() {
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const currentLang = i18n.language?.split('-')[0] || 'en';

  // Game state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  
  // User arrangement
  const [arrangedBlocks, setArrangedBlocks] = useState<CodeBlock[]>([]);
  const [availableBlocks, setAvailableBlocks] = useState<CodeBlock[]>([]);
  
  // Timer
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  
  // Feedback and exit
  const [quizFeedback, setQuizFeedback] = useState<Array<{ title: string; explanation: string }>>([]);
  const [showFeedbackReview, setShowFeedbackReview] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Answer tracking
  const [userAnswers, setUserAnswers] = useState<Array<{
    challenge: Challenge;
    userOrder: number[];
    timeMs: number;
  }>>([]);

  // Sound effects
  const [soundCorrect, setSoundCorrect] = useState<Audio.Sound | null>(null);
  const [soundWrong, setSoundWrong] = useState<Audio.Sound | null>(null);

  const challenge = challenges[currentQuestionIndex];

  // Set header title
  useEffect(() => {
    try {
      navigation.setOptions({
        headerTitle: t('game_ui.build_code_title') || 'Build-a-Code',
        headerBackTitleVisible: false,
      });
    } catch (err) {
      console.debug('Failed to set header title:', err);
    }
  }, [navigation, t]);

  // Timer effect
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

  // Fetch quiz on mount
  useEffect(() => {
    fetchQuiz();
  }, [token]);

  // Initialize blocks for current challenge
  useEffect(() => {
    if (challenge && challenge.blocks) {
      setAvailableBlocks([...challenge.blocks]);
      setArrangedBlocks([]);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex, challenges, challenge]);

  // Back button handler
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

  const fetchQuiz = async () => {
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/games/build-a-code/quiz`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch quiz');
      
      const data = await response.json();
      // Validate that challenges have required fields
      const validChallenges = Array.isArray(data) ? data.filter(c => 
        c && c.title && c.scenario && c.blocks && Array.isArray(c.blocks)
      ) : [];
      
      if (validChallenges.length === 0) {
        console.error('No valid challenges received');
        return;
      }
      
      setChallenges(validChallenges);
      setQuestionStartTime(Date.now());
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Move block from available to arranged
  const addBlock = useCallback((block: CodeBlock) => {
    setAvailableBlocks(prev => prev.filter(b => b.id !== block.id));
    setArrangedBlocks(prev => [...prev, block]);
  }, []);

  // Move block from arranged back to available
  const removeBlock = useCallback((block: CodeBlock) => {
    setArrangedBlocks(prev => prev.filter(b => b.id !== block.id));
    setAvailableBlocks(prev => [...prev, block].sort((a, b) => a.displayOrder - b.displayOrder));
  }, []);

  // Move block within arrangement
  const moveBlockUp = useCallback((index: number) => {
    if (index === 0) return;
    setArrangedBlocks(prev => {
      const newArr = [...prev];
      [newArr[index], newArr[index - 1]] = [newArr[index - 1], newArr[index]];
      return newArr;
    });
  }, []);

  const moveBlockDown = useCallback((index: number) => {
    setArrangedBlocks(prev => {
      if (index >= prev.length - 1) return prev;
      const newArr = [...prev];
      [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
      return newArr;
    });
  }, []);

  // Submit current answer
  const handleSubmit = useCallback(async () => {
    if (!challenge || !challenge.blocks || arrangedBlocks.length !== challenge.blocks.length) return;

    const userOrder = arrangedBlocks.map(b => b.id);
    const isAnswerCorrect = JSON.stringify(userOrder) === JSON.stringify(challenge.correctOrder);
    const timeForQuestion = Date.now() - questionStartTime;
    
    setIsCorrect(isAnswerCorrect);
    setShowFeedback(true);
    
    if (isAnswerCorrect) {
      soundCorrect?.replayAsync()?.catch(() => {});
    } else {
      soundWrong?.replayAsync()?.catch(() => {});
    }

    // Store answer (server will calculate score based on time)
    setUserAnswers(prev => [...prev, {
      challenge,
      userOrder,
      timeMs: timeForQuestion,
    }]);
  }, [challenge, arrangedBlocks, questionStartTime, soundCorrect, soundWrong]);

  // Continue to next question or submit quiz
  const handleContinue = useCallback(async () => {
    setShowFeedback(false);

    if (currentQuestionIndex < challenges.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now()); // Start timer for next question
    } else {
      // Submit final quiz results
      try {
        const response = await fetch(`${API_URL}/api/games/submit-quiz`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: userAnswers.map(a => ({
              challenge: a.challenge,
              userOrder: a.userOrder,
              timeMs: a.timeMs, // Include time per question
            })),
            totalTimeMs: Date.now() - startTime, // Total time for backward compatibility
            gameType: 'BUILD_A_CODE_QUIZ',
          }),
        });

        const result = await response.json();
        setTotalScore(result.totalScore || 0); // Use server-calculated score
        if (result.feedback && result.feedback.length > 0) {
          setQuizFeedback(result.feedback);
        }
        setShowResults(true);
      } catch (error) {
        console.error('Submit error:', error);
        setShowResults(true);
      }
    }
  }, [currentQuestionIndex, challenges.length, userAnswers, token, startTime]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
            {t('game_ui.loading') || 'Loading Build-a-Code...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!challenge || !challenge.title || !challenge.scenario || !challenge.blocks) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
            Loading challenge...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              🧩 Code Builder
            </Text>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Progress */}
          <View style={styles.progressSection}>
            <Text style={[styles.questionNumber, { color: '#10B981' }]}>
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
            <Text style={{ fontSize: 14 }}>⏱️</Text>
            <Text style={styles.timerText}>{elapsedTime}s</Text>
          </View>
        </View>

        {/* Challenge Card */}
        <View style={[styles.challengeCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.challengeHeader}>
            <View style={styles.iconWrapper}>
              <Text style={styles.iconEmoji}>📋</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.challengeTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                {challenge?.title ? (currentLang === 'ms' ? challenge.title.ms : challenge.title.en) : 'Challenge'}
              </Text>
              <Text style={[styles.challengeDescription, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {challenge?.scenario ? (currentLang === 'ms' ? challenge.scenario.ms : challenge.scenario.en) : 'Arrange the code blocks in the correct order.'}
              </Text>
            </View>
          </View>

          {/* Expected Output */}
          <View style={[styles.outputBox, { 
            backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          }]}>
            <Text style={[styles.outputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Expected Output:
            </Text>
            <Text style={[styles.outputText, { color: '#10B981' }]}>
              {challenge?.expectedOutput || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Code Assembly Area */}
        <View style={[styles.assemblyCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.assemblyHeader}>
            <Text style={[styles.assemblyTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              📝 Your Code ({arrangedBlocks.length}/{challenge?.blocks?.length || 0})
            </Text>
          </View>

          {/* Arranged Blocks */}
          <View style={styles.codeArea}>
            {arrangedBlocks.length === 0 ? (
              <View style={[styles.emptyArea, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <Text style={styles.emptyText}>Tap blocks below to build your code</Text>
              </View>
            ) : (
              arrangedBlocks.map((block, index) => (
                <View key={block.id} style={[styles.arrangedBlock, { 
                  backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                }]}>
                  <View style={styles.blockControls}>
                    <Pressable 
                      onPress={() => moveBlockUp(index)} 
                      style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                      disabled={index === 0}
                    >
                      <Text style={[styles.moveButtonText, { 
                        color: index === 0 ? '#64748B' : '#10B981' 
                      }]}>↑</Text>
                    </Pressable>
                    <Text style={[styles.blockIndex, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      {index + 1}
                    </Text>
                    <Pressable 
                      onPress={() => moveBlockDown(index)}
                      style={[styles.moveButton, index === arrangedBlocks.length - 1 && styles.moveButtonDisabled]}
                      disabled={index === arrangedBlocks.length - 1}
                    >
                      <Text style={[styles.moveButtonText, { 
                        color: index === arrangedBlocks.length - 1 ? '#64748B' : '#10B981' 
                      }]}>↓</Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.blockCode, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                    {block.code}
                  </Text>
                  <Pressable onPress={() => removeBlock(block)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>✕</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Available Blocks */}
        <View style={[styles.blocksCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.blocksHeader}>
            <Text style={[styles.blocksTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              🧱 Available Blocks ({availableBlocks.length})
            </Text>
          </View>
          
          <View style={styles.blocksContainer}>
            {availableBlocks.map((block) => (
              <Pressable
                key={block.id}
                style={({ pressed }) => [
                  styles.availableBlock, 
                  { 
                    backgroundColor: pressed 
                      ? (isDark ? '#0F172A' : '#F1F5F9')
                      : (isDark ? '#0F172A' : '#F8FAFC'),
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }
                ]}
                onPress={() => addBlock(block)}
              >
                <Text style={[styles.availableBlockCode, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                  {block.code}
                </Text>
                <Text style={styles.addIcon}>+</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            (!challenge?.blocks || arrangedBlocks.length !== challenge.blocks.length) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!challenge?.blocks || arrangedBlocks.length !== challenge.blocks.length}
        >
          <Text style={styles.submitButtonText}>
            {currentQuestionIndex < challenges.length - 1 ? '✓ Submit Answer' : '🏁 Finish Quiz'}
          </Text>
        </Pressable>

      </ScrollView>

      {/* Feedback Modal */}
      <Modal visible={showFeedback} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackModal, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={{ fontSize: 72 }}>{isCorrect ? '✅' : '❌'}</Text>
            <Text style={[styles.feedbackTitle, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
              {isCorrect ? 'Correct!' : 'Wrong!'}
            </Text>
            <Text style={[styles.feedbackText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {challenge?.explanation ? (currentLang === 'ms' ? challenge.explanation.ms : challenge.explanation.en) : 'Keep practicing!'}
            </Text>
            <Pressable 
              style={[styles.continueButton, { backgroundColor: isCorrect ? '#10B981' : '#EF4444' }]} 
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>
                {currentQuestionIndex < challenges.length - 1 ? 'Next Question →' : 'See Results'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Results Modal */}
      <Modal visible={showResults} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={styles.resultsEmoji}>🎉</Text>
            <Text style={[styles.resultsTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Code Builder Complete!
            </Text>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={[styles.scoreValue, { color: '#10B981' }]}>{totalScore}</Text>
              <Text style={[styles.scoreSubtext, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {totalScore >= 4000 ? '🌟 Excellent!' : totalScore >= 3000 ? '👍 Great Job!' : '💪 Keep Practicing!'}
              </Text>
            </View>
            {quizFeedback.length > 0 && (
              <Pressable 
                style={styles.feedbackButton} 
                onPress={() => setShowFeedbackReview(true)}
              >
                <Text style={styles.feedbackButtonText}>
                  📝 Review Mistakes ({quizFeedback.length})
                </Text>
              </Pressable>
            )}
            <Pressable style={styles.closeButton} onPress={() => router.back()}>
              <Text style={styles.closeButtonText}>Back to Games</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Feedback Review Modal */}
      <Modal visible={showFeedbackReview} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackReviewModal, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[styles.feedbackReviewTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              📚 Review Your Mistakes
            </Text>
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
            <Text style={{ fontSize: 48 }}>⚠️</Text>
            <Text style={[styles.exitConfirmTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Leave Game?
            </Text>
            <Text style={[styles.exitConfirmText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Your progress will be lost. Are you sure you want to exit?
            </Text>
            <View style={styles.exitConfirmButtons}>
              <Pressable style={styles.exitStayButton} onPress={() => setShowExitConfirm(false)}>
                <Text style={styles.exitStayButtonText}>Stay</Text>
              </Pressable>
              <Pressable style={styles.exitLeaveButton} onPress={() => { setShowExitConfirm(false); router.back(); }}>
                <Text style={styles.exitLeaveButtonText}>Exit</Text>
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
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
  
  // Header
  header: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  progressSection: { gap: 8 },
  questionNumber: { fontSize: 14, fontWeight: '700' },
  progressBarContainer: { height: 8, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginTop: 12 },
  timerText: { fontSize: 14, fontWeight: '700', color: '#F59E0B', marginLeft: 4 },
  
  // Challenge Card
  challengeCard: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, gap: 16 },
  challengeHeader: { flexDirection: 'row', gap: 12 },
  iconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 24 },
  challengeTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  challengeDescription: { fontSize: 14, lineHeight: 20 },
  outputBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  outputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  outputText: { fontSize: 16, fontFamily: 'monospace', fontWeight: '700' },
  
  // Assembly Card
  assemblyCard: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, gap: 12 },
  assemblyHeader: { marginBottom: 8 },
  assemblyTitle: { fontSize: 18, fontWeight: '700' },
  codeArea: { gap: 8, minHeight: 120 },
  emptyArea: { padding: 32, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  arrangedBlock: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  blockControls: { flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 32 },
  moveButton: { padding: 4 },
  moveButtonDisabled: { opacity: 0.3 },
  moveButtonText: { fontSize: 16, fontWeight: '700' },
  blockIndex: { fontSize: 12, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  blockCode: { flex: 1, fontSize: 13, fontFamily: 'monospace' },
  removeButton: { padding: 8 },
  removeButtonText: { fontSize: 18, color: '#EF4444', fontWeight: '700' },
  
  // Blocks Card
  blocksCard: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, gap: 12 },
  blocksHeader: { marginBottom: 8 },
  blocksTitle: { fontSize: 18, fontWeight: '700' },
  blocksContainer: { gap: 10 },
  availableBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1 },
  availableBlockCode: { flex: 1, fontSize: 13, fontFamily: 'monospace' },
  addIcon: { fontSize: 20, color: '#10B981', fontWeight: '700', marginLeft: 12 },
  
  // Submit Button
  submitButton: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 18, alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  submitButtonDisabled: { backgroundColor: '#94A3B8', opacity: 0.5 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  feedbackModal: { width: '90%', maxWidth: 400, borderRadius: 24, padding: 32, alignItems: 'center', gap: 16 },
  feedbackTitle: { fontSize: 28, fontWeight: '800' },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  continueButton: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%', marginTop: 8 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 32, alignItems: 'center', gap: 20 },
  resultsEmoji: { fontSize: 64 },
  resultsTitle: { fontSize: 28, fontWeight: '800' },
  scoreCard: { alignItems: 'center', gap: 8 },
  scoreLabel: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  scoreValue: { fontSize: 56, fontWeight: '900' },
  scoreSubtext: { fontSize: 16, fontWeight: '600' },
  feedbackButton: { backgroundColor: '#8B5CF6', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, width: '100%' },
  feedbackButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  closeButton: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%' },
  closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  
  feedbackReviewModal: { width: '95%', maxWidth: 450, maxHeight: '80%', borderRadius: 24, padding: 24, gap: 16 },
  feedbackReviewTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  feedbackReviewScroll: { maxHeight: 350 },
  feedbackItem: { padding: 16, borderRadius: 12, marginBottom: 12, gap: 8 },
  feedbackItemTitle: { fontSize: 15, fontWeight: '700' },
  feedbackItemExplanation: { fontSize: 13, lineHeight: 20 },
  feedbackCloseButton: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 14, width: '100%' },
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
