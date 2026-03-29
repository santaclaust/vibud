import { UserContext, UserGroup, EmotionIntensity, ConversationStage } from './types';

/**
 * AI情绪疏导Handoffs集成服务（真人感优化版）
 * 为XinYa项目提供完整的AI倾诉功能，包含真人感语言优化
 */
class EmotionSupportService {
  private corpusManager: CorpusManager;
  private handoffInterface: HandoffInterface;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化语料库管理器
   */
  private async initialize(): Promise<void> {
    try {
      // 加载优化后的语料库
      const corpusPath = 'assets/corpus/optimized/';
      this.corpusManager = new CorpusManager(corpusPath);
      this.handoffInterface = new HandoffInterface(this.corpusManager);
      this.isInitialized = true;
      console.log('EmotionSupportService (Natural Language Optimized) initialized successfully');
    } catch (error) {
      console.error('Failed to initialize EmotionSupportService:', error);
      throw error;
    }
  }

  /**
   * 生成AI响应（支持真人感优化）
   * @param userMessage 用户输入消息
   * @param userContext 用户上下文信息  
   * @param naturalLanguage 是否启用真人感优化（默认true）
   * @returns AI生成的响应
   */
  public async generateResponse(
    userMessage: string,
    userContext: UserContext,
    naturalLanguage: boolean = true
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 使用Handoffs架构生成响应
      let response = this.handoffInterface.generateResponse(
        userMessage,
        userContext
      );
      
      // 应用真人感语言优化
      if (naturalLanguage) {
        response = this.applyNaturalLanguageOptimization(response, userContext);
      }
      
      // 记录使用日志用于后续优化
      this.logUsage(userMessage, response, userContext);
      
      return response;
    } catch (error) {
      console.error('Error generating response:', error);
      // 返回默认安抚语料
      return this.getDefaultComfortResponse(naturalLanguage);
    }
  }

  /**
   * 应用真人感语言优化
   */
  private applyNaturalLanguageOptimization(response: string, context: UserContext): string {
    if (!response || typeof response !== 'string') {
      return response;
    }

    let optimized = response;
    
    // 根据用户群体和对话阶段应用不同的优化策略
    const optimizationStrategy = this.getOptimizationStrategy(context);
    
    // 1. 添加语气词（30%概率）
    if (Math.random() < 0.3 && optimizationStrategy.useParticles) {
      optimized = this.addOralParticles(optimized);
    }
    
    // 2. 转换为主动视角（25%概率）
    if (Math.random() < 0.25 && optimizationStrategy.useActiveVoice) {
      optimized = this.convertToActiveVoice(optimized);
    }
    
    // 3. 添加轻微模糊表达（20%概率，仅非危机场景）
    if (context.risk_level > 1 && Math.random() < 0.2) {
      optimized = this.addFuzzyExpression(optimized);
    }
    
    // 4. 添加情绪温度（15%概率）
    if (Math.random() < 0.15) {
      optimized = this.addEmotionMarker(optimized, context);
    }
    
    return optimized;
  }

  /**
   * 获取优化策略（基于用户上下文）
   */
  private getOptimizationStrategy(context: UserContext): any {
    const baseStrategy = {
      useParticles: true,
      useActiveVoice: true,
      useFuzzy: true,
      emotionLevel: 'moderate'
    };
    
    // 危机场景减少优化，保持清晰直接
    if (context.risk_level === 1) {
      return {
        useParticles: false,
        useActiveVoice: true,
        useFuzzy: false,
        emotionLevel: 'supportive'
      };
    }
    
    // 青少年群体增加轻松语气
    if (context.user_group === UserGroup.ADOLESCENT) {
      return {
        ...baseStrategy,
        emotionLevel: 'warm'
      };
    }
    
    // 职场人士保持专业但温暖
    if (context.user_group === UserGroup.WORKER) {
      return {
        ...baseStrategy,
        useParticles: true,
        emotionLevel: 'professional'
      };
    }
    
    return baseStrategy;
  }

  /**
   * 添加口语化语气词
   */
  private addOralParticles(sentence: string): string {
    const particles = ['啦', '呢', '哦', '吧', '其实', '其实吧'];
    const endings = ['。', '！', '？'];
    
    for (const ending of endings) {
      if (sentence.endsWith(ending)) {
        const particle = particles[Math.floor(Math.random() * particles.length)];
        return sentence.slice(0, -1) + particle + ending;
      }
    }
    
    return sentence + particles[Math.floor(Math.random() * particles.length)] + '。';
  }

  /**
   * 转换为主动视角
   */
  private convertToActiveVoice(sentence: string): string {
    const starters = ['我感觉', '我发现', '我个人觉得', '亲测', '说实话'];
    const starter = starters[Math.floor(Math.random() * starters.length)];
    
    // 避免重复添加
    if (!starters.some(s => sentence.startsWith(s))) {
      return `${starter}，${sentence.charAt(0).toLowerCase() + sentence.slice(1)}`;
    }
    
    return sentence;
  }

  /**
   * 添加模糊表达
   */
  private addFuzzyExpression(sentence: string): string {
    const fuzzyWords = ['大概', '差不多', '个人感觉', '我觉得'];
    const fuzzyWord = fuzzyWords[Math.floor(Math.random() * fuzzyWords.length)];
    
    if (sentence.startsWith('该') || sentence.startsWith('这个')) {
      return sentence.replace('该', `${fuzzyWord}该`, 1).replace('这个', `${fuzzyWord}这个`, 1);
    }
    
    return `${fuzzyWord}，${sentence}`;
  }

  /**
   * 添加情绪标记
   */
  private addEmotionMarker(sentence: string, context: UserContext): string {
    const emotionMarkers = {
      supportive: ['真的', '特别', '很'],
      warm: ['真的很', '特别', '超'],
      professional: ['确实', '相当', '比较']
    };
    
    const level = context.risk_level === 1 ? 'supportive' : 
                 context.user_group === UserGroup.ADOLESCENT ? 'warm' : 'professional';
    
    const markers = emotionMarkers[level as keyof typeof emotionMarkers] || emotionMarkers.supportive;
    const marker = markers[Math.floor(Math.random() * markers.length)];
    
    // 在形容词前添加情绪标记
    const adjectives = ['好', '棒', '有用', '有效', '难', '痛苦', '难受'];
    for (const adj of adjectives) {
      if (sentence.includes(adj)) {
        return sentence.replace(adj, `${marker}${adj}`);
      }
    }
    
    // 如果没有找到形容词，在句首添加
    return `${marker}，${sentence}`;
  }

  /**
   * 获取默认安抚响应
   */
  private getDefaultComfortResponse(naturalLanguage: boolean = true): string {
    const defaultResponses = [
      "我在听，你慢慢说。",
      "听起来你现在真的很难受。",
      "不用着急，我们有的是时间。",
      "你的感受很重要，我在这里认真听。"
    ];
    
    let response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    
    if (naturalLanguage) {
      response = this.applyNaturalLanguageOptimization(response, {
        user_id: 'default',
        user_group: UserGroup.GENERAL,
        emotion_intensity: EmotionIntensity.MEDIUM,
        conversation_stage: ConversationStage.INITIAL,
        current_round: 1,
        risk_level: 3
      });
    }
    
    return response;
  }

  /**
   * 记录使用日志
   */
  private logUsage(
    userMessage: string,
    aiResponse: string,
    context: UserContext
  ): void {
    console.log('EmotionSupport Log:', {
      timestamp: new Date().toISOString(),
      userId: context.user_id,
      userGroup: context.user_group,
      emotionIntensity: context.emotion_intensity,
      conversationStage: context.conversation_stage,
      messageLength: userMessage.length,
      responseLength: aiResponse.length,
      naturalLanguageApplied: true
    });
  }

  /**
   * 更新语料效果评分
   */
  public updateEffectivenessScore(
    corpusContent: string,
    feedbackScore: number
  ): void {
    if (this.corpusManager) {
      this.corpusManager.updateEffectivenessScore(
        corpusContent,
        feedbackScore
      );
    }
  }
}

// 单例模式导出
const emotionSupportService = new EmotionSupportService();
export default emotionSupportService;
