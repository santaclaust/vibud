// AI服务 - 治愈系AI回复，支持情绪历史上下文
import { EmotionLog } from './CloudBaseService';

interface AIResponse {
  text: string;
  suggestions?: string[];
}

class AIService {
  // 获取AI回复（支持情绪历史上下文）
  async getResponse(
    userMessage: string,
    mode: 'heal' | 'consult',
    emotionHistory?: EmotionLog[]
  ): Promise<AIResponse> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
    
    // 构建情绪历史上下文
    const historyContext = this.buildEmotionContext(emotionHistory);
    
    // 根据关键词生成个性化回复
    const customResponse = this.generateContextualResponse(userMessage, mode, historyContext);
    const baseResponses = mode === 'consult' ? CONSULT_RESPONSES : HEAL_RESPONSES;
    const responseText = customResponse || baseResponses[Math.floor(Math.random() * baseResponses.length)];
    
    return {
      text: responseText,
      suggestions: this.generateSuggestions(userMessage, historyContext),
    };
  }

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
  private generateSuggestions(message: string, historyContext: string): string[] {
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
