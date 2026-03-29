// TODO: [语料库深度开发] 保留示例组件，后续深度开发语料库/AI情绪疏导时启用
// 当前状态: 未被任何屏幕使用，可作为独立测试页面
// 使用方式: 临时引入到某个Screen即可测试
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import useEmotionSupport from '../hooks/useEmotionSupport';
import { UserGroup, EmotionIntensity, ConversationStage } from '../services/EmotionSupport/types';

/**
 * AI情绪疏导示例组件
 * 演示如何在XinYa项目中集成AI倾诉功能
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
      const userContext = {
        userId: 'user_123',
        user_group: UserGroup.ADOLESCENT,
        emotion_intensity: EmotionIntensity.MEDIUM,
        conversation_stage: conversationHistory.length === 0 
          ? ConversationStage.INITIAL 
          : ConversationStage.EXPLORE,
        current_round: conversationHistory.length + 1,
        risk_level: detectRiskLevel(userMessage)
      };

      const response = await generateResponse(userMessage, userContext);
      const newEntry = { user: userMessage, ai: response };
      setConversationHistory(prev => [...prev, newEntry]);
      setAiResponse(response);
      setUserMessage('');

    } catch (err) {
      Alert.alert('Error', 'Failed to get AI response');
      console.error(err);
    }
  };

  const detectRiskLevel = (message: string): number => {
    const crisisKeywords = ['自杀', '自伤', '不想活', '伤害自己', '活着没意思'];
    const highRiskKeywords = ['试试', '安眠药', '跳楼', '割腕'];
    
    if (crisisKeywords.some(keyword => message.includes(keyword))) {
      return 1; // 高危
    } else if (highRiskKeywords.some(keyword => message.includes(keyword))) {
      return 2; // 中危
    }
    return 3; // 低危
  };

  const handleFeedback = (score: number) => {
    if (aiResponse) {
      updateEffectivenessScore(aiResponse, score);
      Alert.alert('感谢反馈', '你的反馈帮助改进AI回复');
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text>正在加载AI情绪疏导...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI情绪疏导示例</Text>
      
      <View style={styles.chatContainer}>
        {conversationHistory.map((entry, index) => (
          <View key={index} style={styles.messagePair}>
            <Text style={styles.userMessage}>你: {entry.user}</Text>
            <Text style={styles.aiMessage}>AI: {entry.ai}</Text>
          </View>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={userMessage}
          onChangeText={setUserMessage}
          placeholder="说说你的心事..."
          multiline
        />
        <Button 
          title={isLoading ? "发送中..." : "发送"} 
          onPress={handleSendMessage}
          disabled={isLoading || !userMessage.trim()}
        />
      </View>

      {aiResponse && (
        <View style={styles.feedbackContainer}>
          <Text>对AI回复的评价</Text>
          <View style={styles.feedbackButtons}>
            <Button title="有帮助" onPress={() => handleFeedback(5)} />
            <Button title="没帮助" onPress={() => handleFeedback(1)} />
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