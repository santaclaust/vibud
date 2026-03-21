import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator } from 'react-native';
import { aiService } from '../services/AIService';

interface ModeOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const modeOptions: ModeOption[] = [
  { id: 'heal', name: '治愈模式', icon: '💚', description: 'AI陪伴，温暖倾听' },
  { id: 'treehole', name: '树洞模式', icon: '🌲', description: '匿名倾诉，不回复' },
  { id: 'consult', name: '心理咨询', icon: '📞', description: '专业引导，深度对话' },
  { id: 'record', name: '时光记录', icon: '📮', description: '记录当下，写给未来' },
  { id: 'draw', name: '治愈取签', icon: '🎴', description: '抽取签语，化解情绪' },
];

export default function ConfessionScreen({ navigation }: any) {
  const [text, setText] = useState('');
  const [selectedMode, setSelectedMode] = useState('heal');
  const [isModeSelectorVisible, setModeSelectorVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // 发送消息
  const handleSend = async () => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setText('');
    scrollToBottom();

    // 治愈模式和咨询模式需要AI回复
    if (selectedMode === 'heal' || selectedMode === 'consult') {
      setIsLoading(true);
      
      try {
        const response = await aiService.getResponse(
          userMessage.content, 
          selectedMode as 'heal' | 'consult'
        );
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.text,
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        scrollToBottom();
      } catch (error) {
        console.error('AI回复失败:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (selectedMode === 'treehole') {
      // 树洞模式不回复，只显示发送成功
      const successMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '你的倾诉已经安全地藏在树洞里了。谢谢你的信任。🌲',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, successMessage]);
      scrollToBottom();
    }
  };

  // 切换模式时清空对话
  const handleModeChange = (modeId: string) => {
    setSelectedMode(modeId);
    setModeSelectorVisible(false);
    setMessages([]);
  };

  // 渲染消息气泡
  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.role === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.role === 'user' ? styles.userMessageText : styles.assistantMessageText
        ]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* 顶部导航 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹ 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>倾诉</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* 模式选择器 */}
        <TouchableOpacity 
          style={styles.modeSelector}
          onPress={() => setModeSelectorVisible(!isModeSelectorVisible)}
        >
          <Text style={styles.modeSelectorText}>
            {modeOptions.find(m => m.id === selectedMode)?.icon} {modeOptions.find(m => m.id === selectedMode)?.name}
          </Text>
          <Text style={styles.chevron}>{isModeSelectorVisible ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* 模式选项 */}
        {isModeSelectorVisible && (
          <View style={styles.modeOptions}>
            {modeOptions.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeOption,
                  selectedMode === mode.id && styles.modeOptionSelected
                ]}
                onPress={() => handleModeChange(mode.id)}
              >
                <Text style={styles.modeOptionIcon}>{mode.icon}</Text>
                <View style={styles.modeOptionText}>
                  <Text style={styles.modeOptionName}>{mode.name}</Text>
                  <Text style={styles.modeOptionDesc}>{mode.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 对话区域 */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>
                {selectedMode === 'heal' ? '💚' : selectedMode === 'treehole' ? '🌲' : '📞'}
              </Text>
              <Text style={styles.emptyTitle}>
                {selectedMode === 'heal' ? '我在倾听' : selectedMode === 'treehole' ? '树洞听你说' : '让我们聊聊'}
              </Text>
              <Text style={styles.emptyDesc}>
                {selectedMode === 'healal' ? '分享你的心情，我会陪你' : '把想说的话说给树洞听'}
              </Text>
            </View>
          ) : (
            messages.map((msg) => (
              <View key={msg.id} style={[
                styles.messageContainer,
                msg.role === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer
              ]}>
                <View style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble
                ]}>
                  <Text style={[
                    styles.messageText,
                    msg.role === 'user' ? styles.userMessageText : styles.assistantMessageText
                  ]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))
          )}
          {isLoading && (
            <View style={[styles.messageContainer, styles.assistantMessageContainer]}>
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <ActivityIndicator size="small" color="#4A90E2" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* 输入区域 */}
        <View style={styles.inputArea}>
          <ScrollView style={styles.inputScroll} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.textInput}
              placeholder="写下你的心情..."
              placeholderTextColor="#999"
              multiline
              value={text}
              onChangeText={setText}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </ScrollView>

          {/* 底部操作栏 */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.voiceButton}>
              <Text style={styles.voiceIcon}>🎤</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sendButton, (!text.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>发送</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    fontSize: 16,
    color: '#4A90E2',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modeSelectorText: {
    fontSize: 15,
    color: '#333',
  },
  chevron: {
    fontSize: 12,
    color: '#999',
  },
  modeOptions: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modeOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  modeOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  modeOptionText: {
    flex: 1,
  },
  modeOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  modeOptionDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  chatArea: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 16,
  },
  chatContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#999',
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#4A90E2',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFF',
  },
  assistantMessageText: {
    color: '#333',
  },
  inputArea: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  inputScroll: {
    maxHeight: 120,
  },
  textInput: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    minHeight: 44,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceIcon: {
    fontSize: 20,
  },
  sendButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#B0D4F1',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
