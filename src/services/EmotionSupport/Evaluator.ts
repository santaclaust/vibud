/**
 * AI情绪疏导效能评估服务
 * 实现完整的数据采集、分析和报告功能
 */

import { UserContext } from './types';

export interface EvaluationMetrics {
  userSatisfaction: number;      // 用户满意度 (1-5)
  naturalnessScore: number;      // 对话自然度 (1-5)  
  sessionDuration: number;       // 会话时长 (分钟)
  repeatUsageRate: number;       // 重复使用率 (0-1)
  conversationRounds: number;    // 对话轮次
  emotionalResonance: number;    // 情感共鸣度 (0-1)
}

export interface EvaluationConfig {
  // 采样配置
  satisfactionSurveyRate: number;    // 满意度调查触发率 (0-1)
  npsSurveyInterval: number;         // NPS调查间隔 (天)
  
  // 目标阈值
  targetSatisfaction: number;        // 目标满意度
  targetNaturalness: number;         // 目标自然度
  targetDuration: number;            // 目标时长 (分钟)
  targetRepeatRate: number;          // 目标重复使用率
  
  // 告警阈值
  alertSatisfaction: number;         // 满意度告警阈值
  alertErrorRate: number;            // 错误率告警阈值
}

export class EmotionSupportEvaluator {
  private config: EvaluationConfig;
  private metrics: EvaluationMetrics = {
    userSatisfaction: 0,
    naturalnessScore: 0,
    sessionDuration: 0,
    repeatUsageRate: 0,
    conversationRounds: 0,
    emotionalResonance: 0
  };

  constructor(config?: Partial<EvaluationConfig>) {
    this.config = {
      satisfactionSurveyRate: 0.1,      // 10%对话触发满意度调查
      npsSurveyInterval: 7,             // 每7天NPS调查
      targetSatisfaction: 4.2,
      targetNaturalness: 4.5,
      targetDuration: 8,
      targetRepeatRate: 0.35,
      alertSatisfaction: 3.5,
      alertErrorRate: 0.05,
      ...config
    };
  }

  /**
   * 记录单次对话的评估数据
   */
  public recordSessionData(
    sessionId: string,
    userId: string,
    startTime: Date,
    endTime: Date,
    conversationRounds: number,
    aiResponses: string[],
    userMessages: string[],
    userFeedback?: number // 1-5星评分
  ): void {
    const duration = (endTime.getTime() - startTime.getTime()) / 60000; // 转换为分钟
    
    // 计算基础指标
    this.metrics.sessionDuration = duration;
    this.metrics.conversationRounds = conversationRounds;
    
    // 如果有用户反馈，记录满意度
    if (userFeedback !== undefined) {
      this.metrics.userSatisfaction = userFeedback;
      
      // 触发告警检查
      if (userFeedback < this.config.alertSatisfaction) {
        this.triggerAlert('low_satisfaction', { sessionId, userId, score: userFeedback });
      }
    }
    
    // 计算情感共鸣度（基于用户回复的情感分析）
    this.metrics.emotionalResonance = this.calculateEmotionalResonance(userMessages);
    
    // 估算对话自然度（简化版，实际项目中需要更复杂的NLP模型）
    this.metrics.naturalnessScore = this.estimateNaturalness(aiResponses);
    
    // 保存到后端分析系统
    this.saveToAnalytics({
      sessionId,
      userId,
      duration,
      rounds: conversationRounds,
      satisfaction: userFeedback,
      naturalness: this.metrics.naturalnessScore,
      emotionalResonance: this.metrics.emotionalResonance,
      timestamp: new Date()
    });
  }

  /**
   * 计算情感共鸣度
   * 简化实现：基于用户消息的积极性
   */
  private calculateEmotionalResonance(messages: string[]): number {
    if (messages.length === 0) return 0;
    
    const positiveKeywords = ['好', '谢谢', '有用', '帮助', '理解', '舒服', '轻松'];
    const negativeKeywords = ['没用', '不好', '讨厌', '烦', '失望', '生气'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const message of messages) {
      for (const keyword of positiveKeywords) {
        if (message.includes(keyword)) positiveCount++;
      }
      for (const keyword of negativeKeywords) {
        if (message.includes(keyword)) negativeCount++;
      }
    }
    
    const total = positiveCount + negativeCount;
    return total > 0 ? positiveCount / total : 0.5; // 默认0.5
  }

  /**
   * 估算对话自然度
   * 简化实现：基于口语化特征检测
   */
  private estimateNaturalness(responses: string[]): number {
    if (responses.length === 0) return 0;
    
    const oralParticles = ['啦', '呢', '哦', '吧', '其实', '真的', '大概', '我觉得'];
    let naturalnessScore = 0;
    
    for (const response of responses) {
      let particleCount = 0;
      for (const particle of oralParticles) {
        if (response.includes(particle)) particleCount++;
      }
      
      // 口语化特征密度（每100字符的粒子数）
      const density = (particleCount / response.length) * 100;
      
      // 自然度评分：适中的口语化特征最佳（2-5个/100字）
      if (density >= 2 && density <= 5) {
        naturalnessScore += 5; // 最佳范围
      } else if (density > 0 && density < 2) {
        naturalnessScore += 3; // 适度
      } else if (density > 5) {
        naturalnessScore += 2; // 过度
      } else {
        naturalnessScore += 1; // 无口语化特征
      }
    }
    
    return Math.min(naturalnessScore / responses.length, 5);
  }

  /**
   * 计算重复使用率
   */
  public async calculateRepeatUsageRate(userId: string, days: number = 7): Promise<number> {
    // 实际项目中需要查询数据库获取用户历史记录
    // 这里返回模拟数据
    return Math.random() * 0.5 + 0.2; // 20%-70%随机值
  }

  /**
   * 获取综合效能评分
   */
  public getOverallPerformanceScore(): number {
    const weights = {
      satisfaction: 0.30,
      naturalness: 0.25,
      duration: 0.20,
      repeatRate: 0.25
    };
    
    // 标准化各指标到0-5分制
    const normalizedDuration = Math.min(this.metrics.sessionDuration / this.config.targetDuration, 1.5) * (5/1.5);
    const normalizedRepeatRate = this.metrics.repeatUsageRate / this.config.targetRepeatRate * 5;
    
    const score = (
      this.metrics.userSatisfaction * weights.satisfaction +
      this.metrics.naturalnessScore * weights.naturalness +
      normalizedDuration * weights.duration +
      normalizedRepeatRate * weights.repeatRate
    );
    
    return Math.min(score, 5); // 最高5分
  }

  /**
   * 检查是否达到目标
   */
  public checkTargetsAchieved(): Record<string, boolean> {
    return {
      satisfaction: this.metrics.userSatisfaction >= this.config.targetSatisfaction,
      naturalness: this.metrics.naturalnessScore >= this.config.targetNaturalness,
      duration: this.metrics.sessionDuration >= this.config.targetDuration,
      repeatRate: this.metrics.repeatUsageRate >= this.config.targetRepeatRate
    };
  }

  /**
   * 触发告警
   */
  private triggerAlert(type: string, data: any): void {
    console.warn(`[ALERT] ${type}:`, data);
    // 实际项目中这里会集成告警系统（邮件、短信、监控平台等）
  }

  /**
   * 保存到分析系统
   */
  private saveToAnalytics(data: any): void {
    // 实际项目中这里会发送到数据分析平台
    console.log('Saving evaluation data:', data);
  }

  /**
   * 生成评估报告
   */
  public generateReport(): string {
    const targets = this.checkTargetsAchieved();
    const overallScore = this.getOverallPerformanceScore();
    
    let report = `AI情绪疏导效能评估报告\n`;
    report += `========================\n\n`;
    report += `综合评分: ${overallScore.toFixed(2)}/5.0\n\n`;
    report += `指标达成情况:\n`;
    report += `- 用户满意度: ${this.metrics.userSatisfaction.toFixed(2)}/5.0 ${targets.satisfaction ? '?' : '?'}\n`;
    report += `- 对话自然度: ${this.metrics.naturalnessScore.toFixed(2)}/5.0 ${targets.naturalness ? '?' : '?'}\n`;
    report += `- 会话时长: ${this.metrics.sessionDuration.toFixed(2)}分钟 ${targets.duration ? '?' : '?'}\n`;
    report += `- 重复使用率: ${(this.metrics.repeatUsageRate * 100).toFixed(1)}% ${targets.repeatRate ? '?' : '?'}\n\n`;
    
    if (overallScore >= 4.0) {
      report += `?? 整体表现优秀！继续保持！\n`;
    } else if (overallScore >= 3.0) {
      report += `?? 表现良好，有提升空间\n`;
    } else {
      report += `?? 需要重点关注和优化\n`;
    }
    
    return report;
  }
}

// 使用示例
export const createEvaluator = (config?: Partial<EvaluationConfig>): EmotionSupportEvaluator => {
  return new EmotionSupportEvaluator(config);
};

export default EmotionSupportEvaluator;
