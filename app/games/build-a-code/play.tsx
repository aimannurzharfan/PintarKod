import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    BackHandler,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';

interface CodeBlock {
  id: number;
  code: string;
  order: number;
  displayOrder: number;
}

interface Challenge {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  title: { en: string; ms: string };
  scenario: { en: string; ms: string };
  expectedOutput: string;
  blocks: CodeBlock[];
  correctOrder: number[];
  basePoints: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BuildACodeGame() {
  const { token } = useAuth();
  const { i18n } = useTranslation();
  const router = useRouter();
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
  const [streak, setStreak] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  
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
    hintsUsed: number;
  }>>([]);

  const challenge = challenges[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Fetch quiz on mount
  useEffect(() => {
    fetchQuiz();
  }, [token]);

  // Initialize blocks for current challenge
  useEffect(() => {
    if (challenge) {
      setAvailableBlocks([...challenge.blocks]);
      setArrangedBlocks([]);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex, challenges]);

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
      setChallenges(data);
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

  // Use hint - show next correct block position
  const useHint = useCallback(() => {
    if (!challenge) return;
    
    setHintsUsed(prev => prev + 1);
    
    // Find the next block that should be placed
    const currentArrangedIds = arrangedBlocks.map(b => b.id);
    const nextCorrectId = challenge.correctOrder.find(id => !currentArrangedIds.includes(id));
    
    if (nextCorrectId) {
      const blockToAdd = availableBlocks.find(b => b.id === nextCorrectId);
      if (blockToAdd) {
        addBlock(blockToAdd);
      }
    }
  }, [challenge, arrangedBlocks, availableBlocks, addBlock]);

  // Submit current answer
  const handleSubmit = useCallback(async () => {
    if (!challenge || arrangedBlocks.length !== challenge.blocks.length) return;

    const userOrder = arrangedBlocks.map(b => b.id);
    const isAnswerCorrect = JSON.stringify(userOrder) === JSON.stringify(challenge.correctOrder);
    const timeForQuestion = Date.now() - questionStartTime;
    
    setIsCorrect(isAnswerCorrect);
    setShowFeedback(true);

    // Store answer
    setUserAnswers(prev => [...prev, {
      challenge,
      userOrder,
      timeMs: timeForQuestion,
      hintsUsed
    }]);

    // Update streak
    if (isAnswerCorrect) {
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    // Calculate score for this question
    if (isAnswerCorrect) {
      let points = challenge.basePoints;
      
      // Time bonus (under 30 seconds)
      if (timeForQuestion < 30000) {
        points += 20;
      }
      
      // Streak bonus
      const newStreak = streak + 1;
      if (newStreak >= 5) {
        points = Math.floor(points * 2);
      } else if (newStreak >= 3) {
        points = Math.floor(points * 1.5);
      }
      
      // Hint penalty
      points -= (hintsUsed * 30);
      points = Math.max(0, points);
      
      setTotalScore(prev => prev + points);
    }

    setHintsUsed(0); // Reset hints for next question
  }, [challenge, arrangedBlocks, questionStartTime, streak, hintsUsed]);

  // Continue to next question or submit quiz
  const handleContinue = useCallback(async () => {
    setShowFeedback(false);

    if (currentQuestionIndex < challenges.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
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
              isCorrect: JSON.stringify(a.userOrder) === JSON.stringify(a.challenge.correctOrder)
            })),
            totalTimeMs: Date.now() - startTime,
            gameType: 'BUILD_A_CODE_QUIZ',
            totalScore
          }),
        });

        const result = await response.json();
        if (result.feedback && result.feedback.length > 0) {
          setQuizFeedback(result.feedback);
        }
        setShowResults(true);
      } catch (error) {
        console.error('Submit error:', error);
        setShowResults(true);
      }
    }
  }, [currentQuestionIndex, challenges.length, userAnswers, token, startTime, totalScore]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#22C55E';
      case 'medium': return '#F59E0B';
      case 'hard': return '#EF4444';
      default: return '#8B5CF6';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return currentLang === 'ms' ? 'Mudah' : 'Easy';
      case 'medium': return currentLang === 'ms' ? 'Sederhana' : 'Medium';
      case 'hard': return currentLang === 'ms' ? 'Sukar' : 'Hard';
      default: return difficulty;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0A1628' : '#F1F5F9' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D9FF" />
          <Text style={[styles.loadingText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
            Loading Build-a-Code...
          </Text>
        </View>
      </View>
    );
  }

  if (!challenge) return null;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A1628' : '#F1F5F9' }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? '#0F1D32' : '#FFFFFF' }]}>
          <View style={styles.headerTop}>
            <Pressable style={styles.backButton} onPress={() => setShowExitConfirm(true)}>
              <Feather name="arrow-left" size={20} color="#00D9FF" />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Feather name="layers" size={22} color="#00D9FF" />
              <Text style={[styles.headerTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                Build-a-Code
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={[styles.questionNumber, { color: '#00D9FF' }]}>
                {currentQuestionIndex + 1} / {challenges.length}
              </Text>
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(challenge.difficulty) + '20' }]}>
                <Text style={[styles.difficultyText, { color: getDifficultyColor(challenge.difficulty) }]}>
                  {getDifficultyLabel(challenge.difficulty)}
                </Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${((currentQuestionIndex + 1) / challenges.length) * 100}%` }
                ]} 
              />
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="clock" size={14} color="#F59E0B" />
              <Text style={styles.statText}>{elapsedTime}s</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="zap" size={14} color="#A855F7" />
              <Text style={styles.statText}>Streak: {streak}</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="star" size={14} color="#00D9FF" />
              <Text style={styles.statText}>{totalScore} pts</Text>
            </View>
          </View>
        </View>

        {/* Challenge Card */}
        <View style={[styles.challengeCard, { backgroundColor: isDark ? '#0F1D32' : '#FFFFFF' }]}>
          <View style={styles.scenarioHeader}>
            <Feather name="target" size={20} color="#00D9FF" />
            <Text style={[styles.scenarioTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              {currentLang === 'ms' ? challenge.title.ms : challenge.title.en}
            </Text>
          </View>
          <Text style={[styles.scenarioText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {currentLang === 'ms' ? challenge.scenario.ms : challenge.scenario.en}
          </Text>
          <View style={[styles.outputPreview, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
            <Text style={styles.outputLabel}>Expected Output:</Text>
            <Text style={[styles.outputText, { color: '#22C55E' }]}>{challenge.expectedOutput}</Text>
          </View>
        </View>

        {/* Code Assembly Area */}
        <View style={[styles.assemblyCard, { backgroundColor: isDark ? '#0F1D32' : '#FFFFFF' }]}>
          <View style={styles.assemblyHeader}>
            <Feather name="code" size={18} color="#A855F7" />
            <Text style={[styles.assemblyTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Your Code ({arrangedBlocks.length}/{challenge.blocks.length})
            </Text>
            <Pressable 
              style={[styles.hintButton, hintsUsed >= 3 && styles.hintButtonDisabled]} 
              onPress={useHint}
              disabled={hintsUsed >= 3 || availableBlocks.length === 0}
            >
              <Feather name="help-circle" size={16} color={hintsUsed >= 3 ? '#64748B' : '#F59E0B'} />
              <Text style={[styles.hintText, { color: hintsUsed >= 3 ? '#64748B' : '#F59E0B' }]}>
                Hint (-30pts)
              </Text>
            </Pressable>
          </View>

          {/* Arranged Blocks */}
          <View style={styles.codeArea}>
            {arrangedBlocks.length === 0 ? (
              <View style={[styles.emptyArea, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <Feather name="arrow-down" size={24} color="#64748B" />
                <Text style={styles.emptyText}>Tap blocks below to add them here</Text>
              </View>
            ) : (
              arrangedBlocks.map((block, index) => (
                <View key={block.id} style={[styles.arrangedBlock, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <View style={styles.blockControls}>
                    <Pressable 
                      onPress={() => moveBlockUp(index)} 
                      style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                    >
                      <Feather name="chevron-up" size={16} color={index === 0 ? '#64748B' : '#00D9FF'} />
                    </Pressable>
                    <Text style={[styles.blockIndex, { color: isDark ? '#94A3B8' : '#64748B' }]}>{index + 1}</Text>
                    <Pressable 
                      onPress={() => moveBlockDown(index)}
                      style={[styles.moveButton, index === arrangedBlocks.length - 1 && styles.moveButtonDisabled]}
                    >
                      <Feather name="chevron-down" size={16} color={index === arrangedBlocks.length - 1 ? '#64748B' : '#00D9FF'} />
                    </Pressable>
                  </View>
                  <Text style={[styles.blockCode, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>{block.code}</Text>
                  <Pressable onPress={() => removeBlock(block)} style={styles.removeButton}>
                    <Feather name="x" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Available Blocks */}
        <View style={[styles.blocksCard, { backgroundColor: isDark ? '#0F1D32' : '#FFFFFF' }]}>
          <View style={styles.blocksHeader}>
            <Feather name="package" size={18} color="#10B981" />
            <Text style={[styles.blocksTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Available Blocks ({availableBlocks.length})
            </Text>
          </View>
          
          <View style={styles.blocksContainer}>
            {availableBlocks.map((block) => (
              <Pressable
                key={block.id}
                style={[styles.availableBlock, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                onPress={() => addBlock(block)}
              >
                <Text style={[styles.availableBlockCode, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>{block.code}</Text>
                <Feather name="plus-circle" size={18} color="#10B981" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            arrangedBlocks.length !== challenge.blocks.length && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={arrangedBlocks.length !== challenge.blocks.length}
        >
          <View style={styles.submitButtonContent}>
            <Feather name={currentQuestionIndex < challenges.length - 1 ? 'check' : 'flag'} size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {currentQuestionIndex < challenges.length - 1 ? 'Check Answer' : 'Finish'}
            </Text>
          </View>
        </Pressable>

      </ScrollView>

      {/* Feedback Modal */}
      <Modal visible={showFeedback} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackModal, { backgroundColor: isDark ? '#0F1D32' : '#FFFFFF' }]}>
            <View style={[styles.feedbackIcon, { backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
              <Feather name={isCorrect ? 'check-circle' : 'x-circle'} size={48} color={isCorrect ? '#22C55E' : '#EF4444'} />
            </View>
            <Text style={[styles.feedbackTitle, { color: isCorrect ? '#22C55E' : '#EF4444' }]}>
              {isCorrect ? 'Perfect!' : 'Not Quite!'}
            </Text>
            {streak >= 3 && isCorrect && (
              <View style={styles.streakBadge}>
                <Feather name="zap" size={16} color="#A855F7" />
                <Text style={styles.streakBadgeText}>{streak}x Streak Bonus!</Text>
              </View>
            )}
            <Pressable style={[styles.continueButton, { backgroundColor: isCorrect ? '#22C55E' : '#EF4444' }]} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>
                {currentQuestionIndex < challenges.length - 1 ? 'Next Challenge' : 'See Results'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Results Modal */}
      <Modal visible={showResults} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.resultsModal, { backgroundColor: isDark ? '#0F1D32' : '#FFFFFF' }]}>
            <View style={styles.resultsIcon}>
              <Feather name="award" size={48} color="#00D9FF" />
            </View>
            <Text style={[styles.resultsTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Code Master!
            </Text>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Total Score</Text>
              <Text style={styles.scoreValue}>{totalScore}</Text>
              <Text style={[styles.scoreSubtext, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {totalScore >= 800 ? 'Excellent!' : totalScore >= 600 ? 'Good Job!' : 'Keep Practicing!'}
              </Text>
            </View>
            {quizFeedback.length > 0 && (
              <Pressable style={styles.reviewButton} onPress={() => setShowFeedbackReview(true)}>
                <Feather name="file-text" size={16} color="#FFFFFF" />
                <Text style={styles.reviewButtonText}>Review Mistakes ({quizFeedback.length})</Text>
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
          <View style={[styles.reviewModal, { backgroundColor: isDark ? '#0F1D32' : '#FFFFFF' }]}>
            <Text style={[styles.reviewTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Review Your Mistakes
            </Text>
            <ScrollView style={styles.reviewScroll}>
              {quizFeedback.map((item, index) => (
                <View key={index} style={[styles.reviewItem, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                  <Text style={[styles.reviewItemTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                    {index + 1}. {item.title}
                  </Text>
                  <Text style={[styles.reviewItemText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {item.explanation}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.reviewCloseButton} onPress={() => setShowFeedbackReview(false)}>
              <Text style={styles.reviewCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal visible={showExitConfirm} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.exitModal, { backgroundColor: isDark ? '#0F1D32' : '#FFFFFF' }]}>
            <Feather name="alert-triangle" size={48} color="#F59E0B" />
            <Text style={[styles.exitTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>Leave Game?</Text>
            <Text style={[styles.exitText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              You'll lose your progress and points if you exit now.
            </Text>
            <View style={styles.exitButtons}>
              <Pressable style={styles.stayButton} onPress={() => setShowExitConfirm(false)}>
                <Text style={styles.stayButtonText}>Stay</Text>
              </Pressable>
              <Pressable style={styles.exitButton} onPress={() => { setShowExitConfirm(false); router.back(); }}>
                <Text style={styles.exitButtonText}>Exit</Text>
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
  header: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 217, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  progressSection: { gap: 8 },
  progressInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionNumber: { fontSize: 16, fontWeight: '700' },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  difficultyText: { fontSize: 12, fontWeight: '700' },
  progressBarContainer: { height: 6, backgroundColor: 'rgba(0, 217, 255, 0.15)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#00D9FF', borderRadius: 3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  
  // Challenge Card
  challengeCard: { borderRadius: 20, padding: 20, gap: 12 },
  scenarioHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scenarioTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  scenarioText: { fontSize: 14, lineHeight: 22 },
  outputPreview: { padding: 12, borderRadius: 12, marginTop: 4 },
  outputLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  outputText: { fontSize: 14, fontFamily: 'monospace', fontWeight: '600' },
  
  // Assembly Card
  assemblyCard: { borderRadius: 20, padding: 20, gap: 12 },
  assemblyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assemblyTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  hintButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  hintButtonDisabled: { opacity: 0.5 },
  hintText: { fontSize: 12, fontWeight: '600' },
  codeArea: { gap: 8, minHeight: 100 },
  emptyArea: { padding: 24, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: '#64748B' },
  arrangedBlock: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 10 },
  blockControls: { flexDirection: 'column', alignItems: 'center', gap: 2 },
  moveButton: { padding: 4 },
  moveButtonDisabled: { opacity: 0.3 },
  blockIndex: { fontSize: 12, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  blockCode: { flex: 1, fontSize: 13, fontFamily: 'monospace' },
  removeButton: { padding: 8 },
  
  // Blocks Card
  blocksCard: { borderRadius: 20, padding: 20, gap: 12 },
  blocksHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blocksTitle: { fontSize: 16, fontWeight: '700' },
  blocksContainer: { gap: 8 },
  availableBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1 },
  availableBlockCode: { flex: 1, fontSize: 13, fontFamily: 'monospace' },
  
  // Submit Button
  submitButton: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#00D9FF', shadowColor: '#00D9FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  submitButtonDisabled: { opacity: 0.5, backgroundColor: '#64748B' },
  submitButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  feedbackModal: { width: '90%', maxWidth: 380, borderRadius: 24, padding: 32, alignItems: 'center', gap: 16 },
  feedbackIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  feedbackTitle: { fontSize: 28, fontWeight: '800' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(168, 85, 247, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakBadgeText: { fontSize: 14, fontWeight: '700', color: '#A855F7' },
  continueButton: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  // Results Modal
  resultsModal: { width: '95%', maxWidth: 400, borderRadius: 24, padding: 32, alignItems: 'center', gap: 20 },
  resultsIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0, 217, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  resultsTitle: { fontSize: 28, fontWeight: '800' },
  scoreCard: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  scoreLabel: { fontSize: 14, fontWeight: '600', color: '#00D9FF' },
  scoreValue: { fontSize: 56, fontWeight: '900', color: '#00D9FF' },
  scoreSubtext: { fontSize: 16, fontWeight: '600' },
  reviewButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#A855F7', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, width: '100%', justifyContent: 'center' },
  reviewButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  closeButton: { backgroundColor: '#00D9FF', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  // Review Modal
  reviewModal: { width: '95%', maxWidth: 450, maxHeight: '80%', borderRadius: 24, padding: 24, gap: 16 },
  reviewTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  reviewScroll: { maxHeight: 350 },
  reviewItem: { padding: 16, borderRadius: 12, marginBottom: 12, gap: 8 },
  reviewItemTitle: { fontSize: 15, fontWeight: '700' },
  reviewItemText: { fontSize: 13, lineHeight: 20 },
  reviewCloseButton: { backgroundColor: '#00D9FF', borderRadius: 16, paddingVertical: 14, width: '100%', alignItems: 'center' },
  reviewCloseText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  // Exit Modal
  exitModal: { width: '90%', maxWidth: 380, borderRadius: 24, padding: 28, alignItems: 'center', gap: 12 },
  exitTitle: { fontSize: 24, fontWeight: '800' },
  exitText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  exitButtons: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  stayButton: { flex: 1, backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  stayButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  exitButton: { flex: 1, backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  exitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
