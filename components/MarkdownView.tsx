import React, { useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme, Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface MarkdownViewProps {
  children: string;
}

// Function to auto-detect and convert URLs to markdown links
function autoLinkUrls(text: string): string {
  if (!text) return '';
  
  // URL pattern: matches http://, https://, www., and common domain patterns
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]()]+|www\.[^\s<>"{}|\\^`\[\]()]+|[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.([a-zA-Z]{2,})(\/[^\s<>"{}|\\^`\[\]()]*)?)/gi;
  
  const matches: Array<{ url: string; index: number; length: number }> = [];
  let match;
  
  // Find all URL matches
  while ((match = urlPattern.exec(text)) !== null) {
    const url = match[0];
    const index = match.index;
    
    // Check if already in markdown link format
    const before = index > 0 ? text.substring(Math.max(0, index - 2), index) : '';
    const after = index + url.length < text.length ? text.substring(index + url.length, index + url.length + 1) : '';
    
    // Skip if already a markdown link
    if (before.includes('](') || (before.includes('(') && after === ')')) {
      continue;
    }
    
    // Skip if inside code blocks
    const beforeText = text.substring(0, index);
    const codeBlockCount = (beforeText.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) continue; // Inside code block
    
    // Skip if inside inline code
    const inlineCodeBefore = (beforeText.match(/`/g) || []).length;
    const afterText = text.substring(index + url.length);
    const inlineCodeAfter = (afterText.match(/`/g) || []).length;
    if (inlineCodeBefore % 2 !== 0 && inlineCodeAfter % 2 === 0) {
      continue; // Inside inline code
    }
    
    matches.push({ url, index, length: url.length });
  }
  
  // Process matches in reverse order to maintain indices
  let result = text;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { url, index, length } = matches[i];
    
    // Add protocol if missing
    let fullUrl = url;
    if (!url.match(/^https?:\/\//i)) {
      fullUrl = 'https://' + url;
    }
    
    // Convert to markdown link format
    const markdownLink = `[${url}](${fullUrl})`;
    result = result.substring(0, index) + markdownLink + result.substring(index + length);
  }
  
  return result;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Preprocess text to auto-detect and convert URLs
  const processedText = useMemo(() => {
    if (!children) return '';
    return autoLinkUrls(children);
  }, [children]);

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

  return (
    <Markdown 
      style={markdownStyles}
      onLinkPress={(url) => {
        Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
        return false; // Return false to prevent default behavior
      }}
    >
      {processedText}
    </Markdown>
  );
};

