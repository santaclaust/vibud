import { useState, useEffect } from 'react';
import emotionSupportService from '../services/EmotionSupport/EmotionSupportService';
import { UserContext, UserGroup, EmotionIntensity, ConversationStage } from '../services/EmotionSupport/types';

/**
 * AI情绪疏导Hook
 * 用于在React组件中轻松使用AI倾诉功能
 */
export const useEmotionSupport = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
   * 生成AI响应
   */
  const generateResponse = async (
    userMessage: string,
    userContext: Omit<UserContext, 'user_id'> & { userId?: string }
  ): Promise<string> => {
    if (!isInitialized) {
      throw new Error('Emotion support service not initialized');
    }

    try {
      setIsLoading(true);
      
      const fullContext: UserContext = {
        user_id: userContext.userId || 'anonymous',
        user_group: userContext.user_group,
        emotion_intensity: userContext.emotion_intensity,
        conversation_stage: userContext.conversation_stage,
        current_round: userContext.current_round,
        risk_level: userContext.risk_level,
        last_response_style: userContext.last_response_style
      };

      const response = await emotionSupportService.generateResponse(
        userMessage,
        fullContext
      );

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
   * 更新语料效果评分
   */
  const updateEffectivenessScore = (
    corpusContent: string,
    feedbackScore: number
  ) => {
    emotionSupportService.updateEffectivenessScore(
      corpusContent,
      feedbackScore
    );
  };

  return {
    isInitialized,
    isLoading,
    error,
    generateResponse,
    updateEffectivenessScore
  };
};

export default useEmotionSupport;
