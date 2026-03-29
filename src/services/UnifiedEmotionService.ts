/**
 * 统一情绪疏导服务模块
 * 基于人本主义+EFT+CBT核心逻辑的五阶段AI倾听框架
 */

import { aiService } from './AIService';
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
  MAX_RESPONSE_LENGTH: 70,
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
    const aiResponse = await this.generateAIResponse(userMessage, profile, mode);

    // 7. 更新对话历史
    if (!profile.messageHistory) profile.messageHistory = [];
    profile.messageHistory.push(`U: ${userMessage}`);
    profile.messageHistory.push(`AI: ${aiResponse}`);
    if (profile.messageHistory.length > 6) {
      profile.messageHistory = profile.messageHistory.slice(-6);
    }

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
      profile = {
        userId,
        conversationStage: ConversationStage.INITIAL,
        rounds: 0,
        dialoguePhase: 1,  // 默认从阶段1开始
      };
      this.userProfiles.set(userId, profile);
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
    mode: 'heal' | 'consult'
  ): Promise<string> {
    // 获取情绪日志
    const emotionLogs = await this.getEmotionLogs(profile.userId);

    // 获取对话历史
    const history = profile.messageHistory?.slice(-4).join('；') || '暂无对话历史';

    // 获取本轮提取的关键信息
    const tempLog = profile.tempEmotionLog || { emotionTag: '', keyElements: [], attitude: '' };
    
    // 确定当前阶段
    const phase = this.determinePhase(profile, tempLog);

    // 构建Prompt
    const prompt = this.buildPhasePrompt(userMessage, profile, phase, emotionLogs, history, tempLog);

    try {
        // 将 messageHistory 转换为 AI 期望的格式
        const historyMessages = profile.messageHistory?.map(msg => {
          const [role, content] = msg.split(': ');
          return { role: role.toLowerCase().includes('ai') ? 'assistant' : 'user', content };
        });

        const result = await aiService.getResponse(
          userMessage,
          mode,
          undefined,  // emotionHistory: 暂不使用，由 buildPhasePrompt 提供上下文
          profile.userId,
          historyMessages  // messages: 对话历史，用于学习用户风格
        );

      // 直接返回AI响应，不做长度截断
      return result.text;
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

    return `你是心芽的AI倾听师，采用人本主义+EFT+CBT核心逻辑。
你的定位是：温暖陪伴的朋友，不是AI专家或咨询师。不要给建议，不要给解决方案，不要说教。

【当前阶段】${phaseNames[phase-1]}（共5阶段）

【用户画像】
- 情绪原因：${profile.reason || '待了解'}
- 时间背景：${profile.timeContext || '待了解'}
- 相关人物：${profile.people?.join('、') || '待了解'}
- 相关事件：${profile.events?.join('、') || '待了解'}
- 历史经历：${profile.history || '待了解'}
- 潜在情绪：${profile.hiddenEmotion || '待了解'}

【情绪日志】
${emotionLogs}

【对话历史】
${history}

【本轮提取的关键信息】
- 情绪标签：${tempLog.emotionTag || '待识别'}
- 关键要素：${tempLog.keyElements?.join('、') || '待识别'}
- 态度倾向：${tempLog.attitude || '待识别'}

【本次用户消息】
${userMessage}

【核心原则】
1. 你是朋友，不是AI。每句话要像真人说话，不要像机器人回复
2. 多问用户的具体情况：什么专业？什么时候发生的？当时你在做什么？
3. 不要给答案或建议，要引导用户自己说出来
4. 回复长度30-80字，自然就好，不要刻意控制
5. 禁止用"..."截断句子，要完整表达
6. 不重复问同样的问题！基于上轮信息回应
7. 先共情用户情绪，再轻量提问
8. 用户提供了新信息要先回应
9. 识别到回避/抗拒立即停止追问
10. 口语化自然，像朋友聊天，不要用"首先""其次""综上所述"等官方表达

【阶段要求】
阶段1：共情+确认情绪，不急于提问
阶段2：模糊提问人/事/物/时间
阶段3：跟随用户节奏，不追问细节
阶段4：提炼锚点+确认提问
阶段5：共情+轻量引导，不给解决方案`;
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