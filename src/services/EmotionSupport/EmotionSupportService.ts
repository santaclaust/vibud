import { UserContext, UserGroup, EmotionIntensity, ConversationStage } from './types';
import { CorpusManager, HandoffInterface } from './corpus-handoff';

/**
 * AI情绪疏导Handoffs集成服务
 * 为XinYa项目提供完整的AI倾诉功能
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
      // 加载语料库（从assets或本地存储）
      const corpusPath = 'assets/corpus/';
      this.corpusManager = new CorpusManager(corpusPath);
      this.handoffInterface = new HandoffInterface(this.corpusManager);
      this.isInitialized = true;
      console.log('EmotionSupportService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize EmotionSupportService:', error);
      throw error;
    }
  }

  /**
   * 生成AI响应
   * @param userMessage 用户输入消息
   * @param userContext 用户上下文信息
   * @returns AI生成的响应
   */
  public async generateResponse(
    userMessage: string,
    userContext: UserContext
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 使用Handoffs架构生成响应
      const response = this.handoffInterface.generateResponse(
        userMessage,
        userContext
      );
      
      // 记录使用日志用于后续优化
      this.logUsage(userMessage, response, userContext);
      
      return response;
    } catch (error) {
      console.error('Error generating response:', error);
      // 返回默认安抚语料
      return this.getDefaultComfortResponse();
    }
  }

  /**
   * 批量生成响应（用于多用户场景）
   */
  public async batchGenerateResponses(
    contexts: UserContext[]
  ): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.handoffInterface.batchGenerateResponses(contexts);
  }

  /**
   * 获取默认安抚响应
   */
  private getDefaultComfortResponse(): string {
    const defaultResponses = [
      "我在听，你慢慢说。",
      "听起来你现在真的很难受。",
      "不用着急，我们有的是时间。",
      "你的感受很重要，我在这里认真听。"
    ];
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }

  /**
   * 记录使用日志
   */
  private logUsage(
    userMessage: string,
    aiResponse: string,
    context: UserContext
  ): void {
    // 这里可以集成到您的现有日志系统
    console.log('EmotionSupport Log:', {
      timestamp: new Date().toISOString(),
      userId: context.user_id,
      userGroup: context.user_group,
      emotionIntensity: context.emotion_intensity,
      conversationStage: context.conversation_stage,
      messageLength: userMessage.length,
      responseLength: aiResponse.length
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

  /**
   * 获取高性能语料（用于A/B测试）
   */
  public getHighPerformanceCorpus(
    category: string,
    topN: number = 5
  ): any[] {
    if (this.corpusManager) {
      return this.corpusManager.getHighPerformanceCorpus(category, topN);
    }
    return [];
  }
}

// 单例模式导出
const emotionSupportService = new EmotionSupportService();
export default emotionSupportService;
