/**
 * 统一情绪疏导服务模块
 * 基于人本主义+EFT+CBT核心逻辑的五阶段AI倾听框架
 */

import { AIService } from './AIService';
import { ConversationStage } from './EmotionSupport/types';
import { getRecentEmotionLogs } from './CloudBaseService';

// ========== 类型定义 ==========

// 用户画像
export interface UserEmotionProfile {
  userId: string;
  // 收集的信息
  reason?: string;
  timeContext?: string;
  people?: string[];
  events?: string[];
  history?: string;
  hiddenEmotion?: string;
  // 蒸馏摘要
  summary?: string;
  // 状态
  conversationStage: ConversationStage;
  rounds: number;
  lastGatherTime?: number;
  // 对话历史
  messageHistory?: string[];
  // 情绪日志（临时，临时存储每轮关键信息）
  tempEmotionLog?: {
    emotionTag: string;      // 情绪标签
    keyElements: string[];   // 关键要素（人/事/物/时间）
    attitude: string;        // 态度倾向（抗拒/委屈/愤怒等）
    isAvoiding: boolean;     // 是否在回避
  };
  // 当前对话阶段
  dialoguePhase: number;     // 1-5 阶段
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
  // 危机关键词
  CRISIS_KEYWORDS: [
    '自杀', '自伤', '不想活', '死了', '结束',
    '伤害自己', '割腕', '跳楼', '安眠药',
    '活够了', '没意思', '不如死了',
  ],
  CRISIS_RESPONSE: '我听到你正在经历非常困难的时刻。你的生命很重要，请拨打心理援助热线：400-161-9995。或者我们可以先聊聊，是什么让你有这样的想法？',
  MAX_RESPONSE_LENGTH: 140,  // 控制每次回复140字以内，情感陪伴不需要长篇大论
};

// ========== 核心服务类 ==========

class UnifiedEmotionService {
  private userProfiles: Map<string, UserEmotionProfile> = new Map();

  /**
   * 处理用户消息（统一入口）
   */
  async processMessage(
    userMessage: string,
    userId: string,
    mode: 'heal' | 'consult' = 'heal',
    recentMessages?: Array<{role: string, content: string}>,  // 最近10轮原文
    summary?: string,  // 蒸馏摘要
    profileContext?: string  // 用户画像上下文
  ): Promise<EmotionServiceResponse> {
    // ========== 调试日志：记录对话输入 ==========
    const timestamp = new Date().toISOString();
    console.log(`[CONV] ${timestamp} [${userId}] [${mode}] INPUT: ${userMessage.slice(0, 200)}`);
    
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

    // 3. 提取关键信息（情绪标签+关键要素+态度倾向）
    this.extractKeyInfo(userMessage, profile);

    // 4. 检测禁忌区
    if (this.detectTabooZone(userMessage)) {
      return this.handleTabooZoneResponse(profile);
    }

    // 5. 检测重复/不满
    if (this.detectRepeatComplaint(userMessage)) {
      return {
        response: '抱歉让你有不好的体验，我会换个方式陪你聊聊。你愿意的话，可以继续说说当下的感受吗？',
        needsMoreInfo: false,
        isCrisis: false,
        profile,
      };
    }

    // 6. 调用 AI 生成回复（五阶段逻辑）
    const aiResponse = await this.generateAIResponse(userMessage, profile, mode, recentMessages, summary, profileContext);

    // 7. 更新对话历史
    if (!profile.messageHistory) profile.messageHistory = [];
    profile.messageHistory.push(`U: ${userMessage}`);
    profile.messageHistory.push(`AI: ${aiResponse}`);
    if (profile.messageHistory.length > 6) {
      profile.messageHistory = profile.messageHistory.slice(-6);
    }

    // 8. 尝试从用户消息中提取关键信息更新画像
    this.parseUserInfo(userMessage, profile);

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
        return { isCrisis: true, response: CONFIG.CRISIS_RESPONSE };
      }
    }
    return { isCrisis: false, response: '' };
  }

  /**
   * 提取关键信息
   */
  private extractKeyInfo(message: string, profile: UserEmotionProfile): void {
    const lower = message.toLowerCase();
    
    // 情绪标签提取
    const emotionTags = ['难过', '委屈', '生气', '愤怒', '焦虑', '烦躁', '失望', '无奈', '憋屈', '堵得慌', '心寒', '崩溃'];
    let foundEmotion = '';
    for (const emotion of emotionTags) {
      if (lower.includes(emotion)) {
        foundEmotion = emotion;
        break;
      }
    }

    // 关键要素提取（人/事/物/时间）
    const keyElements: string[] = [];
    const peopleKeywords = ['妈妈', '爸爸', '老公', '老婆', '同事', '老板', '领导', '老师', '朋友', '客户'];
    for (const kw of peopleKeywords) {
      if (lower.includes(kw)) keyElements.push(kw);
    }
    const timeKeywords = ['昨天', '今天', '刚才', '最近', '上周', '上个月'];
    for (const kw of timeKeywords) {
      if (lower.includes(kw)) keyElements.push(kw);
    }

    // 态度倾向提取
    let attitude = '';
    const attitudeKeywords = ['委屈', '生气', '愤怒', '无奈', '不甘心', '寒心', '失望'];
    for (const kw of attitudeKeywords) {
      if (lower.includes(kw)) {
        attitude = kw;
        break;
      }
    }

    // 记录到临时情绪日志
    profile.tempEmotionLog = {
      emotionTag: foundEmotion,
      keyElements,
      attitude,
      isAvoiding: false,
    };

    // 同时更新用户画像的详细信息
    this.parseUserInfo(message, profile);
  }

  /**
   * 检测禁忌区
   */
  private detectTabooZone(message: string): boolean {
    const tabooPatterns = [
      '不想说这个', '没什么', '反正说了也没用', '别问了', '不说了',
      '算了', '就这样吧', '我不想提', '别再问了', '你烦不烦'
    ];
    const lower = message.toLowerCase();
    return tabooPatterns.some(p => lower.includes(p));
  }

  /**
   * 处理禁忌区回复
   */
  private handleTabooZoneResponse(profile: UserEmotionProfile): EmotionServiceResponse {
    // 获取上轮情绪信息
    const lastEmotion = profile.tempEmotionLog?.emotionTag || '这种感受';
    
    return {
      response: `没关系，不想说就不说～能感受到你当下的${lastEmotion}，要是想说说当下的感受，我随时在这里听你～`,
      needsMoreInfo: false,
      isCrisis: false,
      profile,
    };
  }

  /**
   * 检测重复不满
   */
  private detectRepeatComplaint(message: string): boolean {
    const patterns = ['你说重复了', '重复的话', '好傻', '你好笨', '怎么又问', '你烦不烦'];
    const lower = message.toLowerCase();
    return patterns.some(p => lower.includes(p));
  }

  /**
   * 获取/更新用户画像
   */
  private getOrUpdateProfile(userId: string, message: string): UserEmotionProfile {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      console.log(`[Profile] 新建画像 for ${userId}`);
      profile = {
        userId,
        conversationStage: ConversationStage.INITIAL,
        rounds: 0,
        dialoguePhase: 1,  // 默认从阶段1开始
      };
      this.userProfiles.set(userId, profile);
    } else {
      console.log(`[Profile] 已有画像 for ${userId}, rounds: ${profile.rounds}, phase: ${profile.dialoguePhase}`);
    }
    profile.rounds += 1;
    return profile;
  }

  /**
   * 解析用户信息
   */
  private parseUserInfo(message: string, profile: UserEmotionProfile): void {
    const lower = message.toLowerCase();
    
    // 时间提取
    const timePatterns = [
      { pattern: /(\d+)\s*天/, type: '天' },
      { pattern: /(\d+)\s*周/, type: '周' },
      { pattern: /(\d+)\s*月/, type: '月' },
      { pattern: /最近/, type: '最近' },
      { pattern: /昨天|今天|前天/, type: '近期' },
    ];
    for (const { pattern, type } of timePatterns) {
      if (pattern.test(message) && !profile.timeContext) {
        profile.timeContext = type;
      }
    }

    // 人物提取
    const peopleKeywords = ['妈妈', '爸爸', '老公', '老婆', '同事', '老板', '领导', '老师', '同学', '朋友'];
    const foundPeople = peopleKeywords.filter(kw => lower.includes(kw));
    if (foundPeople.length > 0) {
      profile.people = [...(profile.people || []), ...foundPeople];
    }

    // 事件提取
    const eventKeywords = ['工作', '考试', '面试', '辞职', '分手', '吵架', '生病', '压力', '焦虑'];
    const foundEvents = eventKeywords.filter(kw => lower.includes(kw));
    if (foundEvents.length > 0) {
      profile.events = [...(profile.events || []), ...foundEvents];
    }

    // 原因提取
    const reasonKeywords = ['因为', '所以', '导致', '由于', '感觉', '觉得'];
    const hasReason = reasonKeywords.some(kw => lower.includes(kw));
    if (hasReason && !profile.reason) {
      profile.reason = message.slice(0, 30);
    }
  }

  /**
   * 获取情绪日志
   */
  private async getEmotionLogs(userId: string): Promise<string> {
    try {
      const logs = await getRecentEmotionLogs(userId, 7);
      if (logs && logs.length > 0) {
        return logs.slice(-3).map((log: { timestamp: number; textExcerpt?: string }) => 
          `${new Date(log.timestamp).toLocaleDateString()}: ${log.textExcerpt || '用户分享了情绪'}`
        ).join('；');
      }
    } catch (e) {}
    return '暂无情绪日志';
  }

  /**
   * AI生成回复 - 五阶段逻辑
   */
  private async generateAIResponse(
    userMessage: string,
    profile: UserEmotionProfile,
    mode: 'heal' | 'consult',
    recentMessages?: Array<{role: string, content: string}>,
    summary?: string,
    profileContext?: string
  ): Promise<string> {
    // 获取情绪日志
    const emotionLogs = await this.getEmotionLogs(profile.userId);

    // 获取对话历史
    const history = profile.messageHistory?.slice(-4).join('；') || '暂无对话历史';

    // 获取本轮提取的关键信息
    const tempLog = profile.tempEmotionLog || { emotionTag: '', keyElements: [], attitude: '' };
    
    // 确定当前阶段
    const phase = this.determinePhase(profile, tempLog);

    // 如果传入的是完整 Prompt（来自 PromptBuilder），直接使用
    if (profileContext && profileContext.length > 100 && profileContext.includes('心芽')) {
      console.log('[AI] 使用完整 Prompt，长度:', profileContext.length);
      try {
        const ai = AIService.getInstance();
        const result = await ai.getResponse(profileContext);
        console.log(`[CONV] AI回复长度: ${(result || '').length}`);
        return result;
      } catch (error) {
        console.error('AI response failed:', error);
        return '谢谢你愿意分享这些，我在这里听你说说～';
      }
    }

    // 旧接口兼容：使用 memoryData
    try {
      const memoryData = {
        summary: summary || '',
        recentMessages: recentMessages || [],
        profile: profileContext || '',
      };

      const ai = AIService.getInstance();
      const result = await ai.getResponseLegacy(userMessage, memoryData);
      const aiResponse = typeof result === 'string' ? result : (result.text || result);
      
      console.log(`[CONV] ${new Date().toISOString()} [${profile.userId}] [${mode}] PHASE${phase}: ${(aiResponse || '').slice(0, 200)}`);
      return aiResponse;
    } catch (error) {
      console.error('AI response failed:', error);
      return '谢谢你愿意分享这些，我在这里听你说说～';
    }
  }

  /**
   * 确定当前阶段
   */
  private determinePhase(profile: UserEmotionProfile, tempLog: any): number {
    // 根据已收集的信息确定阶段
    const hasEmotion = !!tempLog.emotionTag;
    const hasTime = !!profile.timeContext;
    const hasPeople = profile.people && profile.people.length > 0;
    const hasEvent = profile.events && profile.events.length > 0;
    const hasHistory = !!profile.history;

    if (!hasEmotion) return 1;  // 阶段1：情绪接纳
    if (!hasEvent && !hasPeople) return 2;  // 阶段2：要素探索
    if (!hasHistory) return 3;  // 阶段3：事件梳理
    if (!profile.hiddenEmotion) return 4;  // 阶段4：锚点识别
    return 5;  // 阶段5：情绪开解
  }

  /**
   * 构建阶段Prompt
   */
  private buildPhasePrompt(
    userMessage: string,
    profile: UserEmotionProfile,
    phase: number,
    emotionLogs: string,
    history: string,
    tempLog: any
  ): string {
    const phaseNames = ['情绪接纳', '要素探索', '事件梳理', '锚点识别', '情绪开解'];

    return `你是心芽，一个温暖的朋友。倾听时真诚、关心、有温度。

【心芽倾听师・终极规则】
1. 用户提出明确需求时，必须先回应需求，不能逃避
2. 用户指出你回答机械/没回应时，必须真诚道歉，不能套话
3. 永远站在用户这边，共情他的委屈、疲惫、不甘
4. 每一句都要像真人朋友，不说教、不给方法，但要接住情绪

【用户画像】
- 情绪原因：${profile.reason || '待了解'}
- 时间背景：${profile.timeContext || '待了解'}
- 相关人物：${profile.people?.join('、') || '待了解'}
- 相关事件：${profile.events?.join('、') || '待了解'}

【对话历史】
${history}

【本次用户消息】
${userMessage}

规则：
1. 最多2句话
2. 认真回应用户内容，表达关心
3. 口语化，像朋友聊天
4. 直接说人话，不用比喻`;
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
}

// 单例导出
export const unifiedEmotionService = new UnifiedEmotionService();
export default unifiedEmotionService;