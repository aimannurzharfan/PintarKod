import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export function passwordScore(password: string) {
  if (!password) return 0;
  let score = 0;

  // Criteria: Only capital, lowercase, and numbers
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  score += hasLower ? 1 : 0;
  score += hasUpper ? 1 : 0;
  score += hasNumber ? 1 : 0;

  return score; // 0..3
}

export function passwordCompliant(password: string) {
  if (!password) return false;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  // Good password: has all 3 requirements
  return hasLower && hasUpper && hasNumber;
}

export function passwordLabel(score: number) {
  if (score === 0) return 'Very weak';
  if (score === 1) return 'Weak';
  if (score === 2) return 'Medium';
  return 'Good'; // score === 3
}

type Props = {
  password: string;
  minScore?: number; // for UI hinting, default 3
};

export default function PasswordStrength({ password, minScore = 3 }: Props) {
  const { t } = useTranslation();
  const score = passwordScore(password);
  const label = passwordLabel(score);

  // If empty, don't render anything
  if (!password) return null;

  const compliant = passwordCompliant(password);
  const segments = [0, 1, 2]; // 3 segments for 3 criteria

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {segments.map((s) => {
          const active = score > s;
          const isGood = compliant && score > s;
          return (
            <View
              key={s}
              style={[
                styles.segment,
                active
                  ? isGood
                    ? styles.segmentGood
                    : styles.segmentActive
                  : styles.segmentInactive,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.label, !compliant ? styles.labelWeak : styles.labelGood]}>{label}</Text>
        {!compliant ? (
          <Text style={[styles.hint, styles.hintWeak, styles.requirementText]}>{t('common.password_requirements')}</Text>
        ) : (
          <Text style={[styles.hint, styles.hintGood]}>{t('common.password_good', 'Good password')}</Text>
        )}
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
  segmentGood: { backgroundColor: '#10B981' }, // Green for good password
  metaRow: { flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  labelWeak: { color: '#DC2626' },
  labelGood: { color: '#10B981' },
  hint: { fontSize: 12, color: '#64748B' },
  hintWeak: { color: '#DC2626' },
  hintGood: { color: '#10B981' },
  requirementText: { marginTop: 2 }
});