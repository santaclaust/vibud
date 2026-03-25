import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { aiService } from '../services/AIService';
import { storageService } from '../services/StorageService';
import { saveEmotionLog, extractEmotionKeywords } from '../services/CloudBaseService';
import { notifyEmotionSaved } from '../services/CloudNotificationService';

interface ModeOption { id: string; name: string; icon: string; description: string; }
interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: number; }

const modeOptions: ModeOption[] = [
  { id: 'heal', name: '治愈模式', icon: '💚', description: 'AI陪伴，温暖倾听' },
  { id: 'treehole', name: '树洞模式', icon: '🌲', description: '匿名倾诉，不回复' },
  { id: 'consult', name: '心理咨询', icon: '📞', description: '专业引导，深度对话' },
  { id: 'record', name: '时光记录', icon: '📮', description: '记录当下，写给未来' },
  { id: 'draw', name: '治愈取签', icon: '🎴', description: '抽取签语，化解情绪' },
];

export default function ConfessionScreen({ navigation, colors: propsColors, goBack, userId }: any) {
  const defaultColors = { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#666666', border: '#E0E0E0', primary: '#4A90E2', card: '#FFFFFF' };
  const colors = propsColors || defaultColors;

  const s = {
    container: { flex: 1, backgroundColor: colors.background },
    header: { height: 44, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { fontSize: 16, color: colors.primary },
    title: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
    modeSelector: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    modeSelectorText: { fontSize: 15, color: colors.text, fontWeight: '500' as const },
    chevron: { fontSize: 12, color: colors.textSecondary },
    modeOptions: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    modeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    modeOptionSelected: { backgroundColor: colors.background },
    modeOptionIcon: { fontSize: 24, marginRight: 12 },
    modeOptionText: { flex: 1 },
    modeOptionName: { fontSize: 15, fontWeight: '500' as const, color: colors.text },
    modeOptionDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    chatArea: { flex: 1, backgroundColor: colors.background },
    chatContent: { padding: 16, paddingBottom: 100 },
    emptyState: { alignItems: 'center' as const, paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: colors.text, marginBottom: 8 },
    emptyDesc: { fontSize: 14, color: colors.textSecondary },
    messageContainer: { marginBottom: 12 },
    userMessageContainer: { alignItems: 'flex-end' as const },
    assistantMessageContainer: { alignItems: 'flex-start' as const },
    messageBubble: { maxWidth: '80%' as const, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
    userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    assistantBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
    messageText: { fontSize: 15, lineHeight: 22 },
    userMessageText: { color: '#FFF' },
    assistantMessageText: { color: colors.text },
    inputArea: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
    textInput: { marginHorizontal: 20, marginVertical: 12, padding: 12, backgroundColor: colors.background, borderRadius: 12, fontSize: 15, lineHeight: 22, color: colors.text, minHeight: 44 },
    sendButton: { flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center' as const, alignItems: 'center' as const },
    sendButtonDisabled: { backgroundColor: '#B0D4F1' },
    sendButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#FFF' },
    completionHint: { alignItems: 'center' as const, marginTop: 20, paddingVertical: 16, paddingHorizontal: 20, marginHorizontal: 20, backgroundColor: colors.background, borderRadius: 16 },
    completionHintText: { fontSize: 15, color: colors.textSecondary, marginBottom: 6 },
    completionKeywords: { fontSize: 13, color: colors.primary, fontWeight: '500' as const },
  };

  const [text, setText] = useState('');
  const [selectedMode, setSelectedMode] = useState('heal');
  const [isModeSelectorVisible, setModeSelectorVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompletionHint, setShowCompletionHint] = useState(false);
  const [emotionKeywords, setEmotionKeywords] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载草稿
  useEffect(() => { loadDraft(); }, []);
  useEffect(() => { return () => { if (text.trim()) saveDraft(); }; }, [text, selectedMode]);

  const loadDraft = async () => {
    const draft = await storageService.getConfessionDraft();
    if (draft) { setText(draft.text); setSelectedMode(draft.mode); }
  };

  const saveDraft = async () => {
    await storageService.saveConfessionDraft(text, selectedMode);
  };

  const scrollToBottom = () => { setTimeout(() => { scrollViewRef.current?.scrollToEnd({ animated: true }); }, 100); };

  const handleSend = async () => {
    if (!text.trim() || isLoading) return;
    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setShowCompletionHint(false);
    setText('');
    scrollToBottom();
    // 取消之前的自动保存计时器
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    if (selectedMode === 'heal' || selectedMode === 'consult') {
      setIsLoading(true);
      try {
        const response = await aiService.getResponse(userMessage.content, selectedMode as 'heal' | 'consult');
        const assistantMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.text, timestamp: Date.now() };
        setMessages(prev => [...prev, assistantMessage]);
        scrollToBottom();
        
        // AI回复后，启动60秒自动保存计时器
        autoSaveTimer.current = setTimeout(() => {
          triggerEmotionSave();
        }, 60000);
        
      } catch (error) { console.error('AI回复失败:', error); } 
      finally { setIsLoading(false); }
    } else if (selectedMode === 'treehole') {
      const successMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '你的倾诉已经安全地藏在树洞里了。谢谢你的信任。🌲', timestamp: Date.now() };
      setMessages(prev => [...prev, successMessage]);
      scrollToBottom();
    }
  };

  const handleModeChange = (modeId: string) => { setSelectedMode(modeId); setModeSelectorVisible(false); setMessages([]); setShowCompletionHint(false); };

  // 自动保存情绪关键词（静默）
  const triggerEmotionSave = async () => {
    if (messages.length === 0 || showCompletionHint) return;
    const uid = userId || 'guest';
    const fullText = messages.map(m => m.content).join('。');
    if (fullText.length < 5) return;
    
    try {
      const keywords = extractEmotionKeywords(fullText);
      await saveEmotionLog({
        userId: uid,
        keywords,
        textExcerpt: fullText.slice(0, 50),
        timestamp: Date.now(),
      });
      // 同时发送通知
      notifyEmotionSaved(keywords, uid);
      setEmotionKeywords(keywords);
      setShowCompletionHint(true);
    } catch (err) {
      console.error('保存情绪日志失败:', err);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[s.messageContainer, item.role === 'user' ? s.userMessageContainer : s.assistantMessageContainer]}>
      <View style={[s.messageBubble, item.role === 'user' ? s.userBubble : s.assistantBubble]}>
        <Text style={[s.messageText, item.role === 'user' ? s.userMessageText : s.assistantMessageText]}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => goBack()}><Text style={s.backButton}>‹ 返回</Text></TouchableOpacity>
          <Text style={s.title}>倾诉</Text>
          <View style={{ width: 50 }} />
        </View>
        <TouchableOpacity style={s.modeSelector} onPress={() => setModeSelectorVisible(!isModeSelectorVisible)}>
          <Text style={s.modeSelectorText}>{modeOptions.find(m => m.id === selectedMode)?.icon} {modeOptions.find(m => m.id === selectedMode)?.name}</Text>
          <Text style={s.chevron}>{isModeSelectorVisible ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {isModeSelectorVisible && (
          <View style={s.modeOptions}>
            {modeOptions.map((mode) => (
              <TouchableOpacity key={mode.id} style={[s.modeOption, selectedMode === mode.id && s.modeOptionSelected]} onPress={() => handleModeChange(mode.id)}>
                <Text style={s.modeOptionIcon}>{mode.icon}</Text>
                <View style={s.modeOptionText}><Text style={s.modeOptionName}>{mode.name}</Text><Text style={s.modeOptionDesc}>{mode.description}</Text></View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <ScrollView ref={scrollViewRef} style={s.chatArea} contentContainerStyle={s.chatContent} keyboardShouldPersistTaps="handled">
          {messages.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>{selectedMode === 'heal' ? '💚' : selectedMode === 'treehole' ? '🌲' : '📞'}</Text>
              <Text style={s.emptyTitle}>{selectedMode === 'heal' ? '我在倾听' : selectedMode === 'treehole' ? '树洞听你说' : '让我们聊聊'}</Text>
              <Text style={s.emptyDesc}>把想说的话说给{selectedMode === 'treehole' ? '树洞' : '我'}听</Text>
            </View>
          ) : (messages.map((msg) => renderMessage({ item: msg })))}
          {isLoading && <View style={[s.messageContainer, s.assistantMessageContainer]}><View style={[s.messageBubble, s.assistantBubble]}><ActivityIndicator size="small" color={colors.primary} /></View></View>}
          {showCompletionHint && (
            <View style={s.completionHint}>
              <Text style={s.completionHintText}>倾诉已完成 🌱</Text>
              {emotionKeywords.length > 0 && (
                <Text style={s.completionKeywords}>{emotionKeywords.join(' · ')}</Text>
              )}
            </View>
          )}
        </ScrollView>
        <View style={s.inputArea}>
          <ScrollView keyboardShouldPersistTaps="handled"><TextInput style={s.textInput} placeholder="写下你的心情..." placeholderTextColor="#999" multiline value={text} onChangeText={setText} textAlignVertical="top" editable={!isLoading} /></ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 }}>
            <TouchableOpacity style={[s.sendButton, (!text.trim() || isLoading) && s.sendButtonDisabled]} onPress={handleSend} disabled={!text.trim() || isLoading}>
              <Text style={s.sendButtonText}>{isLoading ? '发送中...' : '发送'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
