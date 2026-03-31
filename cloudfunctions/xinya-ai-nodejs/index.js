// 心芽AI倾听 · 调试版云函数
// 添加更多日志，定位问题

exports.main = async (event, context) => {
  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
      body: '',
    };
  }

  try {
    // 安全解析请求体
    let data = {};
    if (event.body) {
      data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      data = event;
    }

    console.log("原始请求数据:", JSON.stringify(data).slice(0, 500));

    const {
      prompt,
      userMessage,
      summary = '',
      recentMessages = []
    } = data;

    console.log("提取的 prompt:", prompt ? prompt.slice(0, 100) + '...' : '空');
    console.log("提取的 userMessage:", userMessage || '空');

    // 优先使用前端构建的最优Prompt
    if (!prompt && !userMessage) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: '缺少 prompt 或 userMessage' })
      };
    }

    // 环境变量
    const apiKey = process.env.SILICON_API_KEY;
    const model = process.env.SILICON_MODEL || 'Pro/deepseek-ai/DeepSeek-R1';

    console.log("API Key 存在:", !!apiKey);
    console.log("使用模型:", model);

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: '未配置 SILICON_API_KEY' })
      };
    }

    // 构建AI消息
    const messages = [];

    if (prompt) {
      messages.push({ role: 'system', content: prompt });
      // 如果 prompt 里已经包含【用户】xxx，说明用户消息已经在 prompt 里了
      messages.push({ role: 'user', content: '请回复' });
    } else {
      messages.push({
        role: 'system',
        content: '你是心芽，温柔真诚的朋友。只倾听、只共情、不给方法、不说教。每次最多2句话。'
      });
      if (summary) {
        messages.push({ role: 'system', content: `【用户过往】\n${summary}` });
      }
      recentMessages.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
      messages.push({ role: 'user', content: userMessage });
    }

    console.log(`Messages count: ${messages.length}`);
    console.log("Messages[0]:", messages[0]?.content?.slice(0, 100));
    console.log("Messages[1]:", messages[1]?.content?.slice(0, 100));

    // 调用硅基流动 API
    const fetch = (await import('node-fetch')).default;
    
    const requestBody = {
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 400,
    };
    
    console.log("请求体:", JSON.stringify(requestBody).slice(0, 300));

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log("SiliconFlow 返回:", JSON.stringify(result).slice(0, 500));

    // 检查是否成功
    if (result.error) {
      console.error("SiliconFlow 错误:", result.error);
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: true, 
          text: '我在这里，你可以说说你的心事。' 
        })
      };
    }

    const reply = result?.choices?.[0]?.message?.content?.trim() || '';
    
    console.log("AI 回复:", reply.slice(0, 100));

    // 如果回复为空或太短，返回默认文本
    if (!reply || reply.length < 5) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: true, 
          text: '我在这里，你可以说说你的心事。' 
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, text: reply })
    };

  } catch (err) {
    console.error('【云函数报错】', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        text: '我在这里，你可以说说你的心事。'
      })
    };
  }
};