/**
 * 统一情绪疏导服务模块
 * 整合 EmotionSupport (引导+危机检测) + AIService (高质量回复)
 */

import { UserGroup, EmotionIntensity, ConversationStage } from '../EmotionSupport/types';
import { aiService } from './AIService';

// ========== 类型定义 ==========

export type { UserContext } from '../EmotionSupport/types';

// 用户画像
export interface UserEmotionProfile {
  userId: string;
  // 信息收集
  reason?: string;           // 情绪原因
  timeContext?: string;      // 时间背景
  people?: string[];         // 相关人物
  events?: string[];         // 相关事件
  history?: string;          // 历史背景
  hiddenEmotion?: string;    // 潜在情绪
  // 状态
  conversationStage: ConversationStage;
  rounds: number;
  lastGatherTime?: number;
}

// 服务响应
export interface EmotionServiceResponse {
  response: string;
  needsMoreInfo: boolean;
  isCrisis: boolean;
  profile?: UserEmotionProfile;
}

// ========== 配置 ==========

const CONFIG = {
  // 收集几轮后触发 AI 回复
  INFO_GATHER_ROUNDS: 2,
  // 危机关键词
  CRISIS_KEYWORDS: [
    '自杀', '自伤', '不想活', '死了', '结束',
    '伤害自己', '割腕', '跳楼', '安眠药',
    '活够了', '没意思', '不如死了',
  ],
  // 危机干预响应
  CRISIS_RESPONSE: '我听到你正在经历非常困难的时刻。你的生命很重要，请拨打心理援助热线：400-161-9995。或者我们可以先聊聊，是什么让你有这样的想法？',
  // 心理援助热线
  HOTLINE: '400-161-9995',
};

// ========== 语料库（内置引导）==========

const GUIDANCE_CORPUS = {
  // 初始接触
  initial: [
    '愿意和我说说，是什么事情让你有这样的感受吗？',
    '最近发生了什么，让你心里不太舒服？',
    '是什么样的事情，让你想要倾诉？',
  ],
  // 原因探索
  reason: [
    '在这件事里，最让你难受的是什么呢？',
    '你心里最放不下的是什么？',
    '有什么是让你特别在意的？',
  ],
  // 时间背景
  time: [
    '这种情况持续多久了？',
    '是从什么时候开始感觉不好的？',
    '最近是不是发生了什么特别的事情？',
  ],
  // 人物/事件
  people: [
    '在这件事里涉及到谁？可以聊聊吗？',
    '有没有什么人或事让你觉得特别难处理？',
    '有什么人是你想说说又不知道如何开口的？',
  ],
  // 历史背景
  history: [
    '之前有没有遇到过类似的情况？',
    '这种感受以前有过吗？',
    '有没有什么往事是跟这件事有关的？',
  ],
  // 潜在情绪
  hidden: [
    '我理解你的处境。你心里有没有什么更底层的感觉，可能是你自己也没有完全意识到的？',
    '除了这件事让你难受，还有没有别的感受？',
    '你有没有想过，这种情绪背后可能在表达什么？',
  ],
  // 承接语
  comfort: [
    '我在听，你慢慢说。',
    '谢谢你愿意告诉我这些。',
    '你的感受很重要，我在这里认真听。',
  ],
};

// ========== 主服务类 ==========

class UnifiedEmotionService {
  private userProfiles: Map<string, UserEmotionProfile> = new Map();

  /**
   * 处理用户消息（统一入口）
   */
  async processMessage(
    userMessage: string,
    userId: string,
    mode: 'heal' | 'consult' = 'heal'
  ): Promise<EmotionServiceResponse> {
    // 1. 危机检测（最高优先级）
    const crisisResult = this.checkCrisis(userMessage);
    if (crisisResult.isCrisis) {
      return {
        response: crisisResult.response,
        needsMoreInfo: false,
        isCrisis: true,
      };
    }

    // 2. 获取/更新用户画像
    const profile = this.getOrUpdateProfile(userId, userMessage);
    
    // 3. 解析并更新用户信息
    this.parseUserInfo(userMessage, profile);

    // 4. 判断是否需要继续收集信息
    if (!this.isInfoSufficient(profile)) {
      const guidance = this.generateGuidance(profile, profile.rounds);
      return {
        response: guidance,
        needsMoreInfo: true,
        isCrisis: false,
        profile,
      };
    }

    // 5. 信息足够，调用 AI 生成高质量回复
    const aiResponse = await this.generateAIResponse(userMessage, profile, mode);
    
    // 6. 重置轮次，准备下一轮对话
    profile.rounds = 0;
    
    return {
      response: aiResponse,
      needsMoreInfo: false,
      isCrisis: false,
      profile,
    };
  }

  /**
   * 危机检测
   */
  private checkCrisis(userMessage: string): { isCrisis: boolean; response: string } {
    const lower = userMessage.toLowerCase();
    for (const keyword of CONFIG.CRISIS_KEYWORDS) {
      if (lower.includes(keyword)) {
        return {
          isCrisis: true,
          response: CONFIG.CRISIS_RESPONSE,
        };
      }
    }
    return { isCrisis: false, response: '' };
  }

  /**
   * 获取或更新用户画像
   */
  private getOrUpdateProfile(userId: string, message: string): UserEmotionProfile {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        conversationStage: ConversationStage.INITIAL,
        rounds: 0,
      };
      this.userProfiles.set(userId, profile);
    }
    
    // 增加轮次
    profile.rounds += 1;
    
    // 更新对话阶段
    if (profile.rounds > 2) {
      profile.conversationStage = ConversationStage.EXPLORE;
    }
    if (profile.history) {
      profile.conversationStage = ConversationStage.INSIGHT;
    }
    
    return profile;
  }

  /**
   * 解析用户输入，提取信息
   */
  private parseUserInfo(message: string, profile: UserEmotionProfile): void {
    const lower = message.toLowerCase();
    
    // 提取时间信息
    const timePatterns = [
      { pattern: /(\d+)\s*天/, type: '天' },
      { pattern: /(\d+)\s*周/, type: '周' },
      { pattern: /(\d+)\s*月/, type: '月' },
      { pattern: /(\d+)\s*年/, type: '年' },
      { pattern: /最近/, type: '最近' },
      { pattern: /昨天|今天|前天/, type: '近期' },
    ];
    for (const { pattern, type } of timePatterns) {
      if (pattern.test(message) && !profile.timeContext) {
        profile.timeContext = type;
      }
    }

    // 提取人物
    const peopleKeywords = ['爸爸', '妈妈', '老公', '老婆', '男朋友', '女朋友', '同事', '老板', '领导', '老师', '同学', '朋友', '孩子'];
    const foundPeople = peopleKeywords.filter(kw => lower.includes(kw));
    if (foundPeople.length > 0) {
      profile.people = [...(profile.people || []), ...foundPeople];
    }

    // 提取事件关键词
    const eventKeywords = ['工作', '考试', '面试', '辞职', '分手', '离婚', '吵架', '生病', '压力', '焦虑', '失眠'];
    const foundEvents = eventKeywords.filter(kw => lower.includes(kw));
    if (foundEvents.length > 0) {
      profile.events = [...(profile.events || []), ...foundEvents];
    }

    // 提取情绪原因关键词
    const reasonKeywords = [
      '因为', '所以', '导致', '由于', '为了', '感觉',
      '觉得', '受不了', '坚持', '压力', '崩溃',
    ];
    const hasReason = reasonKeywords.some(kw => lower.includes(kw));
    if (hasReason && !profile.reason) {
      // 简单提取：取用户消息中包含原因的部分
      const sentences = message.split(/[，。！？]/);
      const reasonSentence = sentences.find(s => reasonKeywords.some(kw => s.includes(kw)));
      if (reasonSentence) {
        profile.reason = reasonSentence.slice(0, 50);
      }
    }

    // 提取潜在情绪
    const hiddenEmotionKeywords = ['其实', '也许', '可能', '不敢', '害怕', '担心', '迷茫', '困惑'];
    if (hiddenEmotionKeywords.some(kw => lower.includes(kw)) && !profile.hiddenEmotion) {
      profile.hiddenEmotion = '有待进一步探索';
    }
  }

  /**
   * 判断信息是否足够
   */
  private isInfoSufficient(profile: UserEmotionProfile): boolean {
    const hasReason = !!profile.reason;
    const hasTime = !!profile.timeContext;
    const hasEvents = (profile.events && profile.events.length > 0) || (profile.people && profile.people.length > 0);
    const hasHistory = !!profile.history;
    
    // 至少需要原因+时间，或者原因+事件
    return (hasReason && hasTime) || (hasReason && hasEvents) || profile.rounds >= CONFIG.INFO_GATHER_ROUNDS + 1;
  }

  /**
   * 生成引导语（基于对话阶段和收集状态）
   */
  private generateGuidance(profile: UserEmotionProfile, rounds: number): string {
    const { reason, timeContext, events, history, people } = profile;
    
    // 依次引导
    if (!reason) {
      return this.randomPick(GUIDANCE_CORPUS.reason);
    }
    if (!timeContext) {
      return this.randomPick(GUIDANCE_CORPUS.time);
    }
    if (!events && !people) {
      return this.randomPick(GUIDANCE_CORPUS.people);
    }
    if (!history) {
      return this.randomPick(GUIDANCE_CORPUS.history);
    }
    if (!profile.hiddenEmotion) {
      return this.randomPick(GUIDANCE_CORPUS.hidden);
    }
    
    // 兜底
    return this.randomPick(GUIDANCE_CORPUS.comfort);
  }

  /**
   * 随机选择一条
   */
  private randomPick(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * 调用 AI 生成高质量回复
   */
  private async generateAIResponse(
    userMessage: string,
    profile: UserEmotionProfile,
    mode: 'heal' | 'consult'
  ): Promise<string> {
    // 构建上下文
    const contextInfo = this.buildContextInfo(profile);
    
    try {
      const result = await aiService.getResponse(
        userMessage,
        mode,
        undefined,
        profile.userId,
        undefined
      );
      return result.text;
    } catch (error) {
      console.error('AI response failed:', error);
      return this.randomPick(GUIDANCE_CORPUS.comfort);
    }
  }

  /**
   * 构建上下文信息
   */
  private buildContextInfo(profile: UserEmotionProfile): string {
    const parts: string[] = [];
    
    if (profile.reason) parts.push(`情绪原因：${profile.reason}`);
    if (profile.timeContext) parts.push(`时间背景：${profile.timeContext}`);
    if (profile.events?.length) parts.push(`相关事件：${profile.events.join('、')}`);
    if (profile.people?.length) parts.push(`相关人物：${profile.people.join('、')}`);
    if (profile.history) parts.push(`历史背景：${profile.history}`);
    if (profile.hiddenEmotion) parts.push(`潜在情绪：${profile.hiddenEmotion}`);
    
    return parts.join('；') || '用户正在倾诉情绪';
  }

  /**
   * 获取用户画像
   */
  getProfile(userId: string): UserEmotionProfile | undefined {
    return this.userProfiles.get(userId);
  }

  /**
   * 清除用户画像
   */
  clearProfile(userId: string): void {
    this.userProfiles.delete(userId);
  }

  /**
   * 手动更新用户画像
   */
  updateProfile(userId: string, info: Partial<UserEmotionProfile>): void {
    const profile = this.userProfiles.get(userId);
    if (profile) {
      Object.assign(profile, info);
    }
  }
}

// 单例导出
export const unifiedEmotionService = new UnifiedEmotionService();
export default unifiedEmotionService;

// ========== React Hook ==========

import { useState, useCallback } from 'react';

export const useUnifiedEmotion = (options: { userId?: string; mode?: 'heal' | 'consult' } = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);
  const [profile, setProfile] = useState<UserEmotionProfile | null>(null);

  const sendMessage = useCallback(async (message: string): Promise<EmotionServiceResponse> => {
    if (!message.trim()) {
      return { response: '', needsMoreInfo: false, isCrisis: false };
    }

    setIsLoading(true);
    setIsCrisis(false);

    try {
      const userId = options.userId || 'anonymous';
      const mode = options.mode || 'heal';
      
      const result = await unifiedEmotionService.processMessage(message, userId, mode);

      setIsCrisis(result.isCrisis);
      setProfile(result.profile || null);

      return result;
    } catch (error) {
      console.error('Emotion service error:', error);
      return {
        response: '我在这里倾听你。请告诉我你的感受。',
        needsMoreInfo: true,
        isCrisis: false,
      };
    } finally {
      setIsLoading(false);
    }
  }, [options.userId, options.mode]);

  const reset = useCallback(() => {
    if (options.userId) {
      unifiedEmotionService.clearProfile(options.userId);
    }
    setProfile(null);
    setIsCrisis(false);
  }, [options.userId]);

  return {
    sendMessage,
    isLoading,
    isCrisis,
    profile,
    reset,
  };
};