// AI服务 - 治愈系AI回复，支持情绪历史上下文和用户逻辑分析
import axios from 'axios';
import { EmotionLog, callFunction } from './CloudBaseService';
import { getProfileSummaryForAI, generateSessionSummary, addSessionSummary } from './UserProfileService';

// CloudBase 云函数地址（代理硅基流动 API，隐藏 API Key）
const CLOUDBASE_FUNCTION_URL = 'https://vibud-1gcx4a5580370c2f-1305515347.ap-shanghai.app.tcloudbase.com/xinya-ai';

interface AIResponse {
  text: string;
  suggestions?: string[];
  logicAnalysis?: UserLogicAnalysis;
}

// 用户逻辑分析结果
interface UserLogicAnalysis {
  isCircular: boolean;           // 是否陷入循环
  circularPattern?: string;       // 循环模式
  isAvoiding: boolean;            // 是否在回避
  avoidanceTopic?: string;        // 回避的话题
  breakthroughAttempted: boolean; // 是否已尝试突破
  breakthroughQuestion?: string; // 突破性提问
  emotionalState: string;          // 当前情绪状态
  suggestion: string;             // 建议的引导策略
}

// 用户逻辑画像（内存中）
interface UserLogicProfile {
  messageCount: number;           // 消息计数
  recentMessages: string[];        // 最近N条消息
  repeatedPhrases: Map<string, number>; // 重复句式
  avoidanceTopics: Set<string>;   // 回避的话题
  lastTopic: string | null;       // 上一个话题
  topicStreak: number;             // 话题连续次数
  totalCircularCount: number;     // 累计循环次数
  breakthroughAttempts: number;  // 突破尝试次数
  effectiveBreakthroughs: number; // 有效突破次数
}

// 循环表达检测阈值
const CIRCULAR_THRESHOLD = 2;     // 同一句话出现2次视为循环
const TOPIC_STREAK_LIMIT = 3;      // 话题连续3次视为循环

// 常见回避模式
const AVOIDANCE_PATTERNS = [
  { pattern: '不想说', topic: '回避深度' },
  { pattern: '没什么', topic: '情感隔离' },
  { pattern: '算了', topic: '放弃表达' },
  { pattern: '就这样吧', topic: '放弃表达' },
  { pattern: '你不懂', topic: '防御性' },
  { pattern: '说了也没用', topic: '习得性无助' },
  { pattern: '不知道', topic: '情感隔离' },
  { pattern: '我不想提', topic: '回避深度' },
  { pattern: '别问了', topic: '防御性' },
];

// 突破话术库
const BREAKTHROUGH_QUESTIONS: Record<string, string[]> = {
  '情感隔离': [
    '我只是想更好地理解你，如果不想说也没关系',
    '什么时候可以说？或者我们换个话题？',
  ],
  '防御性': [
    '我没有要评判你的意思',
    '你知道吗，有时候说不出口的话，正是最想被听到的',
  ],
  '习得性无助': [
    '也许说出来不能改变结果，但说出来本身就是一种力量',
    '你愿意试试看吗？哪怕说一句',
  ],
  '回避深度': [
    '我注意到你好像不太想说这个，是有什么顾虑吗？',
    '没关系的，我们可以慢慢来',
  ],
  '放弃表达': [
    '如果你准备好了，我随时在这里',
    '你想先停一停也可以，我会陪着你',
  ],
};

class AIService {
  // 用户逻辑画像（按userId存储）
  private userProfiles: Map<string, UserLogicProfile> = new Map();

  // 获取用户画像
  private getUserProfile(userId: string): UserLogicProfile {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        messageCount: 0,
        recentMessages: [],
        repeatedPhrases: new Map(),
        avoidanceTopics: new Set(),
        lastTopic: null,
        topicStreak: 0,
        totalCircularCount: 0,
        breakthroughAttempts: 0,
        effectiveBreakthroughs: 0,
      });
    }
    return this.userProfiles.get(userId)!;
  }

  // 重置用户画像
  resetUserProfile(userId: string) {
    this.userProfiles.delete(userId);
  }

  // 获取AI回复（支持情绪历史上下文、用户逻辑分析和个性化画像）
  async getResponse(
    userMessage: string,
    mode: 'heal' | 'consult',
    emotionHistory?: EmotionLog[],
    userId?: string,
    messages?: { role: string; content: string }[]  // 对话历史，用于生成摘要
  ): Promise<AIResponse> {
    // 获取用户画像上下文
    let profileContext = '';
    if (userId) {
      try {
        profileContext = await getProfileSummaryForAI(userId);
      } catch (e) {
        console.log('[AI] 获取用户画像失败:', e);
      }
    }
    
    // 构建情绪历史上下文
    const historyContext = this.buildEmotionContext(emotionHistory);
    
    // 合并上下文：用户画像 + 情绪历史
    const fullContext = profileContext + (historyContext ? '\n\n' + historyContext : '');
    
    // 分析用户逻辑
    const logicAnalysis = this.analyzeUserLogic(userMessage, userId);
    
    // 根据逻辑分析结果调整回复策略
    let responseText: string;
    if (logicAnalysis.breakthroughAttempted) {
      // 已经尝试过突破，使用温和回应
      responseText = this.generateGentleResponse(logicAnalysis);
    } else if (logicAnalysis.isCircular) {
      // 陷入循环，使用突破性话术
      responseText = logicAnalysis.breakthroughQuestion || '...';
      if (userId) {
        const profile = this.getUserProfile(userId);
        profile.breakthroughAttempts++;
      }
    } else if (logicAnalysis.isAvoiding) {
      // 在回避，使用引导性话术
      responseText = this.generateAvoidanceResponse(logicAnalysis);
      if (userId) {
        const profile = this.getUserProfile(userId);
        profile.breakthroughAttempts++;
        profile.avoidanceTopics.add(logicAnalysis.avoidanceTopic!);
      }
    } else {
      // 正常对话，调用硅基流动 AI（传入用户画像上下文）
      try {
        responseText = await this.callSiliconAI(userMessage, mode, fullContext, logicAnalysis);
      } catch (error) {
        console.error('[AI] AI调用失败，使用备用回复:', error);
        const customResponse = this.generateContextualResponse(userMessage, mode, fullContext);
        const baseResponses = mode === 'consult' ? CONSULT_RESPONSES : HEAL_RESPONSES;
        responseText = customResponse || baseResponses[Math.floor(Math.random() * baseResponses.length)];
      }
    }
    
    console.log('[AI] 回复内容:', responseText.slice(0, 50) + '...');
    
    // 如果有用户ID和对话历史，生成会话摘要 + 学习用户风格（异步，不阻塞回复）
    if (userId && messages && messages.length > 0) {
      this.saveSessionSummary(userId, messages, logicAnalysis).catch(e => 
        console.log('[AI] 保存会话摘要失败:', e)
      );
      // 学习用户偏好风格
      this.learnUserStyle(userId, messages, responseText).catch(e =>
        console.log('[AI] 学习用户风格失败:', e)
      );
    }
    
    return {
      text: responseText,
      suggestions: this.generateSuggestions(userMessage, fullContext, logicAnalysis),
      logicAnalysis,
    };
  }
  
  // 保存会话摘要
  private async saveSessionSummary(
    userId: string,
    messages: { role: string; content: string }[],
    logicAnalysis: UserLogicAnalysis
  ): Promise<void> {
    // 提取本次对话的情绪关键词
    const emotions = logicAnalysis.emotionalState ? [logicAnalysis.emotionalState] : [];
    
    // 提取话题（简化版：取用户消息中的关键词）
    const topics = this.extractTopicsFromMessages(messages);
    
    const summary = generateSessionSummary(
      `session_${Date.now()}`,
      messages,
      emotions,
      topics,
      logicAnalysis.isCircular,
      logicAnalysis.breakthroughAttempted
    );
    
    await addSessionSummary(userId, summary);
    console.log('[AI] 会话摘要已保存');
  }
  
  // 从消息中提取话题
  private extractTopicsFromMessages(messages: { role: string; content: string }[]): string[] {
    const topicKeywords = {
      '工作': ['工作', '上班', '下班', '加班', '辞职', '面试'],
      '感情': ['恋爱', '分手', '结婚', '离婚', '相亲', '出轨'],
      '家庭': ['父母', '家人', '孩子', '老公', '老婆', '亲戚'],
      '学业': ['学习', '考试', '考研', '留学', '成绩', '作业'],
      '健康': ['失眠', '焦虑', '抑郁', '身体', '医院', '看病'],
      '财务': ['钱', '工资', '理财', '投资', '负债', '存款'],
    };
    
    const userMessages = messages.filter(m => m.role === 'user');
    const allText = userMessages.map(m => m.content).join('');
    
    const foundTopics: string[] = [];
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => allText.includes(kw))) {
        foundTopics.push(topic);
      }
    }
    
    return foundTopics;
  }
  
  // 学习用户偏好风格（初始化时调用）
  private async learnUserStyle(
    userId: string,
    messages: { role: string; content: string }[],
    lastResponse: string
  ): Promise<void> {
    const { learnUserTone } = await import('./UserProfileService');
    
    // 分离用户和 AI 的消息
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const aiResponses = messages.filter(m => m.role === 'assistant').map(m => m.content);
    
    if (userMessages.length >= 3) {
      await learnUserTone(userId, userMessages, aiResponses);
    }
  }

  // ========== 用户逻辑分析核心 ==========

  // 分析用户逻辑
  private analyzeUserLogic(userMessage: string, userId?: string): UserLogicAnalysis {
    const profile = userId ? this.getUserProfile(userId) : null;
    const result: UserLogicAnalysis = {
      isCircular: false,
      isAvoiding: false,
      breakthroughAttempted: false,
      emotionalState: this.detectEmotion(userMessage),
      suggestion: 'normal',
    };

    // 1. 检测情绪状态
    result.emotionalState = this.detectEmotion(userMessage);

    // 2. 检测循环模式
    if (profile) {
      const circularResult = this.detectCircularPattern(userMessage, profile);
      if (circularResult.isCircular) {
        result.isCircular = true;
        result.circularPattern = circularResult.pattern;
        result.suggestion = 'breakthrough';
      }
    }

    // 3. 检测回避/防御
    const avoidanceResult = this.detectAvoidance(userMessage);
    if (avoidanceResult.isAvoiding) {
      result.isAvoiding = true;
      result.avoidanceTopic = avoidanceResult.topic;
      if (!result.isCircular) {
        result.suggestion = 'guide';
      }
    }

    // 4. 检查是否已尝试过突破
    if (profile && profile.breakthroughAttempts > 0) {
      result.breakthroughAttempted = true;
    }

    // 5. 生成突破性提问
    if (result.isCircular || result.isAvoiding) {
      result.breakthroughQuestion = this.generateBreakthroughQuestion(
        result.isCircular ? 'circular' : result.avoidanceTopic!
      );
    }

    return result;
  }

  // 检测情绪状态
  private detectEmotion(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('焦虑') || lower.includes('紧张') || lower.includes('担心')) return '焦虑';
    if (lower.includes('难过') || lower.includes('伤心') || lower.includes('悲伤')) return '悲伤';
    if (lower.includes('生气') || lower.includes('愤怒') || lower.includes('烦躁')) return '愤怒';
    if (lower.includes('孤独') || lower.includes('寂寞')) return '孤独';
    if (lower.includes('迷茫') || lower.includes('困惑') || lower.includes('不知所措')) return '迷茫';
    if (lower.includes('害怕') || lower.includes('恐惧') || lower.includes('怕')) return '恐惧';
    if (lower.includes('无奈') || lower.includes('绝望') || lower.includes('无力')) return '绝望';
    if (lower.includes('开心') || lower.includes('高兴') || lower.includes('快乐')) return '开心';
    return '平静';
  }

  // 检测循环模式
  private detectCircularPattern(message: string, profile: UserLogicProfile): { isCircular: boolean; pattern?: string } {
    profile.messageCount++;
    profile.recentMessages.push(message);
    if (profile.recentMessages.length > 10) profile.recentMessages.shift();

    // 简化检查：提取关键句式（取前20个字符）
    const phrase = message.slice(0, 20).replace(/[，。？！]/g, '').trim();
    if (!phrase) return { isCircular: false };

    // 检查重复句式
    const count = (profile.repeatedPhrases.get(phrase) || 0) + 1;
    profile.repeatedPhrases.set(phrase, count);

    if (count >= CIRCULAR_THRESHOLD) {
      profile.totalCircularCount++;
      return { isCircular: true, pattern: phrase };
    }

    // 检查话题连续
    const currentTopic = this.extractTopic(message);
    if (currentTopic === profile.lastTopic) {
      profile.topicStreak++;
      if (profile.topicStreak >= TOPIC_STREAK_LIMIT) {
        return { isCircular: true, pattern: currentTopic };
      }
    } else {
      profile.topicStreak = 0;
      profile.lastTopic = currentTopic;
    }

    return { isCircular: false };
  }

  // 提取话题
  private extractTopic(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('工作') || lower.includes('上班')) return '工作';
    if (lower.includes('感情') || lower.includes('恋爱') || lower.includes('分手')) return '感情';
    if (lower.includes('父母') || lower.includes('家人') || lower.includes('家里')) return '家庭';
    if (lower.includes('朋友')) return '人际关系';
    if (lower.includes('钱') || lower.includes('经济')) return '经济';
    if (lower.includes('失眠') || lower.includes('睡觉') || lower.includes('累')) return '状态';
    return '其他';
  }

  // 检测回避/防御机制
  private detectAvoidance(message: string): { isAvoiding: boolean; topic?: string } {
    for (const { pattern, topic } of AVOIDANCE_PATTERNS) {
      if (message.includes(pattern)) {
        return { isAvoiding: true, topic };
      }
    }
    return { isAvoiding: false };
  }

  // 生成突破性提问
  private generateBreakthroughQuestion(trigger: string): string {
    if (trigger === 'circular') {
      const questions = [
        '我注意到你说了很多类似的感受。你愿意告诉我，是什么让你一直在这件事里出不来吗？',
        '你描述的这些，我很想知道：如果用一个词来形容你现在最大的感受，那会是什么？',
        '听起来你在这件事里卡了很久。如果现在有一件事可以做点什么，你会希望是什么？',
        '我发现你说来说去都是同一个问题。有时候，我们需要的不是答案，而是换个角度看问题。你愿意试试吗？',
      ];
      return questions[Math.floor(Math.random() * questions.length)];
    }

    const questions = BREAKTHROUGH_QUESTIONS[trigger] || [
      '我听到了，你想停下来。可以告诉我是什么让你不想继续说吗？',
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  // 生成回避回应
  private generateAvoidanceResponse(analysis: UserLogicAnalysis): string {
    const topic = analysis.avoidanceTopic || 'unknown';
    const responses: Record<string, string[]> = {
      '情感隔离': [
        '好的，什么时候想说的时候，我在这里听你说',
        '我理解，不着急，慢慢来',
      ],
      '防御性': [
        '我没有要评判你的意思，只是想了解你的感受',
        '你知道吗，有时候说出来的话，正是最需要被听到的',
      ],
      '习得性无助': [
        '我理解你的感受。也许说出来不能改变什么，但说出来本身就是一种力量',
        '你愿意试试看吗？哪怕说一句',
      ],
      '回避深度': [
        '我注意到你好像不太想说这个，是有什么顾虑吗？',
        '没关系的，我们可以聊聊别的',
      ],
      '放弃表达': [
        '如果你准备好了，我随时在这里',
        '你想先停一停也可以，我会陪着你',
      ],
      'default': [
        '我理解你的感受，你想说的时候随时可以告诉我',
        '好的，不想说也没关系',
      ],
    };
    const options = responses[topic] || responses['default'];
    return options[Math.floor(Math.random() * options.length)];
  }

  // 生成温和回应（突破后）
  private generateGentleResponse(analysis: UserLogicAnalysis): string {
    const responses = [
      '谢谢你愿意继续说，我在这里',
      '我听到了，慢慢来，不着急',
      '你能这样说，我很感谢你的信任',
      '无论你想说什么，我都会好好听',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ========== 云函数调用（代理硅基流动 API）==========

  // 调用云函数（代理硅基流动 API，隐藏 API Key）
  private async callSiliconAI(
    userMessage: string,
    mode: string,
    historyContext: string,
    logicAnalysis: UserLogicAnalysis
  ): Promise<string> {
    console.log('[AI] 正在调用云函数...');
    
    // 系统提示词
    const systemPrompt = this.getSystemPrompt(mode, historyContext, logicAnalysis);
    
    // 调用 CloudBase 云函数
    try {
      const response = await axios.post(
        CLOUDBASE_FUNCTION_URL,
        {
          userMessage,
          mode,
          context: historyContext,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );
      
      if (response.data?.success && response.data?.text) {
        console.log('[AI] 云函数调用成功');
        return response.data.text;
      }
      throw new Error(response.data?.error || '云函数返回格式错误');
    } catch (error: any) {
      console.error('[AI] 云函数调用失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // 生成系统提示词
  private getSystemPrompt(mode: string, historyContext: string, logicAnalysis: UserLogicAnalysis): string {
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

    // 如果检测到循环或回避，添加特殊指导
    let guidance = '';
    if (logicAnalysis.isCircular) {
      guidance = '\n\n【重要】用户正在反复表达类似的情绪，似乎陷入了思维循环。请用突破性提问帮助用户换个角度看问题，不要只是重复安慰。';
    } else if (logicAnalysis.isAvoiding) {
      guidance = '\n\n【重要】用户似乎在回避某些话题或不想深入表达。请温和地接纳，不要追问太紧，给用户安全感。';
    }

    return `你是心芽（XinYa）的 AI 助手，定位是${modeConfig.name}。
你的风格：${modeConfig.style}
你的任务是陪伴用户、倾听情绪、帮助用户理清思路。${context}${guidance}

回复要求：
1. 真诚、共情，不说空话套话
2. 长度控制在100-300字之间
3. 如果用户陷入循环，主动引导换角度
4. 如果用户回避，温和接纳，给安全感
5. 永远不要否定用户的感受`;

  }

  // ========== 原有功能保留 ==========

  // 构建情绪历史上下文文本
  private buildEmotionContext(history?: EmotionLog[]): string {
    if (!history || history.length === 0) return '';
    
    const days = new Set(history.map(h => {
      const d = new Date(h.timestamp);
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    }));
    
    const allKeywords = history.flatMap(h => h.keywords || []);
    const keywordCount = new Map<string, number>();
    for (const kw of allKeywords) {
      if (kw && kw !== '...') keywordCount.set(kw, (keywordCount.get(kw) || 0) + 1);
    }
    const topKeywords = [...keywordCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);
    
    return `【用户近期情绪状态】最近出现过的情绪关键词：${topKeywords.join('、')}。` +
      `情绪记录日期：${[...days].join('、')}。` +
      `请在回复中适当体现对这些情绪的理解和回应。`;
  }

  // 根据关键词和情绪历史生成个性化回复
  private generateContextualResponse(message: string, mode: string, historyContext: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // 压力相关
    if (lowerMessage.includes('压力') || lowerMessage.includes('累') || lowerMessage.includes('焦虑')) {
      if (historyContext.includes('焦虑') || historyContext.includes('压力')) {
        return '我注意到你最近一段时间都有一些焦虑和压力在。今天又提到了。有什么新的事情触发了这些感受吗？我们可以一起看看。';
      }
      return '听起来你最近承受了不少压力。深呼吸一下，告诉自己：尽力就好，不需要每件事都做到完美。';
    }
    
    // 失眠相关
    if (lowerMessage.includes('失眠') || lowerMessage.includes('睡不着') || lowerMessage.includes('熬夜')) {
      return '熬夜的时候思绪特别容易泛滥。不如试试把脑子里的想法写下来？有时候写出来，就能安心睡觉了。';
    }
    
    // 孤独相关
    if (lowerMessage.includes('孤独') || lowerMessage.includes('寂寞') || lowerMessage.includes('一个人')) {
      if (historyContext.includes('孤独')) {
        return '这种感觉似乎已经持续一段时间了。你不是一个人在这里，我听到了。你愿意多说说是什么让你感到孤独吗？';
      }
      return '一个人的时候，容易觉得世界很安静。但请记住，安静也可以是一种陪伴自己的方式。';
    }

    // 感情相关
    if (lowerMessage.includes('分手') || lowerMessage.includes('失恋') || lowerMessage.includes('喜欢')) {
      return '感情的事没有标准答案。允许自己难过，也允许自己慢慢走出来。这是一段过程，而不是一个开关。';
    }
    
    // 工作/学习相关
    if (lowerMessage.includes('工作') || lowerMessage.includes('学习') || lowerMessage.includes('考试')) {
      return '你已经努力了很久，记得给自己一些休息时间。努力很重要，但你的感受也同样重要。';
    }
    
    // 家庭相关
    if (lowerMessage.includes('父母') || lowerMessage.includes('家人') || lowerMessage.includes('家里')) {
      return '家人的关系有时候很复杂，但血缘是无法切断的连结。尝试表达你的想法，也许会有意想不到的收获。';
    }
    
    // 迷茫相关
    if (lowerMessage.includes('迷茫') || lowerMessage.includes('困惑') || lowerMessage.includes('不知道')) {
      if (historyContext.includes('迷茫')) {
        return '我感受到你最近一直有这种感觉。很迷茫，不知道方向在哪里。但有时候，迷茫本身就是在寻找答案的路上。';
      }
      return '每个人都会有迷茫的时候，这说明你在认真思考。现在不需要急着找到所有答案，先把自己照顾好。';
    }
    
    // 悲伤相关
    if (lowerMessage.includes('难过') || lowerMessage.includes('伤心') || lowerMessage.includes('悲伤')) {
      return '我听到了，你的难过是真实的。不用急着好起来，就让这份难过存在一会儿也没关系。';
    }
    
    // 愤怒相关
    if (lowerMessage.includes('生气') || lowerMessage.includes('愤怒') || lowerMessage.includes('烦躁')) {
      return '愤怒背后往往藏着没有被满足的需求。可以试着感受一下，这份愤怒是因为什么？';
    }
    
    // 自我怀疑
    if (lowerMessage.includes('没用') || lowerMessage.includes('失败') || lowerMessage.includes('不够好')) {
      return '你比自己想象中更重要。你的存在本身就有价值，不需要通过成就来证明。';
    }
    
    return null;
  }

  // 生成建议选项
  private generateSuggestions(message: string, historyContext: string, logicAnalysis: UserLogicAnalysis): string[] {
    // 如果检测到循环或回避，使用特定的建议
    if (logicAnalysis.isCircular || logicAnalysis.isAvoiding) {
      return [
        '想停下来休息一下吗？',
        '我们可以换个话题聊聊',
        '你想先说什么都可以',
      ];
    }

    const suggestions = [
      '想聊聊具体发生了什么吗？',
      '今天有什么开心的事吗？',
      '希望我给你一些建议，还是只是想倾诉？',
    ];
    
    if (historyContext) {
      suggestions.push('我最近的情绪变化大吗？');
      suggestions.push('有什么一直想说的话吗？');
    }
    
    const count = Math.random() > 0.5 ? 2 : 1;
    const shuffled = suggestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

const HEAL_RESPONSES = [
  '谢谢你愿意分享这些。我听到了，你的感受很重要。',
  '我理解你现在的心情。愿意这样说出来的你，已经很勇敢了。',
  '有些情绪不需要急着消化，慢慢来，我在这里陪着你。',
  '你今天愿意倾诉，这本身就是一种力量。',
  '无论今天发生了什么，请记得，你值得被善待。',
  '我感受到你内心的柔软，这是一件很美好的事。',
  '有时候，把话说出来就已经是一种疗愈了。',
  '你并不孤单，我们都在这里。',
  '给自己一点时间，也给自己一些温柔。',
  '每一次倾诉，都是对自己的拥抱。',
];

const CONSULT_RESPONSES = [
  '让我们一起看看，是什么让你有这样的感受...',
  '这个想法背后，可能藏着一些未被满足的需求...',
  '听起来这件事对你很重要，可以多说一些吗？',
  '我注意到你提到了...，这让你有什么想法？',
  '如果可以回到那个时刻，你希望有什么不同？',
  '你觉得生活中缺少的是什么？',
  '这个情绪是什么时候开始的？',
  '如果你的朋友遇到同样的情况，你会对他说什么？',
  '现在让你最困扰的是什么？',
  '你觉得什么能够让你感觉好一些？',
];

export const aiService = new AIService();
export default aiService;
