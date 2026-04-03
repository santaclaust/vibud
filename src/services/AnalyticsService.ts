/**
 * AI效能监控服务
 * 画像填充率 + AI回复质量 + 对话轮次统计 + 社区运营数据
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, FeedbackAnalysis, MessageFeedback } from '../types';
import { 
  getCommunityPosts, getHotPosts, getPendingReports, getAllReports,
  getComments, getTreeHolePosts, getUserConfessions 
} from './CloudBaseService';

// ========== 监控指标类型 ==========

// 画像填充率
export interface ProfileCompletionMetrics {
  userId: string;
  timestamp: number;
  fieldsTotal: number;
  fieldsFilled: number;
  completionRate: number; // 0-100%
  fieldDetails: {
    people: boolean;
    events: boolean;
    time: boolean;
    emotion: boolean;
    currentState: boolean;
    needs: boolean;
    worry: boolean;
    personality: boolean;
    chatStyle: boolean;
  };
}

// AI回复质量
export interface AIResponseQuality {
  userId: string;
  sessionId: string;
  timestamp: number;
  totalResponses: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positiveRate: number; // 0-100%
  avgRating: number; // 1-5
  stageBreakdown: {
    [stage: number]: {
      total: number;
      positive: number;
      negative: number;
      rate: number;
    };
  };
}

// 对话轮次统计
export interface ConversationMetrics {
  userId: string;
  sessionId: string;
  timestamp: number;
  totalRounds: number;
  stageDistribution: {
    [phase: number]: number;
  };
  avgRoundsPerSession: number;
  completionRate: number; // 完整走完5阶段的比例
}

// 每日监控数据
export interface DailyAnalytics {
  date: string;
  activeUsers: number;
  totalSessions: number;
  totalMessages: number;
  avgRoundsPerSession: number;
  aiPositiveRate: number;
  profileCompletionRate: number;
}

// 社区运营数据
export interface CommunityAnalytics {
  timestamp: number;
  // 帖子统计
  posts: {
    total: number;
    today: number;
    hot: number;
    recommend: number;
  };
  // 互动统计
  interactions: {
    totalComments: number;
    totalWarmths: number;
    totalCollects: number;
  };
  // 举报统计
  reports: {
    pending: number;
    processed: number;
    rejected: number;
  };
  // 树洞统计
  treehole: {
    total: number;
    today: number;
  };
  // 倾诉统计
  confession: {
    total: number;
    today: number;
  };
}

// ========== 存储Key ==========
const ANALYTICS_KEY = 'AI_MONITORING_DATA';
const PROFILE_COMPLETION_KEY = 'PROFILE_COMPLETION';

// ========== 核心服务类 ==========
class AnalyticsService {
  private static instance: AnalyticsService;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // ========== 1. 画像填充率计算 ==========
  
  calculateProfileCompletion(profile: UserProfile | null): ProfileCompletionMetrics {
    const fields = [
      'people', 'events', 'time', 'emotion', 
      'currentState', 'needs', 'worry', 'personality', 'chatStyle'
    ];

    const fieldDetails: any = {};
    let filledCount = 0;

    for (const field of fields) {
      const value = (profile as any)?.[field];
      const filled = Array.isArray(value) ? value.length > 0 : !!value;
      fieldDetails[field] = filled;
      if (filled) filledCount++;
    }

    const rate = Math.round((filledCount / fields.length) * 100);

    return {
      userId: profile?.userId || 'unknown',
      timestamp: Date.now(),
      fieldsTotal: fields.length,
      fieldsFilled: filledCount,
      completionRate: rate,
      fieldDetails,
    };
  }

  // 保存画像填充率
  async saveProfileCompletion(metrics: ProfileCompletionMetrics): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(PROFILE_COMPLETION_KEY);
      const list: ProfileCompletionMetrics[] = data ? JSON.parse(data) : [];
      
      // 只保留最近30条
      list.push(metrics);
      if (list.length > 30) list.shift();
      
      await AsyncStorage.setItem(PROFILE_COMPLETION_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('[Analytics] 保存画像填充率失败:', e);
    }
  }

  // 获取画像填充率历史
  async getProfileCompletionHistory(userId: string): Promise<ProfileCompletionMetrics[]> {
    try {
      const data = await AsyncStorage.getItem(PROFILE_COMPLETION_KEY);
      const list: ProfileCompletionMetrics[] = data ? JSON.parse(data) : [];
      return list.filter(m => m.userId === userId);
    } catch (e) {
      return [];
    }
  }

  // ========== 2. AI回复质量统计 ==========

  async calculateAIQuality(feedbacks: MessageFeedback[]): Promise<AIResponseQuality | null> {
    if (feedbacks.length === 0) return null;

    const positiveCount = feedbacks.filter(f => f.rating >= 4).length;
    const negativeCount = feedbacks.filter(f => f.rating <= 2).length;
    const neutralCount = feedbacks.filter(f => f.rating === 3).length;
    const totalRatings = feedbacks.reduce((sum, f) => sum + f.rating, 0);

    // 按阶段统计
    const stageBreakdown: any = {};
    const stageGroups = new Map<number, MessageFeedback[]>();
    
    for (const fb of feedbacks) {
      const stage = fb.context?.stage || 1;
      if (!stageGroups.has(stage)) stageGroups.set(stage, []);
      stageGroups.get(stage)!.push(fb);
    }

    stageGroups.forEach((fbs, stage) => {
      const pos = fbs.filter(f => f.rating >= 4).length;
      const neg = fbs.filter(f => f.rating <= 2).length;
      stageBreakdown[stage] = {
        total: fbs.length,
        positive: pos,
        negative: neg,
        rate: Math.round((pos / fbs.length) * 100),
      };
    });

    return {
      userId: feedbacks[0]?.context?.profile?.userId || 'unknown',
      sessionId: feedbacks[0]?.sessionId || '',
      timestamp: Date.now(),
      totalResponses: feedbacks.length,
      positiveCount,
      negativeCount,
      neutralCount,
      positiveRate: Math.round((positiveCount / feedbacks.length) * 100),
      avgRating: Math.round((totalRatings / feedbacks.length) * 10) / 10,
      stageBreakdown,
    };
  }

  // ========== 3. 对话轮次统计 ==========

  calculateConversationMetrics(
    userId: string, 
    sessionId: string, 
    rounds: number, 
    stageDistribution: Map<number, number>
  ): ConversationMetrics {
    const stageDist: any = {};
    stageDistribution.forEach((count, stage) => {
      stageDist[stage] = count;
    });

    return {
      userId,
      sessionId,
      timestamp: Date.now(),
      totalRounds: rounds,
      stageDistribution: stageDist,
      avgRoundsPerSession: rounds, // 简化为当前会话轮数
      completionRate: stageDistribution.has(5) ? 100 : 0,
    };
  }

  // ========== 4. 综合统计获取 ==========

  async getComprehensiveStats(userId: string): Promise<{
    profileCompletion: number;
    aiQuality: {
      positiveRate: number;
      avgRating: number;
      totalFeedbacks: number;
    };
    conversation: {
      totalRounds: number;
      avgRoundsPerSession: number;
    };
  }> {
    // 画像填充率
    const profileHistory = await this.getProfileCompletionHistory(userId);
    const latestProfile = profileHistory[profileHistory.length - 1];
    const profileCompletion = latestProfile?.completionRate || 0;

    // AI回复质量
    const { feedbackService } = await import('./FeedbackService');
    const feedbacks = await feedbackService.getAllFeedbacks();
    const userFeedbacks = feedbacks.filter(f => f.context?.profile?.userId === userId);
    const positiveCount = userFeedbacks.filter(f => f.rating >= 4).length;
    const totalRatings = userFeedbacks.reduce((sum, f) => sum + f.rating, 0);
    const aiQuality = {
      positiveRate: userFeedbacks.length > 0 
        ? Math.round((positiveCount / userFeedbacks.length) * 100) 
        : 0,
      avgRating: userFeedbacks.length > 0 
        ? Math.round((totalRatings / userFeedbacks.length) * 10) / 10 
        : 0,
      totalFeedbacks: userFeedbacks.length,
    };

    // 对话轮次
    const { chatMemory } = await import('./ChatMemoryManager');
    // 尝试获取轮次，无则返回0
    let rounds = 0;
    try {
      const profile = chatMemory.getProfile();
      rounds = (profile as any)?.rounds || 0;
    } catch (e) {
      // ignore
    }

    return {
      profileCompletion,
      aiQuality,
      conversation: {
        totalRounds: rounds,
        avgRoundsPerSession: rounds,
      },
    };
  }

  // ========== 5. 上报云端 ==========

  async reportToCloud(metrics: {
    type: 'profile' | 'quality' | 'conversation';
    data: any;
  }): Promise<void> {
    try {
      const { addDocument } = await import('./CloudBaseService');
      
      await addDocument('ai_analytics', {
        ...metrics.data,
        metricType: metrics.type,
        reportedAt: Date.now(),
      });
      
      console.log('[Analytics] 已上报云端:', metrics.type);
    } catch (e) {
      console.error('[Analytics] 云端上报失败:', e);
    }
  }

  // ========== 6. 每日汇总 ==========

  async getDailySummary(): Promise<DailyAnalytics> {
    const { feedbackService } = await import('./FeedbackService');
    const feedbacks = await feedbackService.getAllFeedbacks();
    
    const today = new Date().toISOString().slice(0, 10);
    const todayFeedbacks = feedbacks.filter(f => 
      new Date(f.timestamp).toISOString().slice(0, 10) === today
    );

    const positiveCount = todayFeedbacks.filter(f => f.rating >= 4).length;
    const totalRatings = todayFeedbacks.reduce((sum, f) => sum + f.rating, 0);

    // 简化：假设1个会话 = 1个用户
    const uniqueUsers = new Set(todayFeedbacks.map(f => f.context?.profile?.userId)).size;

    return {
      date: today,
      activeUsers: uniqueUsers || 1,
      totalSessions: uniqueUsers || 1,
      totalMessages: todayFeedbacks.length * 2,
      avgRoundsPerSession: todayFeedbacks.length > 0 
        ? Math.round(todayFeedbacks.length / (uniqueUsers || 1)) 
        : 0,
      aiPositiveRate: todayFeedbacks.length > 0 
        ? Math.round((positiveCount / todayFeedbacks.length) * 100) 
        : 0,
      profileCompletionRate: 0, // 需要单独计算
    };
  }

  // ========== 7. 社区运营数据 ==========

  async getCommunityStats(): Promise<CommunityAnalytics> {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayEnd = new Date().setHours(23, 59, 59, 999);

    try {
      // 并行获取各类数据
      const [allPosts, hotPosts, recommendPosts, pendingReports, allReports, treeholePosts] = await Promise.all([
        getCommunityPosts(undefined, 1000),
        getHotPosts(100),
        getRecommendedPosts(100),
        getPendingReports(),
        getAllReports(100),
        getTreeHolePosts(1000),
      ]);

      // 今日帖子
      const todayPosts = (allPosts as any[]).filter(p => 
        p.createTime && p.createTime >= todayStart && p.createTime <= todayEnd
      );

      // 获取评论数（抽样获取前10条帖子的评论数估算）
      let totalComments = 0;
      let totalWarmths = 0;
      let totalCollects = 0;
      
      for (const post of allPosts.slice(0, 50)) {
        totalWarmths += post.likeCount || 0;
        totalCollects += (post.collectedBy?.length || 0);
      }
      // 估算总评论数（基于帖子数 * 平均评论数）
      totalComments = allPosts.length * 2; // 简化估算

      // 今日树洞
      const todayTreehole = (treeholePosts as any[]).filter(p => 
        p.createTime && p.createTime >= todayStart && p.createTime <= todayEnd
      );

      // 举报统计
      const pendingCount = (pendingReports as any[])?.length || 0;
      const processedCount = (allReports as any[]).filter(r => r.status === 'processed').length;
      const rejectedCount = (allReports as any[]).filter(r => r.status === 'rejected').length;

      return {
        timestamp: now,
        posts: {
          total: allPosts.length,
          today: todayPosts.length,
          hot: (hotPosts as any[]).length,
          recommend: (recommendPosts as any[]).length,
        },
        interactions: {
          totalComments,
          totalWarmths,
          totalCollects,
        },
        reports: {
          pending: pendingCount,
          processed: processedCount,
          rejected: rejectedCount,
        },
        treehole: {
          total: treeholePosts.length,
          today: todayTreehole.length,
        },
        confession: {
          total: 0, // 需要从用户倾诉记录获取
          today: 0,
        },
      };
    } catch (e) {
      console.error('[Analytics] 获取社区数据失败:', e);
      return {
        timestamp: now,
        posts: { total: 0, today: 0, hot: 0, recommend: 0 },
        interactions: { totalComments: 0, totalWarmths: 0, totalCollects: 0 },
        reports: { pending: 0, processed: 0, rejected: 0 },
        treehole: { total: 0, today: 0 },
        confession: { total: 0, today: 0 },
      };
    }
  }
}

// 导出单例
export const analyticsService = AnalyticsService.getInstance();
export default analyticsService;

// ========== 便捷函数 ==========

// 计算画像填充率（便捷入口）
export async function trackProfileCompletion(userId: string, profile: UserProfile | null): Promise<void> {
  const metrics = analyticsService.calculateProfileCompletion(profile);
  metrics.userId = userId;
  await analyticsService.saveProfileCompletion(metrics);
  
  // 定期上报云端（每10条上报一次）
  const history = await analyticsService.getProfileCompletionHistory(userId);
  if (history.length % 10 === 0) {
    await analyticsService.reportToCloud({ type: 'profile', data: metrics });
  }
}

// 跟踪AI回复质量
export async function trackAIResponseQuality(userId: string, sessionId: string): Promise<void> {
  const { feedbackService } = await import('./FeedbackService');
  const feedbacks = await feedbackService.getAllFeedbacks();
  const sessionFeedbacks = feedbacks.filter(f => f.sessionId === sessionId);
  
  const quality = await analyticsService.calculateAIQuality(sessionFeedbacks);
  if (quality) {
    await analyticsService.reportToCloud({ type: 'quality', data: quality });
  }
}

// 获取监控面板数据（包含AI效能 + 社区运营）
export async function getMonitoringDashboard(userId: string): Promise<{
  // AI效能
  profileCompletion: number;
  aiPositiveRate: number;
  avgRating: number;
  totalFeedbacks: number;
  totalRounds: number;
  trends: {
    profileTrend: number[];
    qualityTrend: number[];
  };
  // 社区运营
  community?: {
    posts: { total: number; today: number; hot: number; recommend: number };
    interactions: { totalComments: number; totalWarmths: number; totalCollects: number };
    reports: { pending: number; processed: number; rejected: number };
    treehole: { total: number; today: number };
  };
}> {
  // 画像趋势
  const profileHistory = await analyticsService.getProfileCompletionHistory(userId);
  const profileTrend = profileHistory.slice(-7).map(p => p.completionRate);
  
  // 质量趋势
  const { feedbackService } = await import('./FeedbackService');
  const feedbacks = await feedbackService.getAllFeedbacks();
  const userFeedbacks = feedbacks.filter(f => 
    f.context?.profile?.userId === userId
  ).slice(-21); // 最近21条
  
  const qualityTrend: number[] = [];
  for (let i = 0; i < userFeedbacks.length; i += 3) {
    const batch = userFeedbacks.slice(i, i + 3);
    const pos = batch.filter(f => f.rating >= 4).length;
    qualityTrend.push(Math.round((pos / batch.length) * 100));
  }

  const stats = await analyticsService.getComprehensiveStats(userId);

  // 社区运营数据
  let community;
  try {
    community = await analyticsService.getCommunityStats();
  } catch (e) {
    console.log('[Analytics] 获取社区数据失败:', e);
  }

  return {
    profileCompletion: stats.profileCompletion,
    aiPositiveRate: stats.aiQuality.positiveRate,
    avgRating: stats.aiQuality.avgRating,
    totalFeedbacks: stats.aiQuality.totalFeedbacks,
    totalRounds: stats.conversation.totalRounds,
    trends: {
      profileTrend,
      qualityTrend,
    },
    community: community ? {
      posts: community.posts,
      interactions: community.interactions,
      reports: community.reports,
      treehole: community.treehole,
    } : undefined,
  };
}
