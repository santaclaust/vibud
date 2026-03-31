import { useState, useEffect, useCallback } from 'react';
import emotionSupportService from './EmotionSupportService';
import { createEvaluator, EvaluationConfig } from './Evaluator';
import { UserContext, UserGroup, EmotionIntensity, ConversationStage } from './types';

/**
 * AI情绪疏导Hook（带效能评估）
 * 用于在React组件中轻松使用AI倾诉功能并收集评估数据
 */
export const useEmotionSupport = (config?: Partial<EvaluationConfig>) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{user: string, ai: string}>>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // 创建评估器
  const evaluator = createEvaluator(config);

  useEffect(() => {
    // 初始化服务
    const initService = async () => {
      try {
        setIsLoading(true);
        // 等待服务初始化完成
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        setError('Failed to initialize emotion support service');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initService();
  }, []);

  /**
   * 开始新对话
   */
  const startNewConversation = useCallback(() => {
    setConversationHistory([]);
    setStartTime(new Date());
  }, []);

  /**
   * 生成AI响应并记录评估数据
   */
  const generateResponse = async (
    userMessage: string,
    userContext: Omit<UserContext, 'user_id'> & { userId?: string }
  ): Promise<string> => {
    if (!isInitialized || !startTime) {
      throw new Error('Emotion support service not initialized or conversation not started');
    }

    try {
      setIsLoading(true);
      
      const fullContext: UserContext = {
        user_id: userContext.userId || 'anonymous',
        user_group: userContext.user_group,
        emotion_intensity: userContext.emotion_intensity,
        conversation_stage: userContext.conversation_stage,
        current_round: conversationHistory.length + 1,
        risk_level: userContext.risk_level,
        last_response_style: userContext.last_response_style
      };

      const response = await emotionSupportService.generateResponse(
        userMessage,
        fullContext
      );

      // 更新对话历史
      const newEntry = { user: userMessage, ai: response };
      setConversationHistory(prev => [...prev, newEntry]);

      return response;
    } catch (err) {
      setError('Failed to generate response');
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 结束对话并记录评估数据
   */
  const endConversation = useCallback(async (userFeedback?: number) => {
    if (!startTime) return;
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 60000; // 分钟
    
    // 如果对话太短，不记录评估数据
    if (duration < 1) return;
    
    // 记录评估数据
    evaluator.recordSessionData(
      `session_${Date.now()}`,
      'current_user', // 实际项目中替换为真实用户ID
      startTime,
      endTime,
      conversationHistory.length,
      conversationHistory.map(item => item.ai),
      conversationHistory.map(item => item.user),
      userFeedback
    );
    
    // 重置对话状态
    setStartTime(null);
    setConversationHistory([]);
  }, [startTime, conversationHistory, evaluator]);

  /**
   * 获取当前效能评分
   */
  const getPerformanceScore = useCallback(() => {
    return evaluator.getOverallPerformanceScore();
  }, [evaluator]);

  /**
   * 生成评估报告
   */
  const generateReport = useCallback(() => {
    return evaluator.generateReport();
  }, [evaluator]);

  return {
    isInitialized,
    isLoading,
    error,
    conversationHistory,
    startNewConversation,
    generateResponse,
    endConversation,
    getPerformanceScore,
    generateReport
  };
};

export default useEmotionSupport;
