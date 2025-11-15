import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { API_URL } from '../config';
import { IconSymbol } from './ui/icon-symbol';

export type Role = 'user' | 'gemini';

export interface Message {
  role: Role;
  text: string;
  timestamp: Date;
}

interface AIChatbotProps {
  visible: boolean;
  onClose: () => void;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const { token } = useAuth();

  useEffect(() => {
    if (visible) {
      // Add an initial greeting message from the bot
      setMessages([
        {
          role: 'gemini',
          text: "Hello! Saya adalah KP Bot. Sila Bertanya!",
          timestamp: new Date(),
        },
      ]);
      setError(null);
      setInput('');
    }
  }, [visible]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Send the user's message to our secure proxy endpoint
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Use the user's login token
        },
        body: JSON.stringify({
          message: currentInput
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from AI');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        role: 'gemini',
        text: data.text || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (e) {
      console.error('Failed to send message:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Sorry, something went wrong: ${errorMessage}`);
      // Optionally add an error message to the chat
      const errorBotMessage: Message = {
        role: 'gemini',
        text: `Error: Could not get a response. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.geminiMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.geminiMessageBubble,
            { backgroundColor: isUser ? '#007AFF' : (colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF') },
            !isUser && { borderColor: colorScheme === 'dark' ? '#444' : '#E0E0E0' },
          ]}
        >
           <Markdown style={{ body: { color: isUser ? '#FFFFFF' : (colorScheme === 'dark' ? '#FFFFFF' : '#000000'), fontSize: 16 } }}>
              {item.text}
           </Markdown>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#000000' : '#F5F5F5' }]}>
        <View style={[styles.header, { backgroundColor: colorScheme === 'dark' ? '#111' : '#FFFFFF', borderBottomColor: colorScheme === 'dark' ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.headerText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>Kod Pintar AI</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
          </Pressable>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => `${item.role}-${index}`}
            style={styles.messageList}
            contentContainerStyle={{ paddingBottom: 10 }}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <View style={[styles.inputContainer, { backgroundColor: colorScheme === 'dark' ? '#111' : '#FFFFFF', borderTopColor: colorScheme === 'dark' ? '#333' : '#E0E0E0' }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F0F0F0', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}
              value={input}
              onChangeText={setInput}
              placeholder="Type your message..."
              placeholderTextColor={colorScheme === 'dark' ? '#999' : '#999'}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendButton, (isLoading || !input.trim()) && styles.disabledButton]}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    padding: 10,
  },
  chatContainer: {
    flex: 1,
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  geminiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  userMessageBubble: {
    // backgroundColor is set dynamically
  },
  geminiMessageBubble: {
    // backgroundColor and borderColor are set dynamically
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
});

