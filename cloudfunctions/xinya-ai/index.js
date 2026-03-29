/**
 * 云函数：调用 AI 对话
 * 
 * 环境变量配置：
 * - SILICON_API_KEY: 你的硅基流动 API Key
 * - SILICON_MODEL: 模型名称（默认 Qwen/Qwen2.5-7B-Instruct）
 *   可选: Qwen/Qwen2.5-7B-Instruct, Qwen/Qwen2.5-14B-Instruct, 
 *         minimax-cn/MiniMax-M2.5, etc.
 */

const axios = require('axios');

exports.main = async (context) => {
  // HTTP 访问服务：参数在 event.body 中
  // 云函数调用：参数在 context.data 中
  let userMessage, mode, historyContext;
  
  if (context.data) {
    // 云函数调用方式
    ({ userMessage, mode = 'heal', context: historyContext = '' } = context.data || {});
  } else if (context.event && context.event.body) {
    // HTTP 访问服务方式
    const body = typeof context.event.body === 'string' 
      ? JSON.parse(context.event.body) 
      : context.event.body;
    ({ userMessage, mode = 'heal', context: historyContext = '' } = body || {});
  }
  
  if (!userMessage) {
    return { success: false, error: '缺少 userMessage 参数' };
  }
  
  // 从环境变量获取配置
  const apiKey = process.env.SILICON_API_KEY;
  const model = process.env.SILICON_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
  
  if (!apiKey) {
    return { success: false, error: '未配置 SILICON_API_KEY 环境变量' };
  }
  
  // 构建系统提示词
  const systemPrompt = buildSystemPrompt(mode, historyContext);
  
  try {
    const response = await axios.post(
      'https://api.siliconflow.cn/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000,
      }
    );
    
    if (response.data?.choices?.[0]?.message?.content) {
      return {
        success: true,
        text: response.data.choices[0].message.content
      };
    }
    
    return { success: false, error: 'API 响应格式错误' };
    
  } catch (error) {
    console.error('AI 调用失败:', error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || '调用失败'
    };
  }
};

// 构建系统提示词
function buildSystemPrompt(mode, historyContext) {
  const modeConfig = mode === 'consult' ? {
    name: '心理咨询师',
    style: '专业、引导性强、善于提问'
  } : {
    name: '情绪陪伴者',
    style: '温暖、共情、不评判'
  };

  let context = '';
  if (historyContext) {
    context = `\n\n${historyContext}`;
  }

  return `你是心芽（XinYa）的 AI 助手，定位是${modeConfig.name}。
你的风格：${modeConfig.style}
你的任务是陪伴用户、倾听情绪、帮助用户理清思路。${context}

回复要求：
1. 真诚、共情，不说空话套话
2. 长度控制在100-300字之间
3. 如果用户陷入循环，主动引导换角度
4. 如果用户回避，温和接纳，给安全感
5. 永远不要否定用户的感受`;
}