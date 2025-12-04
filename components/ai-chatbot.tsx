import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
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

interface ChatHistoryItem {
  id: number;
  message: string;
  response: string | null;
  createdAt: string;
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
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isConversationLoaded, setIsConversationLoaded] = useState(false);
  const messagesListRef = useRef<FlatList>(null);
  const colorScheme = useColorScheme();
  const { token } = useAuth();
  
  const screenWidth = Dimensions.get('window').width;
  const historyWidth = screenWidth * 0.45; // 45% of screen width

  // Fetch chat history when modal opens
  useEffect(() => {
    if (visible) {
      fetchChatHistory();
      // Only show greeting if no messages exist (fresh start)
      if (messages.length === 0) {
        setMessages([
          {
            role: 'gemini',
            text: "Hello! Saya adalah KP Bot. Sila Bertanya!",
            timestamp: new Date(),
          },
        ]);
      }
      setError(null);
      setShowHistory(false);
    }
  }, [visible]);

  // Reset conversation when modal closes
  useEffect(() => {
    if (!visible) {
      // Don't reset messages immediately - keep them for seamless continuation
      // Only reset when user explicitly wants to start new chat
      setInput('');
      setShowHistory(false);
      setError(null);
    }
  }, [visible]);

  const fetchChatHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_URL}/api/chat/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch chat history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadConversation = async (chatId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/chat/conversation/${chatId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Convert API messages to component Message format
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          role: msg.role as Role,
          text: msg.text,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(formattedMessages);
        setIsConversationLoaded(true); // Mark that a conversation is loaded
        setShowHistory(false);
        setError(null);
        
        // Auto-scroll to bottom when conversation is loaded
        setTimeout(() => {
          messagesListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    } catch (e) {
      console.error('Failed to load conversation:', e);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const formatHistoryDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      const options: Intl.DateTimeFormatOptions = { 
        month: 'short', 
        day: 'numeric'
      };
      if (date.getFullYear() !== today.getFullYear()) {
        options.year = 'numeric';
      }
      return date.toLocaleDateString('en-US', options);
    }
  };

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
    
    // Auto-scroll to bottom when user sends message
    setTimeout(() => {
      messagesListRef.current?.scrollToEnd({ animated: true });
    }, 100);

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
      
      // Auto-scroll to bottom after bot response
      setTimeout(() => {
        messagesListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Refresh chat history to include the new message
      fetchChatHistory();

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
        {!isUser && (
          <Image 
            source={require('@/assets/images/robot.png')} 
            style={styles.messageRobotAvatar}
            contentFit="contain"
          />
        )}
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
        {/* Top Header - Shown when history is visible */}
        {showHistory && (
          <View style={[styles.topHeader, { backgroundColor: colorScheme === 'dark' ? '#111' : '#FFFFFF', borderBottomColor: colorScheme === 'dark' ? '#333' : '#E0E0E0' }]}>
            <Pressable onPress={() => setShowHistory(!showHistory)} style={styles.menuButton}>
              <IconSymbol name="line.3.horizontal" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
            </Pressable>
            <Text style={[styles.headerText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>Kod Pintar AI</Text>
            <View style={styles.headerRightButtons}>
              <Pressable 
                onPress={() => {
                  setMessages([
                    {
                      role: 'gemini',
                      text: "Hello! Saya adalah KP Bot. Sila Bertanya!",
                      timestamp: new Date(),
                    },
                  ]);
                  setIsConversationLoaded(false);
                  setInput('');
                  setError(null);
                }} 
                style={styles.newChatButton}
              >
                <IconSymbol name="pencil" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </Pressable>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <IconSymbol name="xmark" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.mainLayout}>
          {/* History Sidebar - Persistent */}
          {showHistory && (
            <View style={[styles.historySidebar, { width: historyWidth, backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF', borderRightColor: colorScheme === 'dark' ? '#333' : '#E0E0E0' }]}>
              <View style={[styles.historyHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#E0E0E0' }]}>
                <Text style={[styles.historyTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>Sejarah Perbualan</Text>
              </View>
              <ScrollView style={styles.historyList}>
                {loadingHistory ? (
                  <View style={styles.historyLoadingContainer}>
                    <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                  </View>
                ) : chatHistory.length === 0 ? (
                  <View style={styles.historyEmptyContainer}>
                    <Text style={[styles.historyEmptyText, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                      No chat history yet
                    </Text>
                  </View>
                ) : (
                  chatHistory.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.historyItem, { 
                        backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5',
                        borderBottomColor: colorScheme === 'dark' ? '#333' : '#E0E0E0'
                      }]}
                      onPress={() => loadConversation(item.id)}
                    >
                      <Text
                        style={[styles.historyPreview, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}
                        numberOfLines={2}
                      >
                        {item.message || 'No message'}
                      </Text>
                      <Text style={[styles.historyDate, { color: colorScheme === 'dark' ? '#999' : '#666' }]}>
                        {formatHistoryDate(new Date(item.createdAt).toDateString())}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Main Chat Area */}
          <View style={[styles.chatArea, showHistory && styles.chatAreaWithHistory]}>
            {!showHistory && (
              <View style={[styles.header, { backgroundColor: colorScheme === 'dark' ? '#111' : '#FFFFFF', borderBottomColor: colorScheme === 'dark' ? '#333' : '#E0E0E0' }]}>
                <Pressable onPress={() => setShowHistory(!showHistory)} style={styles.menuButton}>
                  <IconSymbol name="line.3.horizontal" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                </Pressable>
                <Text style={[styles.headerText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>Kod Pintar AI</Text>
                <View style={styles.headerRightButtons}>
                  <Pressable 
                    onPress={() => {
                      setMessages([
                        {
                          role: 'gemini',
                          text: "Hello! Saya adalah KP Bot. Sila Bertanya!",
                          timestamp: new Date(),
                        },
                      ]);
                      setIsConversationLoaded(false);
                      setInput('');
                      setError(null);
                    }} 
                    style={styles.newChatButton}
                  >
                    <IconSymbol name="pencil" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                  </Pressable>
                  <Pressable onPress={onClose} style={styles.closeButton}>
                    <IconSymbol name="xmark" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                  </Pressable>
                </View>
              </View>
            )}
            
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.chatContainer}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
          <FlatList
            ref={messagesListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => `${item.role}-${index}`}
            style={styles.messageList}
            contentContainerStyle={{ paddingBottom: 10 }}
            onContentSizeChange={() => {
              // Auto-scroll to bottom when new content is added
              messagesListRef.current?.scrollToEnd({ animated: true });
            }}
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
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  chatArea: {
    flex: 1,
  },
  chatAreaWithHistory: {
    // Chat area takes remaining space when history is visible
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderBottomWidth: 1,
    height: 56,
    minHeight: 56,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderBottomWidth: 1,
    height: 56,
    minHeight: 56,
  },
  menuButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newChatButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  historySidebar: {
    flexShrink: 0,
    borderRightWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderBottomWidth: 1,
    height: 56,
    minHeight: 56,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyList: {
    flex: 1,
  },
  historyLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  historyEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  historyEmptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  historyItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  historyPreview: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  messageRobotAvatar: {
    width: 60,
    height: 60,
    marginBottom: 4,
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

