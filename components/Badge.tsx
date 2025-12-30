import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

type BadgeType = 'Champion' | 'RisingStar' | 'Student' | 'Teacher';

type BadgeProps = {
  badgeType: BadgeType | null | undefined;
  size?: 'small' | 'medium' | 'large';
};

export function Badge({ badgeType, size = 'small' }: BadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!badgeType) {
    return null;
  }

  // Map badge types to display labels
  const badgeLabels: Record<BadgeType, string> = {
    Champion: 'Champions',
    RisingStar: 'Rising Stars',
    Student: 'Student',
    Teacher: 'Teacher',
  };

  // Get badge styles based on type
  const getBadgeStyles = () => {
    switch (badgeType) {
      case 'Champion':
        return {
          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.15)',
          borderColor: isDark ? 'rgba(251, 191, 36, 0.4)' : 'rgba(251, 191, 36, 0.3)',
          textColor: '#FBBF24',
        };
      case 'RisingStar':
        return {
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
          borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)',
          textColor: '#3B82F6',
        };
      case 'Teacher':
        return {
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
          borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)',
          textColor: '#10B981',
        };
      case 'Student':
      default:
        return {
          backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.1)',
          borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.2)',
          textColor: isDark ? '#94A3B8' : '#64748B',
        };
    }
  };

  const badgeStyles = getBadgeStyles();
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  const paddingHorizontal = size === 'small' ? 6 : size === 'medium' ? 8 : 10;
  const paddingVertical = size === 'small' ? 3 : size === 'medium' ? 4 : 5;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeStyles.backgroundColor,
          borderColor: badgeStyles.borderColor,
          paddingHorizontal,
          paddingVertical,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: badgeStyles.textColor,
            fontSize,
          },
        ]}
      >
        {badgeLabels[badgeType]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
  },
});

