/**
 * 反馈服务
 * 本地 + 云端同步，用户评价偏好持久化
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageFeedback, FeedbackAnalysis } from '../types';
import { analyzeFeedback, getFeedbackStats } from '../utils/FeedbackAnalyzer';

const STORAGE_KEY = 'USER_FEEDBACK_DATA';
const PROFILE_STYLE_KEY = 'USER_PREFERRED_STYLE';

export class FeedbackService {
  private static instance: FeedbackService;

  static getInstance(): FeedbackService {
    if (!this.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  // ========== 本地存储 ==========

  // 保存单条反馈
  async saveFeedback(feedback: MessageFeedback): Promise<boolean> {
    try {
      const list = await this.getAllFeedbacks();
      list.push(feedback);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('[Feedback] 保存失败:', e);
      return false;
    }
  }

  // 获取所有反馈
  async getAllFeedbacks(): Promise<MessageFeedback[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // ========== 用户风格 ==========

  // 生成并保存用户风格（会话结束时调用）
  async generateUserStyle(sessionId?: string): Promise<FeedbackAnalysis | null> {
    try {
      const all = await this.getAllFeedbacks();
      const list = sessionId 
        ? all.filter(f => f.sessionId === sessionId)
        : all;

      if (list.length < 3) return null;

      const analysis = analyzeFeedback(list);
      await this.saveUserStyle(analysis);
      
      console.log('[Feedback] 用户风格已生成:', analysis);
      return analysis;
    } catch (e) {
      console.error('[Feedback] 生成用户风格失败:', e);
      return null;
    }
  }

  // 保存用户风格到本地
  async saveUserStyle(analysis: FeedbackAnalysis): Promise<void> {
    try {
      await AsyncStorage.setItem(PROFILE_STYLE_KEY, JSON.stringify(analysis));
    } catch (e) {
      console.error('[Feedback] 保存用户风格失败:', e);
    }
  }

  // 获取用户专属风格
  async getUserStyle(): Promise<FeedbackAnalysis | null> {
    try {
      const data = await AsyncStorage.getItem(PROFILE_STYLE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // ========== 反馈统计 ==========

  // 获取反馈统计
  async getStats(): Promise<{
    total: number;
    positive: number;
    negative: number;
    avgRating: number;
  } | null> {
    const feedbacks = await this.getAllFeedbacks();
    if (feedbacks.length === 0) return null;
    return getFeedbackStats(feedbacks);
  }

  // ========== 云端同步 ==========

  // 上传反馈到云端（会话结束时）
  async syncToCloud(feedbacks: MessageFeedback[]): Promise<void> {
    try {
      const { addDocument } = await import('../services/CloudBaseService');
      
      for (const feedback of feedbacks) {
        await addDocument('message_feedbacks', {
          ...feedback,
          id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          syncedAt: Date.now(),
        });
      }
      
      console.log('[Feedback] 已同步', feedbacks.length, '条反馈到云端');
    } catch (e) {
      console.error('[Feedback] 云端同步失败:', e);
    }
  }

  // 上传用户风格到云端
  async syncStyleToCloud(analysis: FeedbackAnalysis, userId: string): Promise<void> {
    try {
      const { addDocument, queryDocuments, updateDocument } = await import('../services/CloudBaseService');
      
      // 查询是否已存在
      const existing = await queryDocuments('user_styles', { userId }, undefined, 1);
      
      const data = {
        userId,
        ...analysis,
        updatedAt: Date.now(),
      };
      
      if (existing.data?.length > 0) {
        await updateDocument('user_styles', existing.data[0]._id, data);
      } else {
        await addDocument('user_styles', data);
      }
      
      console.log('[Feedback] 用户风格已同步到云端');
    } catch (e) {
      console.error('[Feedback] 风格云端同步失败:', e);
    }
  }

  // 从云端加载用户风格
  async loadFromCloud(userId: string): Promise<FeedbackAnalysis | null> {
    try {
      const { queryDocuments } = await import('../services/CloudBaseService');
      const res = await queryDocuments('user_styles', { userId }, undefined, 1);
      
      if (res.data?.length > 0) {
        const cloudStyle = res.data[0];
        // 转换为 FeedbackAnalysis 结构
        const analysis: FeedbackAnalysis = {
          userStyle: cloudStyle.userStyle || { preferredTone: [], preferredLength: 'normal' },
          goodPatterns: cloudStyle.goodPatterns || [],
          badPatterns: cloudStyle.badPatterns || [],
          preferPhrases: cloudStyle.preferPhrases || [],
          avoidPhrases: cloudStyle.avoidPhrases || [],
          forbiddenActions: cloudStyle.forbiddenActions || [],
        };
        // 保存到本地
        await this.saveUserStyle(analysis);
        return analysis;
      }
      return null;
    } catch (e) {
      console.error('[Feedback] 加载云端风格失败:', e);
      return null;
    }
  }

  // ========== 会话管理 ==========

  // 清空指定会话的反馈（保留其他会话）
  async clearSession(sessionId: string): Promise<void> {
    try {
      const all = await this.getAllFeedbacks();
      const filtered = all.filter(f => f.sessionId !== sessionId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('[Feedback] 清空会话失败:', e);
    }
  }

  // 清空全部反馈
  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(PROFILE_STYLE_KEY);
  }
}

// 导出单例
export const feedbackService = FeedbackService.getInstance();