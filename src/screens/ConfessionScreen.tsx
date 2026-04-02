import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, Dimensions } from 'react-native';
const { width: screenWidth } = Dimensions.get('window');
import { unifiedEmotionService } from '../services/UnifiedEmotionService';
import { storageService } from '../services/StorageService';
import { chatMemory } from '../services/ChatMemoryManager';
import { feedbackService } from '../services/FeedbackService';
import { buildFinalPrompt } from '../utils/PromptBuilder';
import { UserProfile } from '../types';
import { saveEmotionLog, extractEmotionKeywords, getRecentEmotionLogs, saveConversationRating, addDocument, getUserEmotionProfile, createUserEmotionProfile, updateUserEmotionProfile } from '../services/CloudBaseService';

interface ModeOption { id: string; name: string; icon: string; description: string; }
interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: number; displayText?: string; isTyping?: boolean; rating?: number; }
interface MessageRating { messageId: string; rating: number; }

const modeOptions: ModeOption[] = [
  { id: 'heal', name: '治愈模式', icon: '💚', description: 'AI陪伴,温暖倾听' },
  { id: 'treehole', name: '树洞模式', icon: '🌲', description: '匿名倾诉,不回复' },
  { id: 'consult', name: '心理咨询', icon: '📞', description: '专业引导,深度对话' },
  { id: 'record', name: '时光记录', icon: '📮', description: '记录当下,写给未来' },
  { id: 'draw', name: '治愈取签', icon: '🎴', description: '抽取签语,化解情绪' },
];

export default function ConfessionScreen({ navigation, colors: propsColors, goBack, userId }: any) {
  const defaultColors = { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#666666', border: '#E0E0E0', primary: '#4A90E2', card: '#FFFFFF', danger: '#E53935' };
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
    crisisBubble: { backgroundColor: colors.danger || '#E53935', borderBottomLeftRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 22 },
    userMessageText: { color: '#FFF' },
    assistantMessageText: { color: colors.text },
    crisisMessageText: { color: '#FFF', fontWeight: '500' as const },
    inputArea: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
    textInput: { marginHorizontal: 20, marginVertical: 12, padding: 12, backgroundColor: colors.background, borderRadius: 12, fontSize: 15, lineHeight: 22, color: colors.text, minHeight: 44 },
    sendButton: { flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center' as const, alignItems: 'center' as const },
    sendButtonDisabled: { backgroundColor: '#B0D4F1' },
    sendButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#FFF' },
    completionHint: { alignItems: 'center' as const, marginTop: 20, paddingVertical: 16, paddingHorizontal: 20, marginHorizontal: 20, backgroundColor: colors.background, borderRadius: 16 },
    completionHintText: { fontSize: 15, color: colors.textSecondary, marginBottom: 6 },
    completionKeywords: { fontSize: 13, color: colors.primary, fontWeight: '500' as const },
    guidanceIndicator: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    // 评价相关样式
    ratingContainer: { flexDirection: 'row', marginTop: 6, gap: 8 },
    ratingButton: { paddingHorizontal: 4, paddingVertical: 2 },
    ratingThumbUp: { fontSize: 18, opacity: 0.5 },
    ratingThumbUpActive: { opacity: 1 },
    ratingThumbDown: { fontSize: 18, opacity: 0.5 },
    ratingThumbDownActive: { opacity: 1 },
    // 会话结束评价弹窗
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: colors.card, borderRadius: 16, padding: 24, marginHorizontal: 16, width: screenWidth - 32, maxWidth: 400 },
    modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 16 },
    modalStars: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
    modalStar: { fontSize: 32, marginHorizontal: 6 },
    modalStarActive: { color: '#FFD700' },
    modalStarInactive: { color: '#DDD' },
    modalTextInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text, minHeight: 60, textAlignVertical: 'top', marginBottom: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    modalButtonCancel: { backgroundColor: colors.background, marginRight: 8 },
    modalButtonSubmit: { backgroundColor: colors.primary },
    modalButtonText: { fontSize: 15, fontWeight: '500' },
    modalButtonTextCancel: { color: colors.textSecondary },
    modalButtonTextSubmit: { color: '#FFF' },
    // 简洁版评价样式
    modalSimpleContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
    modalSimpleButton: { padding: 16, marginHorizontal: 8, borderRadius: 12, backgroundColor: colors.background },
    modalSimpleButtonActive: { backgroundColor: '#E8F5E9' },
    modalSimpleEmoji: { fontSize: 36 },
  };

  const [text, setText] = useState('');
  const [selectedMode, setSelectedMode] = useState('heal');
  const [isModeSelectorVisible, setModeSelectorVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompletionHint, setShowCompletionHint] = useState(false);
  const [emotionKeywords, setEmotionKeywords] = useState<string[]>([]);
  const [isCrisis, setIsCrisis] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 评价相关状态
  const [sessionId] = useState(() => 'sess_' + Date.now()); // 会话ID
  const [messageRatings, setMessageRatings] = useState<MessageRating[]>([]); // 每条AI回复的评价
  const [showEndRatingModal, setShowEndRatingModal] = useState(false); // 会话结束评价弹窗
  const [showHistoryModal, setShowHistoryModal] = useState(false); // 历史记录弹窗
  const [showDetailModal, setShowDetailModal] = useState(false); // 详情弹窗
  const [selectedHistory, setSelectedHistory] = useState<any>(null); // 选中的历史记录
  const [chatHistoryList, setChatHistoryList] = useState<any[]>([]);
  const [continuedSessionId, setContinuedSessionId] = useState<string | null>(null); // 继续对话的原始sessionId
  const [editingName, setEditingName] = useState<string | null>(null); // 当前编辑的名称
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 删除确认弹窗
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null); // 待删除的sessionId
  const [endRating, setEndRating] = useState(0); // 星级 0-5
  const [endRatingText, setEndRatingText] = useState(''); // 文字反馈
  const [hasEndedSession, setHasEndedSession] = useState(false); // 是否已结束会话
  const [isDraftLoaded, setIsDraftLoaded] = useState(false); // 草稿是否已加载

  // 加载草稿(仅首次加载)
  useEffect(() => {
    loadDraft().then(() => setIsDraftLoaded(true));
    chatMemory.init();
    // 加载历史记录
    storageService.getChatHistoryList().then(list => setChatHistoryList(list));
    // 初始化用户画像
    initUserProfile();
  }, []);

  // 初始化用户画像
  const initUserProfile = async () => {
    const uid = userId || 'guest';
    try {
      let profile = await getUserEmotionProfile(uid);
      if (!profile) {
        profile = await createUserEmotionProfile(uid);
        console.log('[Confession] 创建新用户画像:', uid);
      } else {
        console.log('[Confession] 加载用户画像:', uid, profile.emotionProfile?.dominantEmotions);
      }
    } catch (e) {
      console.log('[Confession] 用户画像初始化失败:', e);
    }
  };

  // 发送消息后清空草稿,否则保存草稿(草稿加载后才生效)
  useEffect(() => {
    if (!isDraftLoaded) return;

    if (!text.trim()) {
      storageService.clearConfessionDraft();
    } else {
      saveDraft();
    }
  }, [text, selectedMode, isDraftLoaded]);

  const loadDraft = async () => {
    const draft = await storageService.getConfessionDraft();
    if (draft) { setText(draft.text); setSelectedMode(draft.mode); }
  };

  const saveDraft = async () => {
    await storageService.saveConfessionDraft(text, selectedMode);
  };
  
  // 自动保存对话到本地（监听消息变化，2秒防抖）
  useEffect(() => {
    if (messages.length > 0 && !hasEndedSession && isDraftLoaded) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(async () => {
        const chatHistory = {
          sessionId,
          timestamp: Date.now(),
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          })),
          rating: 0,
          feedback: null,
          wasRated: false,
        };
        await storageService.saveChatHistory(chatHistory);
        console.log('[Confession] 自动保存对话');
      }, 2000);
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [messages, hasEndedSession, sessionId, isDraftLoaded]);
  
  const scrollToBottom = () => { setTimeout(() => { scrollViewRef.current?.scrollToEnd({ animated: true }); }, 100); };

  const handleSend = async () => {
    if (!text.trim() || isLoading) return;
    const userMessageContent = text.trim();
    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: userMessageContent, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setShowCompletionHint(false);
    setText('');
    scrollToBottom();

    // 记录到记忆管理器
    chatMemory.addMessage('user', userMessageContent);

    // 取消之前的自动保存计时器
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }

    if (selectedMode === 'heal' || selectedMode === 'consult') {
      setIsLoading(true);
      setIsCrisis(false);

      try {
        const uid = userId || 'guest';

        // 获取对话记忆包
        const memoryPackage = chatMemory.getUploadPackage();

        // 获取用户风格偏好
        const userStyle = await feedbackService.getUserStyle();

        // 构建最优Prompt
        const prompt = buildFinalPrompt({
          systemBase: '',
          profile: chatMemory.getProfile(),
          stage: 2,
          recentMessages: memoryPackage.recentMessages,
          currentMessage: userMessageContent,
          feedbackAnalysis: userStyle,
        });

        const result = await unifiedEmotionService.processMessage(
          userMessageContent,
          uid,
          selectedMode as 'heal' | 'consult',
          memoryPackage.recentMessages,
          memoryPackage.summary,
          prompt
        );

        // 添加空的 AI 消息占位
        const tempId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
          id: tempId,
          role: 'assistant',
          content: result.response,
          displayText: '',
          isTyping: true,
          timestamp: Date.now()
        }]);
        scrollToBottom();

        // 记录AI回复到记忆管理器
        chatMemory.addMessage('assistant', result.response);

        // 打字效果(词组模式,更自然流畅)
        const fullText = result.response;

        // 智能分词:将文本按语义停顿分割成词组
        const segmentText = (text: string): string[] => {
          const segments: string[] = [];
          let current = '';
          const punctuation = /[,。、!?;:""''()]/;

          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            current += char;

            // 遇到标点立即截断
            if (punctuation.test(char)) {
              segments.push(current);
              current = '';
            }
            // 遇到连接词或助词,作为自然停顿点
            else if (['但', '是', '不', '过', '而', '且', '因', '为', '所', '以', '如', '果'].includes(char) && current.length >= 4) {
              if (i < text.length - 1 && !punctuation.test(text[i + 1])) {
                segments.push(current);
                current = '';
              }
            }
          }
          if (current) segments.push(current);
          return segments.filter(s => s.length > 0);
        };

        const segments = segmentText(fullText);
        let displayedText = '';

        // 开头轻微延迟
        await new Promise(resolve => setTimeout(resolve, 200));

        for (const segment of segments) {
          displayedText += segment;
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, displayText: displayedText } : m
          ));
          scrollToBottom();

          // 标点后稍长停顿
          if (/[,。!?]/.test(segment.slice(-1))) {
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 100));
          }
          // 普通词组,短暂停顿
          else {
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 60));
          }
        }

        // 打字完成
        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, displayText: fullText, isTyping: false } : m
        ));

        // 更新危机状态
        setIsCrisis(result.isCrisis);

        // 如果需要更多信息,显示提示
        if (result.needsMoreInfo) {
          const profile = result.profile;
          const profileInfo = profile ? unifiedEmotionService.getProfile(uid) : null;
          if (profileInfo && profileInfo.rounds > 1) {
            setShowCompletionHint(true);
          }
        }

        // AI回复后,启动自动保存计时器(1分钟间隔)
        autoSaveTimer.current = setTimeout(() => {
          triggerEmotionSave();
        }, 60000);

      } catch (error) {
        console.error('AI回复失败:', error);
      }
      finally { setIsLoading(false); }
    } else if (selectedMode === 'treehole') {
      const successMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '你的倾诉已经安全地藏在树洞里了。谢谢你的信任。🌲', timestamp: Date.now() };
      setMessages(prev => [...prev, successMessage]);
      scrollToBottom();
    }
  };

  const handleModeChange = (modeId: string) => {
    setSelectedMode(modeId);
    setModeSelectorVisible(false);
    setMessages([]);
    setShowCompletionHint(false);
    setIsCrisis(false);
    // 清除用户画像
    if (userId) {
      unifiedEmotionService.clearProfile(userId);
    }
    // 清空对话记忆（同步到云端）
    chatMemory.syncToCloud(uid).catch(e => console.log('[Confession] 云同步失败:', e));
    chatMemory.clear();
    // 重置评价状态
    setMessageRatings([]);
    setShowEndRatingModal(false);
    setEndRating(0);
    setEndRatingText('');
    setHasEndedSession(false);
  };

  // 手动触发情绪保存
  const triggerEmotionSave = async () => {
    if (messages.length === 0) return;
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
      console.log('[Confession] 情绪日志已静默保存');
    } catch (err) {
      console.error('保存情绪日志失败:', err);
    }
  };

  // ===== 评价功能 =====

  // 对单条AI消息进行评价(👍 或 👎)
  const handleMessageRating = async (messageId: string, isPositive: boolean) => {
    const uid = userId || 'guest';
    const rating = isPositive ? 5 : 1; // 👍=5星, 👎=1星

    // 更新本地状态
    setMessageRatings(prev => {
      const existing = prev.find(r => r.messageId === messageId);
      if (existing) {
        return prev.map(r => r.messageId === messageId ? { ...r, rating } : r);
      }
      return [...prev, { messageId, rating }];
    });

    // 更新消息显示
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, rating } : m
    ));

    // 保存到后端
    try {
      await saveConversationRating({
        userId: uid,
        sessionId,
        messageId,
        rating,
        isSessionEnd: false,
      });

      // ========== 保存反馈到 FeedbackService ==========
      const aiMsg = messages.find(m => m.id === messageId);
      const msgIndex = messages.findIndex(m => m.id === messageId);
      const userMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;

      if (aiMsg && userMsg) {
        await feedbackService.saveFeedback({
          messageId,
          sessionId,
          userMessage: userMsg.content,
          aiResponse: aiMsg.content,
          rating: rating as 1 | 2 | 3 | 4 | 5,
          timestamp: Date.now(),
          context: {
            stage: 2,
            profile: chatMemory.getProfileForSync() || undefined,
            recentMessages: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
          },
        });

        // 每3条反馈自动生成用户风格
        const allFeedbacks = await feedbackService.getAllFeedbacks();
        if (allFeedbacks.length % 3 === 0 && allFeedbacks.length >= 3) {
          const analysis = await feedbackService.generateUserStyle(sessionId);
          if (analysis) {
            console.log('[Feedback] 用户风格已更新:', analysis.preferPhrases, analysis.avoidPhrases);
          }
        }
      }

      console.log('[Rating] 已评价:', messageId, isPositive ? '👍' : '👎');
    } catch (err) {
      console.error('保存评价失败:', err);
    }
  };

  // 结束会话并弹出评价
  const handleEndConversation = () => {
    setHasEndedSession(true);
    setShowEndRatingModal(true);
  };

  // 提交会话结束评价
  const submitEndRating = async () => {
    if (endRating === 0) {
      Alert.alert('请评价', '给你回应点个赞吧');
      return;
    }

    const uid = userId || 'guest';
    const isPositive = endRating >= 3;

    try {
      // 1. 保存会话结束评价
      await saveConversationRating({
        userId: uid,
        sessionId,
        rating: endRating,
        feedback: endRatingText.trim() || undefined,
        isSessionEnd: true,
      });

      // 保存之前收集的单条评价
      for (const mr of messageRatings) {
        await saveConversationRating({
          userId: uid,
          sessionId,
          messageId: mr.messageId,
          rating: mr.rating,
          isSessionEnd: false,
        });
      }

      // 2. 根据评价保存对话历史到本地和云端(无论好评差评都保存)
      if (messages.length > 0) {
        // 分离好评和差评
        const positiveRatings = messageRatings.filter(r => r.rating >= 3);
        const negativeRatings = messageRatings.filter(r => r.rating > 0 && r.rating < 3);

        // 构建消息映射
        const msgMap = new Map(messages.map(m => [m.id, m]));

        // 保存会话摘要到本地(无论好评差评或不点评价都保存)
        const chatHistory = {
          sessionId,
          timestamp: Date.now(),
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          })),
          rating: endRating || (isPositive ? 5 : (isNegative ? 1 : 0)), // 有评价用评价值,否则根据单条评推断
          feedback: endRatingText.trim() || null,
          wasRated: endRating > 0, // 是否主动评价过
        };
        await storageService.saveChatHistory(chatHistory);

        // 好评摘要存云端
        if (isPositive) {
          const userMsgs = messages.filter(m => m.role === 'user').map(m => m.content).join(';');
          const aiMsgs = messages.filter(m => m.role === 'assistant').map(m => m.content).join(';');

          await addDocument('session_summaries_positive', {
            id: 'pos_' + Date.now(),
            userId: uid,
            sessionId,
            userMessages: userMsgs.slice(0, 500),
            aiResponses: aiMsgs.slice(0, 1000),
            rating: endRating,
            timestamp: Date.now(),
            emotionTags: extractEmotionKeywords(userMsgs).join(','),
          });
        }

        // 保存差评详情(用于分析优化)
        if (negativeRatings.length > 0) {
          for (const nr of negativeRatings) {
            const aiMsg = msgMap.get(nr.messageId);
            if (!aiMsg) continue;

            // 找到该AI回复的上下文(前一条用户消息)
            const aiIndex = messages.findIndex(m => m.id === nr.messageId);
            const prevUserMsg = aiIndex > 0 ? messages[aiIndex - 1] : null;

            // 差评详情
            await addDocument('session_summaries_negative', {
              id: 'neg_' + Date.now(),
              userId: uid,
              sessionId,
              userMessageBefore: prevUserMsg?.content || '',
              aiResponse: aiMsg.content,
              rating: nr.rating,
              timestamp: Date.now(),
            });
          }
        }

        // 总会话差评:整个会话存入 negative
        if (!isPositive) {
          await addDocument('session_summaries_negative', {
            id: 'neg_full_' + Date.now(),
            userId: uid,
            sessionId,
            type: 'full_session',
            userMessages: messages.filter(m => m.role === 'user').map(m => m.content),
            aiResponses: messages.filter(m => m.role === 'assistant').map(m => m.content),
            rating: endRating,
            feedback: endRatingText.trim() || null,
            timestamp: Date.now(),
          });
        }

        // 无论好评差评都保存总会话摘要(用于统计)
        const userMsgs = messages.filter(m => m.role === 'user').map(m => m.content).join(';');
        const aiMsgs = messages.filter(m => m.role === 'assistant').map(m => m.content).join(';');

        await addDocument('session_summaries_all', {
          id: 'sum_' + Date.now(),
          userId: uid,
          sessionId,
          userMessages: userMsgs.slice(0, 500),
          aiResponses: aiMsgs.slice(0, 1000),
          rating: endRating,
          feedback: endRatingText.trim() || null,
          timestamp: Date.now(),
          emotionTags: extractEmotionKeywords(userMsgs).join(','),
        });

        console.log('[Confession] 会话数据已分类保存,好评', isPositive ? '👍' : '👎', '差评数:', negativeRatings.length);

        // 6. 同步用户画像到云端(增添式)
        try {
          const uid = userId || 'guest';

          // 获取本地画像
          const localProfile = chatMemory.getProfileForSync();
          const cloudProfile = await getUserEmotionProfile(uid);

          if (localProfile) {
            // 增添式同步:将本地新增的四要素合并到云端
            const mergedProfile = cloudProfile || {};

            // 合并数组字段(去重,保留最多10个)
            const mergeArray = (local: string[], cloud: string[]): string[] => {
              return [...new Set([...(cloud || []), ...(local || [])])].slice(0, 10);
            };

            // 合并字符串字段(取较长的)
            const mergeString = (local: string, cloud: string): string => {
              return (local && local.length > (cloud?.length || 0)) ? local : (cloud || '');
            };

            // 构建同步数据
            const syncData: any = {
              userId: uid,
              // 核心四要素:增添式合并
              people: mergeArray(localProfile.people || [], mergedProfile.people || []),
              events: mergeArray(localProfile.events || [], mergedProfile.events || []),
              emotion: mergeArray(localProfile.emotion || [], mergedProfile.emotion || []),
              // 时间线:保留较长的
              time: mergeString(localProfile.time || '', mergedProfile.time || ''),
              currentState: mergeString(localProfile.currentState || '', mergedProfile.currentState || ''),
              needs: mergeArray(localProfile.needs || [], mergedProfile.needs || []),
              worry: mergeArray(localProfile.worry || [], mergedProfile.worry || []),
              personality: mergeString(localProfile.personality || '', mergedProfile.personality || ''),
              chatStyle: mergeString(localProfile.chatStyle || '', mergedProfile.chatStyle || ''),
            };

            if (cloudProfile) {
              // 更新云端(合并)
              await updateUserEmotionProfile(uid, syncData);
            } else {
              // 创建云端画像
              await addDocument('user_profiles', syncData);
            }

            console.log('[Confession] 用户画像已同步到云端',
              '情绪:', syncData.emotion?.length,
              '人物:', syncData.people?.length,
              '事件:', syncData.events?.length);
          }  // 结束 if (localProfile)

          // 7. 同步用户风格到云端
          const userStyle = await feedbackService.getUserStyle();
          if (userStyle) {
            await feedbackService.syncStyleToCloud(userStyle, uid);
          }
        } catch (e) {
          console.log('[Confession] 用户画像同步失败:', e);
        }
      }

      // 5. 清空记忆（同步到云端）
      chatMemory.syncToCloud(uid).catch(e => console.log('[Confession] 云同步失败:', e));
      chatMemory.clear();

      console.log('[Confession] 评价已保存,会话结束', isPositive ? '👍' : '👎');
    } catch (err) {
      console.error('保存会话评价失败:', err);
    }

    setShowEndRatingModal(false);
    // 重置对话
    setMessages([]);
    setMessageRatings([]);
    setEndRating(0);
    setEndRatingText('');
    setHasEndedSession(false);
  };

  // 简洁版评价选择(👍👎)
  const handleSimpleRating = (rating: number) => {
    setEndRating(rating);
  };

  // 关闭评价弹窗(不评价)
  const closeEndRatingModal = () => {
    setShowEndRatingModal(false);
    // 仍然重置对话
    setMessages([]);
    setMessageRatings([]);
    setEndRating(0);
    setEndRatingText('');
    setHasEndedSession(false);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isCrisisMsg = !isUser && messages.filter(m => m.role === 'user').length > 0 &&
                        messages[messages.indexOf(item) - 1]?.content.includes('心理援助热线');

    // 打字效果:优先显示 displayText,否则显示 content
    const displayContent = item.displayText ?? item.content;

    // 当前消息的评价状态
    const currentRating = messageRatings.find(r => r.messageId === item.id)?.rating || item.rating || 0;
    const isPositive = currentRating >= 3;
    const isNegative = currentRating > 0 && currentRating < 3;

    return (
      <View key={item.id || index} style={[s.messageContainer, isUser ? s.userMessageContainer : s.assistantMessageContainer]}>
        <View style={[
          s.messageBubble,
          isUser ? s.userBubble : (isCrisisMsg ? s.crisisBubble : s.assistantBubble)
        ]}>
          <Text style={[s.messageText, isUser ? s.userMessageText : (isCrisisMsg ? s.crisisMessageText : s.assistantMessageText)]}>
            {displayContent}
          </Text>
        </View>

        {/* AI消息的评价按钮 👍👎 */}
        {!isUser && !item.isTyping && (
          <View style={s.ratingContainer}>
            <TouchableOpacity
              style={s.ratingButton}
              onPress={() => handleMessageRating(item.id, true)}
            >
              <Text style={[s.ratingThumbUp, isPositive && s.ratingThumbUpActive]}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.ratingButton}
              onPress={() => handleMessageRating(item.id, false)}
            >
              <Text style={[s.ratingThumbDown, isNegative && s.ratingThumbDownActive]}>👎</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // 获取模式提示
  const getModeHint = () => {
    if (isCrisis) return '危机干预模式已启动';
    const profile = userId ? unifiedEmotionService.getProfile(userId) : null;
    if (profile && profile.rounds > 1) {
      const stage = profile.conversationStage || 'INITIAL';
      const hints: Record<string, string> = {
        INITIAL: '正在了解你的情况...',
        EXPLORE: '正在深入探索...',
        INSIGHT: '正在帮你整理思绪...',
        CLOSING: '对话即将结束',
      };
      return hints[stage] || '正在倾听...';
    }
    return null;
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={async () => {
            // 如果有对话内容且未结束,自动保存
            if (messages.length > 0 && !hasEndedSession) {
              const chatHistory = {
                sessionId: continuedSessionId || sessionId, // 继续对话时用原sessionId
                timestamp: Date.now(),
                messages: messages.map(m => ({
                  role: m.role,
                  content: m.content,
                  timestamp: m.timestamp
                })),
                rating: 0,
                feedback: null,
                wasRated: false, // 未评价
              };
              await storageService.saveChatHistory(chatHistory);
              // 刷新历史记录
              storageService.getChatHistoryList().then(list => setChatHistoryList(list));
              console.log('[Confession] 退出自动保存对话', continuedSessionId ? '替换原记录' : '新建记录');
            }
            goBack();
          }}><Text style={s.backButton}>‹ 返回</Text></TouchableOpacity>
          <Text style={s.title}>倾诉</Text>
          <TouchableOpacity onPress={() => setShowHistoryModal(true)}><Text style={s.backButton}>📜</Text></TouchableOpacity>
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
          ) : (messages.map((msg) => renderMessage({ item: msg, index: messages.indexOf(msg) })))}

          {isLoading && (
            <View style={[s.messageContainer, s.assistantMessageContainer]}>
              <View style={[s.messageBubble, s.assistantBubble]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[s.assistantMessageText, { marginLeft: 8 }]}>
                    {getModeHint() || '正在思考...'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
        <View style={s.inputArea}>
          {/* 会话结束按钮 */}
          {messages.length > 0 && !hasEndedSession && (
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}
              onPress={handleEndConversation}
            >
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '500' }}>❤️ 结束对话并评价</Text>
            </TouchableOpacity>
          )}
          <ScrollView keyboardShouldPersistTaps="handled"><TextInput style={s.textInput} placeholder="写下你的心情..." placeholderTextColor="#999" multiline value={text} onChangeText={setText} textAlignVertical="top" editable={!isLoading} /></ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 }}>
            <TouchableOpacity style={[s.sendButton, (!text.trim() || isLoading) && s.sendButtonDisabled]} onPress={handleSend} disabled={!text.trim() || isLoading}>
              <Text style={s.sendButtonText}>{isLoading ? '发送中...' : '发送'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 会话结束评价弹窗 */}
        <Modal visible={showEndRatingModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>这次对话感觉怎么样?</Text>

              {/* 简洁评价:👍👎 */}
              <View style={s.modalSimpleContainer}>
                <TouchableOpacity
                  style={[s.modalSimpleButton, endRating === 5 && s.modalSimpleButtonActive]}
                  onPress={() => handleSimpleRating(5)}
                >
                  <Text style={s.modalSimpleEmoji}>👍</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalSimpleButton, endRating === 1 && s.modalSimpleButtonActive]}
                  onPress={() => handleSimpleRating(1)}
                >
                  <Text style={s.modalSimpleEmoji}>👎</Text>
                </TouchableOpacity>
              </View>

              {/* 文字反馈(可选) */}
              <TextInput
                style={s.modalTextInput}
                placeholder="有什么想说的...(可选)"
                placeholderTextColor="#999"
                value={endRatingText}
                onChangeText={setEndRatingText}
                multiline
              />

              {/* 按钮 */}
              <View style={s.modalButtons}>
                <TouchableOpacity style={[s.modalButton, s.modalButtonCancel]} onPress={closeEndRatingModal}>
                  <Text style={[s.modalButtonText, s.modalButtonTextCancel]}>跳过</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalButton, s.modalButtonSubmit]} onPress={submitEndRating} disabled={endRating === 0}>
                  <Text style={[s.modalButtonText, s.modalButtonTextSubmit]}>提交</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 历史记录弹窗 */}
        <Modal visible={showHistoryModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { maxHeight: '70%' }]}>
              <Text style={s.modalTitle}>倾诉历史</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {chatHistoryList.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>暂无历史记录</Text>
                ) : (
                  chatHistoryList.map((history, index) => (
                    <View key={history.sessionId || index} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                        setSelectedHistory(history);
                        setShowDetailModal(true);
                      }}>
                        <Text style={{ fontSize: 14, color: colors.text }}>
                          {history.customName || new Date(history.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          {' '}
                          {history.messages?.filter((m: any) => m.role === 'user').length || 0} 条对话
                          {history.wasRated === false && ' 📋'}
                          {history.rating >= 3 && history.wasRated !== false && ' 😊'}
                          {history.rating > 0 && history.rating < 3 && ' 😔'}
                        </Text>
                      </TouchableOpacity>
                      {/* 标注/改名按钮 */}
                      <TouchableOpacity style={{ padding: 8 }} onPress={() => {
                        setSelectedHistory(history);
                        setEditingName(history.sessionId);
                      }}>
                        <Text style={{ fontSize: 18 }}>✏️</Text>
                      </TouchableOpacity>
                      {/* 删除按钮 */}
                      <TouchableOpacity style={{ padding: 8 }} onPress={() => {
                        setDeletingSessionId(history.sessionId);
                        setShowDeleteConfirm(true);
                      }}>
                        <Text style={{ fontSize: 18 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity style={[s.modalButton, s.modalButtonCancel]} onPress={() => setShowHistoryModal(false)}>
                <Text style={[s.modalButtonText, s.modalButtonTextCancel]}>关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 详情弹窗:展示完整对话记录 */}
        <Modal visible={showDetailModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { maxHeight: '80%' }]}>
              <Text style={s.modalTitle}>对话详情</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {selectedHistory?.messages?.map((msg: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 16, padding: 12, backgroundColor: msg.role === 'user' ? colors.primary + '15' : colors.background, borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      {msg.role === 'user' ? '🗣️ 你' : '💚 心芽'}
                      {' · '}
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{msg.content}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                {/* 继续话题按钮 */}
                <TouchableOpacity 
                  style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, marginBottom: 12 }}
                  onPress={() => {
                    // 导入对话到倾诉窗口
                    setMessages(selectedHistory.messages.map((m: any, i: number) => ({
                      id: `continue_${i}`,
                      role: m.role,
                      content: m.content,
                      timestamp: m.timestamp
                    })));
                    // 记录继续对话的原始sessionId，退出时替换原有记录
                    setContinuedSessionId(selectedHistory.sessionId);
                    setShowDetailModal(false);
                    setShowHistoryModal(false); // 同时关闭历史列表
                    console.log('[Confession] 继续话题:', selectedHistory.sessionId);
                  }}
                >
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>继续话题</Text>
                </TouchableOpacity>
                
                {/* 评价按钮 */}
                {selectedHistory?.wasRated === false ? (
                  // 未评价:显示评价按钮
                  <View>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>未评价</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
                      <TouchableOpacity
                        style={{ padding: 12, borderRadius: 8, backgroundColor: '#E8F5E9' }}
                        onPress={async () => {
                          const isPositive = true;
                          const userMsgs = selectedHistory.messages?.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(';') || '';
                          const aiMsgs = selectedHistory.messages?.filter((m: any) => m.role === 'assistant').map((m: any) => m.content).join(';') || '';
                          // 保存到本地
                          selectedHistory.rating = 5;
                          selectedHistory.wasRated = true;
                          await storageService.saveChatHistory(selectedHistory);
                          // 上传云端(好评)
                          await addDocument('session_summaries_positive', {
                            id: 'pos_' + Date.now(),
                            userId: userId || 'guest',
                            sessionId: selectedHistory.sessionId,
                            userMessages: userMsgs.slice(0, 500),
                            aiResponses: aiMsgs.slice(0, 1000),
                            rating: 5,
                            timestamp: Date.now(),
                            emotionTags: extractEmotionKeywords(userMsgs).join(','),
                          });
                          // 刷新列表
                          storageService.getChatHistoryList().then(list => setChatHistoryList(list));
                          setShowDetailModal(false);
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>😊</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ padding: 12, borderRadius: 8, backgroundColor: '#FFF3E0' }}
                        onPress={async () => {
                          const isPositive = false;
                          const userMsgs = selectedHistory.messages?.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(';') || '';
                          const aiMsgs = selectedHistory.messages?.filter((m: any) => m.role === 'assistant').map((m: any) => m.content).join(';') || '';
                          // 保存到本地
                          selectedHistory.rating = 1;
                          selectedHistory.wasRated = true;
                          await storageService.saveChatHistory(selectedHistory);
                          // 上传云端(差评)
                          await addDocument('session_summaries_negative', {
                            id: 'neg_full_' + Date.now(),
                            userId: userId || 'guest',
                            sessionId: selectedHistory.sessionId,
                            type: 'full_session',
                            userMessages: selectedHistory.messages?.filter((m: any) => m.role === 'user').map((m: any) => m.content),
                            aiResponses: selectedHistory.messages?.filter((m: any) => m.role === 'assistant').map((m: any) => m.content),
                            rating: 1,
                            feedback: null,
                            timestamp: Date.now(),
                            emotionTags: extractEmotionKeywords(userMsgs).join(','),
                          });
                          // 刷新列表
                          storageService.getChatHistoryList().then(list => setChatHistoryList(list));
                          setShowDetailModal(false);
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>😔</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
                    {selectedHistory?.rating >= 3 ? '😊 满意' : selectedHistory?.rating > 0 ? '😔 不满意' : '未评价'}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={[s.modalButton, s.modalButtonCancel, { marginTop: 16 }]} onPress={() => setShowDetailModal(false)}>
                <Text style={[s.modalButtonText, s.modalButtonTextCancel]}>关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 删除确认弹窗 */}
        <Modal visible={showDeleteConfirm} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { maxWidth: 300 }]}>
              <Text style={s.modalTitle}>确认删除</Text>
              <Text style={{ fontSize: 14, color: colors.text, textAlign: 'center', marginBottom: 20 }}>
                确定要删除这条倾诉记录吗？
              </Text>
              <View style={s.modalButtons}>
                <TouchableOpacity style={[s.modalButton, s.modalButtonCancel]} onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeletingSessionId(null);
                }}>
                  <Text style={[s.modalButtonText, s.modalButtonTextCancel]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalButton, s.modalButtonSubmit, { backgroundColor: '#FF5252' }]} onPress={async () => {
                  // 删除记录
                  const list = await storageService.getChatHistoryList();
                  const filtered = list.filter((h: any) => h.sessionId !== deletingSessionId);
                  await storageService.setItem('xinya_chat_history', filtered);
                  setChatHistoryList(filtered);
                  setShowDeleteConfirm(false);
                  setDeletingSessionId(null);
                }}>
                  <Text style={[s.modalButtonText, s.modalButtonTextSubmit]}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 修改名称弹窗 */}
        <Modal visible={!!editingName} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { maxWidth: 320 }]}>
              <Text style={s.modalTitle}>修改名称</Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: colors.border, 
                  borderRadius: 8, 
                  padding: 12, 
                  fontSize: 14, 
                  marginBottom: 16,
                  color: colors.text,
                  backgroundColor: colors.background 
                }}
                placeholder="请输入自定义名称"
                placeholderTextColor="#999"
                defaultValue={selectedHistory?.customName || new Date(selectedHistory?.timestamp || Date.now()).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                onChangeText={(text) => {
                  selectedHistory.customName = text;
                }}
                autoFocus
              />
              <View style={s.modalButtons}>
                <TouchableOpacity style={[s.modalButton, s.modalButtonCancel]} onPress={() => {
                  setEditingName(null);
                  setSelectedHistory(null);
                }}>
                  <Text style={[s.modalButtonText, s.modalButtonTextCancel]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalButton, s.modalButtonSubmit]} onPress={async () => {
                  if (selectedHistory?.customName?.trim()) {
                    await storageService.saveChatHistory(selectedHistory);
                    storageService.getChatHistoryList().then(list => setChatHistoryList(list));
                  }
                  setEditingName(null);
                  setSelectedHistory(null);
                }}>
                  <Text style={[s.modalButtonText, s.modalButtonTextSubmit]}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}