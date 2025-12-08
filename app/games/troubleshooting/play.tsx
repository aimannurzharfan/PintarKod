import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
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
  buggyLineIndex: number;
  explanation: { en: string; ms: string };
  basePoints: number;
}

export default function TroubleshootingGame() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Array<{
    challenge: Challenge;
    selectedLine: number;
  }>>([]);
  
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
        const response = await fetch(`${API_URL}/api/games/troubleshooting/quiz`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setChallenges(data);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };
    fetchQuiz();
  }, [token]);

  const handleSubmit = useCallback(async () => {
    if (selectedLine === null) return;

    const correct = selectedLine === challenge.buggyLineIndex;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      soundCorrect?.replayAsync()?.catch(() => {});
    } else {
      soundWrong?.replayAsync()?.catch(() => {});
    }

    const newAnswers = [...userAnswers, {
      challenge,
      selectedLine,
    }];
    setUserAnswers(newAnswers);
  }, [selectedLine, challenge, userAnswers, soundCorrect, soundWrong]);

  const handleContinue = useCallback(async () => {
    setShowFeedback(false);
    
    if (currentQuestionIndex < challenges.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedLine(null);
    } else {
      // Submit quiz - userAnswers now has all answers
      try {
        const response = await fetch(`${API_URL}/api/games/submit-quiz`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: userAnswers, // All answers included
            totalTimeMs: elapsedTime * 1000, // Convert to milliseconds
            gameType: 'TROUBLESHOOTING_QUIZ',
          }),
        });
        const result = await response.json();
        console.log('Troubleshooting result:', result);
        setTotalScore(result.totalScore || 0);
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
          <ActivityIndicator size="large" color="#F59E0B" />
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
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={{ fontSize: 20 }}>←</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              🔍 Bug Detective
            </Text>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Progress */}
          <View style={styles.progressSection}>
            <Text style={[styles.questionNumber, { color: '#F59E0B' }]}>
              Case {currentQuestionIndex + 1} of {challenges.length}
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
            <View style={styles.bugIcon}>
              <Text style={styles.bugEmoji}>🕵️</Text>
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
              <Text style={{ fontSize: 12 }}>📄</Text>
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
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                    borderLeftColor: '#F59E0B',
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

          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              selectedLine === null && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={selectedLine === null}
          >
            <Text style={styles.submitButtonText}>
              {currentQuestionIndex < challenges.length - 1 ? '✓ Submit Answer' : '🏁 Finish'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal visible={showFeedback} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackModal, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={{ fontSize: 64 }}>{isCorrect ? '✅' : '❌'}</Text>
            <Text style={[styles.feedbackTitle, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
              {isCorrect ? 'Correct!' : 'Wrong!'}
            </Text>
            <Text style={[styles.feedbackText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {currentLang === 'ms' ? challenge?.explanation.ms : challenge?.explanation.en}
            </Text>
            <Pressable style={[styles.continueButton, { backgroundColor: isCorrect ? '#10B981' : '#EF4444' }]} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>
                {currentQuestionIndex < challenges.length - 1 ? 'Next Case →' : 'See Results'}
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
              All Cases Solved!
            </Text>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={styles.scoreValue}>{totalScore}</Text>
              <Text style={[styles.scoreSubtext, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {totalScore >= 800 ? '🏆 Master Detective!' : totalScore >= 600 ? '👍 Good Work!' : '💪 Keep Investigating!'}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={() => router.back()}>
              <Text style={styles.closeButtonText}>Back to Games</Text>
            </Pressable>
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
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245, 158, 11, 0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  progressSection: { gap: 8 },
  questionNumber: { fontSize: 14, fontWeight: '700' },
  progressBarContainer: { height: 8, backgroundColor: 'rgba(245, 158, 11, 0.15)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 4 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginTop: 12 },
  timerText: { fontSize: 14, fontWeight: '700', color: '#F59E0B' },
  challengeCard: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, gap: 20 },
  challengeHeader: { flexDirection: 'row', gap: 12 },
  bugIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(245, 158, 11, 0.1)', alignItems: 'center', justifyContent: 'center' },
  bugEmoji: { fontSize: 24 },
  challengeTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  challengeDescription: { fontSize: 14, lineHeight: 20 },
  codeContainer: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(245, 158, 11, 0.05)' },
  codeHeaderText: { fontSize: 12, fontWeight: '600' },
  codeLine: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, gap: 12 },
  lineNumber: { fontSize: 14, fontFamily: 'monospace', minWidth: 24, textAlign: 'right' },
  codeText: { fontSize: 14, fontFamily: 'monospace', flex: 1 },
  submitButton: { backgroundColor: '#F59E0B', borderRadius: 16, paddingVertical: 18, alignItems: 'center', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  submitButtonDisabled: { backgroundColor: '#94A3B8', opacity: 0.5 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 32, alignItems: 'center', gap: 20 },
  resultsEmoji: { fontSize: 64 },
  resultsTitle: { fontSize: 28, fontWeight: '800' },
  scoreCard: { alignItems: 'center', gap: 8 },
  scoreLabel: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  scoreValue: { fontSize: 56, fontWeight: '900', color: '#F59E0B' },
  scoreSubtext: { fontSize: 16, fontWeight: '600' },
  closeButton: { backgroundColor: '#F59E0B', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%' },
  closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  feedbackModal: { width: '90%', maxWidth: 400, borderRadius: 24, padding: 32, alignItems: 'center', gap: 16 },
  feedbackTitle: { fontSize: 28, fontWeight: '800' },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  continueButton: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%', marginTop: 8 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
