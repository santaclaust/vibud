/**
 * AI 服务
 * 调用云函数，获取 AI 回复
 */

import axios from 'axios';

export class AIService {
  private static instance: AIService;
  private readonly cloudFunctionUrl = "https://vibud-1gcx4a5580370c2f-1305515347.ap-shanghai.app.tcloudbase.com/xinya-ai";

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return this.instance;
  }

  // 最终调用方式：直接 HTTP 请求
  async getResponse(prompt: string) {
    const startTime = Date.now();
    
    try {
      console.log("[AI] 开始调用云函数...", prompt.length, "字符");
      const t0 = Date.now();
      
      const res = await axios.post(
        this.cloudFunctionUrl,
        { prompt },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const t1 = Date.now();
      console.log("[AI] 云函数响应时间:", t1 - t0, "ms");

      // 检查响应
      const result = res.data;
      
      if (!result.success) {
        console.error("[AI] 云函数返回失败:", result.error, result.detail);
        return '我在听，你慢慢说。';
      }

      const text = result.text || '';
      const totalTime = Date.now() - startTime;
      console.log("[AI] 总耗时:", totalTime, "ms | 回复长度:", text.length);
      
      return text || '我在听，你慢慢说。';
 
    } catch (err: any) {
      const totalTime = Date.now() - startTime;
      console.error("[AI] 调用失败，耗时:", totalTime, "ms | 错误:", err.message);
      return '我在这里陪着你。';
    }
  }
}

// 导出单例
export const aiService = AIService.getInstance();