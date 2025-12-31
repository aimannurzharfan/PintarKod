import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function passwordScore(password: string) {
  if (!password) return 0;
  let score = 0;

  // Criteria
  const lengthOk = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  score += lengthOk ? 1 : 0;
  score += hasLower ? 1 : 0;
  score += hasUpper ? 1 : 0;
  score += hasNumber ? 1 : 0;
  score += hasSpecial ? 1 : 0;

  return score; // 0..5
}

export function passwordLabel(score: number) {
  if (score <= 1) return 'Very weak';
  if (score === 2) return 'Weak';
  if (score === 3) return 'Medium';
  if (score === 4) return 'Strong';
  return 'Very strong';
}

type Props = {
  password: string;
  minScore?: number; // for UI hinting, default 3
};

export default function PasswordStrength({ password, minScore = 3 }: Props) {
  const score = passwordScore(password);
  const label = passwordLabel(score);

  const segments = [0, 1, 2, 3, 4];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {segments.map((s) => {
          const active = score > s;
          return (
            <View
              key={s}
              style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}
            />
          );
        })}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.hint, score < minScore ? styles.hintWeak : null]}>
          {score < minScore ? 'Password is too weak' : 'Good password'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  segment: { height: 6, flex: 1, borderRadius: 3 },
  segmentInactive: { backgroundColor: '#E6EEF8' },
  segmentActive: { backgroundColor: '#2563EB' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  hint: { fontSize: 12, color: '#64748B' },
  hintWeak: { color: '#DC2626' },
});
