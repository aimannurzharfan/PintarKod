import React, { useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface MarkdownViewProps {
  children: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const markdownStyles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: isDark ? '#F8FAFC' : '#0F172A',
          fontSize: 15,
          lineHeight: 22,
        },
        code_inline: {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          color: isDark ? '#FBBF24' : '#DC2626',
          paddingHorizontal: 4,
          paddingVertical: 2,
          borderRadius: 4,
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontSize: 14,
        },
        code_block: {
          backgroundColor: '#1E1E1E',
          color: '#D4D4D4',
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontSize: 13,
          padding: 10,
          borderRadius: 8,
          marginVertical: 8,
          overflow: 'hidden',
        },
        fence: {
          backgroundColor: '#1E1E1E',
          color: '#D4D4D4',
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontSize: 13,
          padding: 10,
          borderRadius: 8,
          marginVertical: 8,
          overflow: 'hidden',
        },
        paragraph: {
          marginVertical: 4,
        },
        heading1: {
          fontSize: 24,
          fontWeight: '700',
          color: isDark ? '#F8FAFC' : '#0F172A',
          marginTop: 16,
          marginBottom: 8,
        },
        heading2: {
          fontSize: 20,
          fontWeight: '700',
          color: isDark ? '#F8FAFC' : '#0F172A',
          marginTop: 14,
          marginBottom: 6,
        },
        heading3: {
          fontSize: 18,
          fontWeight: '600',
          color: isDark ? '#F8FAFC' : '#0F172A',
          marginTop: 12,
          marginBottom: 6,
        },
        strong: {
          fontWeight: '700',
          color: isDark ? '#F8FAFC' : '#0F172A',
        },
        em: {
          fontStyle: 'italic',
        },
        link: {
          color: '#3B82F6',
          textDecorationLine: 'underline',
        },
        list_item: {
          marginVertical: 2,
        },
        bullet_list: {
          marginVertical: 4,
        },
        ordered_list: {
          marginVertical: 4,
        },
      }),
    [isDark]
  );

  return <Markdown style={markdownStyles}>{children}</Markdown>;
};

