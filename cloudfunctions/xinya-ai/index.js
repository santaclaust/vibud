// 心芽AI倾听 · DeepSeek版
exports.main = async (event, context) => {
  // CORS 预检
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
    // 直接从 event 提取，兼容不同格式
    const rawBody = event.body || event;
    let data = {};
    
    if (typeof rawBody === 'string') {
      try { data = JSON.parse(rawBody); } 
      catch { data = rawBody; }
    } else {
      data = rawBody;
    }

    const { prompt, userMessage, summary = '', recentMessages = [] } = data;

    if (!prompt && !userMessage) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: '缺少 prompt 或 userMessage', got: Object.keys(data) })
      };
    }

    // DeepSeek 环境变量
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    console.log("API Key 存在:", !!apiKey, "| model:", model);

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: '未配置 DEEPSEEK_API_KEY' })
      };
    }

    // 构建消息
    const messages = [];
    if (prompt) {
      messages.push({ role: 'system', content: prompt });
      messages.push({ role: 'user', content: '请回复' });
    } else {
      messages.push({
        role: 'system',
        content: '你是心芽，温柔真诚的朋友。只倾听、只共情、不给方法、不说教。每次最多2句话。'
      });
      if (summary) {
        messages.push({ role: 'system', content: `【用户过往】\n${summary}` });
      }
      if (recentMessages && recentMessages.length > 0) {
        recentMessages.forEach(msg => {
          if (msg.role && msg.content) messages.push(msg);
        });
      }
      messages.push({ role: 'user', content: userMessage });
    }

    console.log("消息数:", messages.length);

    // 调用 DeepSeek API
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const result = await response.json();
    console.log("DeepSeek 返回:", JSON.stringify(result).slice(0, 500));

    if (result.error) {
      console.error("DeepSeek 错误:", result.error);
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, text: '我在这里，你可以说说你的心事。' })
      };
    }

    const reply = result?.choices?.[0]?.message?.content?.trim() || '';
    
    if (!reply || reply.length < 5) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, text: '我在这里，你可以说说你的心事。' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, text: reply })
    };

  } catch (err) {
    console.error('云函数报错', err.message || err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, text: '我在这里，你可以说说你的心事。' })
    };
  }
};