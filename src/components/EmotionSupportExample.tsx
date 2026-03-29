import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import useEmotionSupport from '../hooks/useEmotionSupport';
import { UserGroup, EmotionIntensity, ConversationStage } from '../services/EmotionSupport/types';

/**
 * AI情绪疏导示例组件
 * 演示如何在您的XinYa项目中集成AI倾诉功能
 */
const EmotionSupportExample = () => {
  const [userMessage, setUserMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{user: string, ai: string}>>([]);
  
  const { 
    isInitialized, 
    isLoading, 
    error, 
    generateResponse,
    updateEffectivenessScore 
  } = useEmotionSupport();

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    try {
      // 创建用户上下文
      const userContext = {
        userId: 'user_123', // 实际项目中从auth获取
        user_group: UserGroup.ADOLESCENT,
        emotion_intensity: EmotionIntensity.MEDIUM,
        conversation_stage: conversationHistory.length === 0 
          ? ConversationStage.INITIAL 
          : ConversationStage.EXPLORE,
        current_round: conversationHistory.length + 1,
        risk_level: detectRiskLevel(userMessage) // 需要实现风险检测逻辑
      };

      // 生成AI响应
      const response = await generateResponse(userMessage, userContext);
      
      // 更新对话历史
      const newEntry = { user: userMessage, ai: response };
      setConversationHistory(prev => [...prev, newEntry]);
      setAiResponse(response);
      setUserMessage('');

    } catch (err) {
      Alert.alert('Error', 'Failed to get AI response');
      console.error(err);
    }
  };

  /**
   * 简单的风险检测逻辑（实际项目中需要更复杂的实现）
   */
  const detectRiskLevel = (message: string): number => {
    const crisisKeywords = ['自杀', '想死', '不想活', '伤害自己', '结束生命'];
    const highRiskKeywords = ['痛苦', '绝望', '崩溃', '撑不住'];
    
    if (crisisKeywords.some(keyword => message.includes(keyword))) {
      return 1; // 最高风险
    } else if (highRiskKeywords.some(keyword => message.includes(keyword))) {
      return 2; // 中等风险
    }
    return 3; // 低风险
  };

  /**
   * 处理用户对AI响应的反馈
   */
  const handleFeedback = (score: number) => {
    if (aiResponse) {
      updateEffectivenessScore(aiResponse, score);
      Alert.alert('Thank you!', 'Your feedback helps improve the AI responses.');
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text>Loading AI emotion support...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI情绪疏导</Text>
      
      {/* 对话历史 */}
      <View style={styles.chatContainer}>
        {conversationHistory.map((entry, index) => (
          <View key={index} style={styles.messagePair}>
            <Text style={styles.userMessage}>你: {entry.user}</Text>
            <Text style={styles.aiMessage}>AI: {entry.ai}</Text>
          </View>
        ))}
      </View>

      {/* 输入区域 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={userMessage}
          onChangeText={setUserMessage}
          placeholder="分享你的感受..."
          multiline
        />
        <Button 
          title={isLoading ? "发送中..." : "发送"} 
          onPress={handleSendMessage}
          disabled={isLoading || !userMessage.trim()}
        />
      </View>

      {/* 反馈区域（可选） */}
      {aiResponse && (
        <View style={styles.feedbackContainer}>
          <Text>这个回应对你有帮助吗？</Text>
          <View style={styles.feedbackButtons}>
            <Button title="?? 有帮助" onPress={() => handleFeedback(5)} />
            <Button title="?? 没帮助" onPress={() => handleFeedback(1)} />
          </View>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  chatContainer: {
    flex: 1,
    marginBottom: 20
  },
  messagePair: {
    marginBottom: 15
  },
  userMessage: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5
  },
  aiMessage: {
    backgroundColor: '#f1f8e9',
    padding: 10,
    borderRadius: 8
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    minHeight: 60
  },
  feedbackContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10
  },
  error: {
    color: 'red',
    marginTop: 10
  }
});

export default EmotionSupportExample;
