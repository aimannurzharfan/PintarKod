import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { API_URL } from '../../../config';

type LocalizedText = { en: string; ms: string };

type TroubleshootingChallenge = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  codeBlock: string; // multiline Java code
  buggyLineIndex: number; // 0-based
  explanation: LocalizedText;
  basePoints: number;
};

const variableNames = ['harga', 'jumlah', 'murid', 'umur', 'gaji', 'bil', 'markah', 'kadar'];
const scenarios = [
  'mengira jumlah harga kuih untuk jualan sekolah',
  'mengira purata markah murid',
  'memeriksa had laju dari input pengguna',
  'mengira bilangan barang yang dibeli',
  'mengira gaji bulanan selepas potongan',
];

function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function generateChallenge(index: number): TroubleshootingChallenge {
  // Choose a random type of bug from allowed Chapter 1 topics
  const bugTypes = ['off-by-one', 'missing-semicolon', 'type-mismatch', 'missing-break', 'division-by-zero', 'uninitialized', 'index-out-of-bounds'];
  const bug = rand(bugTypes);
  const varName = rand(variableNames);
  const scenario = rand(scenarios);
  const difficulty = Math.random() < 0.5 ? 'Easy' : 'Medium';
  const basePoints = difficulty === 'Easy' ? 10 : 20;

  // Build different code templates (simple Java) with 1 bug each
  if (bug === 'off-by-one') {
    // for loop off-by-one causing index out of bounds or missed item
    const arrName = varName + 'List';
    const values = [2, 5, 3, 4].map(String).join(', ');
    const code = `public class Main {
    public static void main(String[] args) {
        int[] ${arrName} = {${values}};
        int total = 0;
        for (int i = 0; i <= ${arrName}.length; i++) {
            total += ${arrName}[i];
        }
        System.out.println("Jumlah: " + total);
    }
}`;
    return {
      id: `ch-${uid()}`,
      title: { en: `Loop - ${scenario}`, ms: `Kawalan Ulangan - ${scenario}` },
      description: { en: `Should sum values in ${arrName}, but off-by-one/index error.`, ms: `Program sepatutnya mengira jumlah nilai dalam array ${arrName}, tetapi terdapat ralat off-by-one atau indeks luar had.` },
      codeBlock: code,
      buggyLineIndex: 4, // zero-based (for loop line)
      explanation: { en: 'Loop uses `i <= array.length` causing out-of-bounds access. Use `i < array.length`.', ms: 'Gelung menggunakan `i <= array.length` menyebabkan cuba akses indeks yang tidak wujud. Tukar kepada `i < array.length` untuk mengelakkan ArrayIndexOutOfBoundsException.' },
      basePoints,
    };
  }

  if (bug === 'missing-semicolon') {
    const code = `public class Main {
    public static void main(String[] args) {
        int ${varName} = 10
        System.out.println("Nilai: " + ${varName});
    }
}`;
    return {
      id: `ch-${uid()}`,
      title: { en: `Syntax - ${scenario}`, ms: `Ralat Sintaks - ${scenario}` },
      description: { en: `Should print variable ${varName} but missing semicolon causes syntax error.`, ms: `Program sepatutnya memaparkan nilai pembolehubah ${varName}, tetapi terdapat ralat sintaks.` },
      codeBlock: code,
      buggyLineIndex: 2, // missing semicolon line
      explanation: { en: `Missing semicolon at end of statement. Add ";" to fix.`, ms: `Titik koma hilang pada akhir pernyataan \`int ${varName} = 10;\`. Tambah ";" untuk membetulkan ralat sintaks.` },
      basePoints,
    };
  }

  if (bug === 'type-mismatch') {
    const code = `public class Main {
    public static void main(String[] args) {
        int ${varName} = "5";
        System.out.println(${varName} + 2);
    }
}`;
    return {
      id: `ch-${uid()}`,
      title: { en: `Data Type - ${scenario}`, ms: `Jenis Data - ${scenario}` },
      description: { en: `Should add numbers but wrong data type used.`, ms: `Program sepatutnya menambah nombor tetapi menggunakan jenis data yang salah.` },
      codeBlock: code,
      buggyLineIndex: 2,
      explanation: { en: 'Variable declared as int but assigned a string "5". Use `int var = 5;` or change type to String.', ms: 'Pembolehubah dideklarasikan sebagai `int` tetapi nilai diberikan sebagai string `"5"`. Gunakan `int ${varName} = 5;` atau tukar jenis kepada `String` jika mahu teks.' },
      basePoints,
    };
  }

  if (bug === 'missing-break') {
    const code = `public class Main {
    public static void main(String[] args) {
        int pilihan = 2;
        switch (pilihan) {
            case 1:
                System.out.println("Pilihan 1");
            case 2:
                System.out.println("Pilihan 2");
            default:
                System.out.println("Default");
        }
    }
}`;
    return {
      id: `ch-${uid()}`,
      title: { en: `Selection - ${scenario}`, ms: `Kawalan Pilihan - ${scenario}` },
      description: { en: 'Switch-case falls through due to missing break statements.', ms: `Program menggunakan switch tetapi kekal melompat ke kes lain kerana break hilang. Betulkan untuk mengelakkan output berlebihan.` },
      codeBlock: code,
      buggyLineIndex: 5,
      explanation: { en: 'Missing `break;` after case 1 causes fall-through. Add `break;` to stop execution from continuing to other cases.', ms: 'Ketiadaan `break;` dalam `case 1` menyebabkan eksekusi jatuh ke `case 2`. Tambah `break;` selepas `System.out.println("Pilihan 1");` untuk menghentikan jatuhan kes.' },
      basePoints,
    };
  }

  if (bug === 'division-by-zero') {
    const code = `public class Main {
    public static void main(String[] args) {
        int pembahagi = 0;
        int hasil = 10 / pembahagi;
        System.out.println("Hasil: " + hasil);
    }
}`;
    return {
      id: `ch-${uid()}`,
      title: { en: `Runtime Error - ${scenario}`, ms: `Ralat Masa Jalan - ${scenario}` },
      description: { en: 'Division by zero will cause runtime error.', ms: `Program membahagi dengan pembahagi yang bernilai 0, yang menyebabkan runtime error.` },
      codeBlock: code,
      buggyLineIndex: 3,
      explanation: { en: 'Divider is 0 causing ArithmeticException. Check divider before dividing.', ms: 'Pembahagi bernilai 0 menyebabkan `ArithmeticException` (division by zero). Periksa pembahagi sebelum operasi pembahagian atau pastikan ia bukan 0.' },
      basePoints,
    };
  }

  if (bug === 'uninitialized') {
    const code = `public class Main {
    public static void main(String[] args) {
        int ${varName};
        System.out.println(${varName});
    }
}`;
    return {
      id: `ch-${uid()}`,
      title: { en: `Uninitialized Variable - ${scenario}`, ms: `Pembolehubah Tidak Diisytiharkan Nilai - ${scenario}` },
      description: { en: 'Variable used before initialization.', ms: `Program cuba menggunakan pembolehubah yang belum diinisialisasi.` },
      codeBlock: code,
      buggyLineIndex: 3,
      explanation: { en: 'Variable must be initialized before use, e.g. `int var = 0;`.', ms: 'Pembolehubah perlu diinisialisasi sebelum digunakan, contohnya `int ${varName} = 0;`.' },
      basePoints,
    };
  }

  // index-out-of-bounds
  const arrName = varName + 'Arr';
  const code = `public class Main {
    public static void main(String[] args) {
        int[] ${arrName} = {1, 2, 3};
        System.out.println(${arrName}[3]);
    }
}`;
  return {
    id: `ch-${uid()}`,
    title: { en: `Array & Index - ${scenario}`, ms: `Array & Indeks - ${scenario}` },
    description: { en: 'Accessing an index outside array bounds.', ms: `Program cuba akses indeks yang tiada dalam array, menyebabkan ArrayIndexOutOfBoundsException.` },
    codeBlock: code,
    buggyLineIndex: 3,
    explanation: { en: 'Max index is 2 for array {1,2,3}. Use index 2 or check length before access.', ms: 'Indeks maksimum untuk array {1,2,3} ialah 2. Akses `${arrName}[2]` atau semak panjang array sebelum mengakses.' },
    basePoints,
  };
}

export default function TroubleshootingScreen() {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [challenges, setChallenges] = useState<TroubleshootingChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ id: string; challenge: TroubleshootingChallenge; selectedLine: number; correct: boolean; points: number }>>([]);
  const [showResult, setShowResult] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [serverResult, setServerResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [correctSound, setCorrectSound] = useState<any | null>(null);
  const [wrongSound, setWrongSound] = useState<any | null>(null);

  useEffect(() => {
    // generate 10 random challenges
    const generated: TroubleshootingChallenge[] = [];
    for (let i = 0; i < 10; i++) {
      generated.push(generateChallenge(i));
    }
    setChallenges(generated);
    setStartTime(Date.now());
    setIsLoading(false);
  }, []);

  // Timer effect - update every 100ms
  useEffect(() => {
    if (showResult || isLoading) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, showResult, isLoading]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return `${totalSeconds}s`;
  }, []);

  const current = challenges[currentIndex];
  const codeLines = useMemo(() => current?.codeBlock.split('\n') || [], [current]);

  if (isLoading || !current) {
    return (
      <ThemedView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Memuatkan...</Text>
        </View>
      </ThemedView>
    );
  }

  const handleSelectLine = (index: number) => {
    setSelectedLine(index);
  };

  const handleNext = async () => {
    if (selectedLine === null) {
      Alert.alert('Pilih satu baris', 'Sila pilih baris kod yang anda fikir mengandungi ralat.');
      return;
    }
    const isCorrect = selectedLine === current.buggyLineIndex;
    const points = isCorrect ? current.basePoints : 0;

    const newAnswer = { id: current.id, challenge: current, selectedLine: selectedLine!, correct: isCorrect, points };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    // Reset selection and move on
    setSelectedLine(null);

    const isLast = currentIndex + 1 >= challenges.length;
    if (!isLast) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    // Submit to server
    try {
      const totalTimeMs = Date.now() - startTime;
      const lang = i18n.language?.split('-')[0] || 'en';

      const payloadAnswers = newAnswers.map((a) => ({ challenge: a.challenge, selectedLine: a.selectedLine }));

      if (!token) {
        // If no token, just show local result
        setShowResult(true);
        return;
      }

      const res = await fetch(`${API_URL}/api/games/submit-quiz?lang=${lang}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: payloadAnswers, totalTimeMs, gameType: 'TROUBLESHOOTING_QUIZ' }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Submit error', data);
        Alert.alert('Ralat', 'Gagal menghantar skor ke pelayan. Menunjukkan keputusan secara tempatan.');
        setShowResult(true);
        return;
      }

      setServerResult(data);
      setShowResult(true);
    } catch (err) {
      console.error('Submission failed', err);
      Alert.alert('Ralat', 'Ralat rangkaian semasa menghantar keputusan. Menunjukkan keputusan secara tempatan.');
      setShowResult(true);
    }
  };

  const totalPoints = answers.reduce((s, a) => s + a.points, 0);
  const correctCount = answers.filter((a) => a.correct).length;
  const currentLang: 'en' | 'ms' = (i18n.language?.split('-')[0] === 'ms' ? 'ms' : 'en');

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.progressContainer, { backgroundColor: 'rgba(59, 130, 246, 0.05)' }]}>
          <Text style={styles.progressText}>{`Soalan ${currentIndex + 1} / ${challenges.length}`}</Text>
          <Text style={styles.progressText}>{formatTime(elapsedTime)}</Text>
        </View>

        <View style={styles.header}>
          <ThemedText type="title">{t('game_ui.troubleshooting_title')}</ThemedText>
          <Text style={styles.subtitle}>{current.title[currentLang]}</Text>
          <Text style={styles.description}>{current.description[currentLang]}</Text>
        </View>

        <View style={styles.codeContainer}>
          {codeLines.map((line, i) => {
            const isSelected = selectedLine === i;
            return (
              <Pressable key={i} onPress={() => handleSelectLine(i)} style={[styles.codeLine, isSelected ? styles.selectedLine : null]}>
                <Text style={styles.lineNumber}>{i + 1}</Text>
                <Text style={styles.codeText}>{line.replace(/\t/g, '    ')}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>{currentIndex + 1 === challenges.length ? 'Selesai' : 'Seterusnya'}</Text>
          </Pressable>
        </View>

        {showResult && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Keputusan</Text>
            <Text style={styles.resultText}>Betul: {correctCount} / {challenges.length}</Text>
            <Text style={styles.resultText}>Mata: {totalPoints}</Text>

            <View style={styles.feedbackList}>
              {challenges.map((c, idx) => {
                const ans = answers[idx];
                const wasCorrect = ans?.correct;
                return (
                  <View key={c.id} style={styles.feedbackItem}>
                    <Text style={styles.feedbackQ}>{idx + 1}. {c.title[currentLang]}</Text>
                    <Text style={styles.feedbackA}>Jawapan anda: Baris { (answers[idx]?.selectedLine ?? -1) + 1 }</Text>
                    <Text style={styles.feedbackA}>{wasCorrect ? 'Betul' : 'Salah'}</Text>
                    <Text style={styles.feedbackExplain}>{c.explanation[currentLang]}</Text>
                  </View>
                );
              })}
            </View>

            <Pressable onPress={() => router.back()} style={styles.doneButton}>
              <Text style={styles.doneText}>Kembali</Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  content: { paddingBottom: 40 },
  header: { marginBottom: 12 },
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 8, marginBottom: 8 },
  progressText: { color: '#0F172A', fontWeight: '600' },
  subtitle: { fontSize: 16, color: '#374151', marginTop: 4 },
  description: { color: '#6B7280', marginTop: 6 },
  progress: { marginTop: 6, color: '#4B5563' },
  codeContainer: { backgroundColor: '#0F172A10', borderRadius: 8, padding: 8, marginTop: 12 },
  codeLine: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center' },
  selectedLine: { backgroundColor: '#60A5FA22' },
  lineNumber: { width: 28, color: '#6B7280' },
  codeText: { fontFamily: 'monospace', color: '#0F172A' },
  actions: { marginTop: 16, alignItems: 'center' },
  nextButton: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  nextButtonText: { color: '#fff', fontWeight: '600' },
  resultBox: { marginTop: 24, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8 },
  resultTitle: { fontSize: 18, fontWeight: '700' },
  resultText: { marginTop: 6 },
  feedbackList: { marginTop: 8 },
  feedbackItem: { marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 6 },
  feedbackQ: { fontWeight: '600' },
  feedbackA: { marginTop: 4 },
  feedbackExplain: { marginTop: 6, color: '#6B7280' },
  doneButton: { marginTop: 12, backgroundColor: '#10B981', padding: 10, borderRadius: 6, alignItems: 'center' },
  doneText: { color: '#fff', fontWeight: '700' },
});
