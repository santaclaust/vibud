// AI服务 - 模拟治愈系AI回复
// 后续可以接入真实的AI API

interface AIResponse {
  text: string;
  suggestions?: string[];
}

// 治愈模式回复模板
const healResponses = [
  "谢谢你愿意分享这些。我听到了，你的感受很重要。",
  "我理解你现在的心情。愿意这样说出来的你，已经很勇敢了。",
  "有些情绪不需要急着消化，慢慢来，我在这里陪着你。",
  "你今天愿意倾诉，这本身就是一种力量。",
  "无论今天发生了什么，请记得，你值得被善待。",
  "我感受到你内心的柔软，这是一件很美好的事。",
  "有时候，把话说出来就已经是一种疗愈了。",
  "你并不孤单，我们都在这里。",
  "给自己一点时间，也给自己一些温柔。",
  "每一次倾诉，都是对自己的拥抱。",
];

// 心理咨询模式回复模板
const consultResponses = [
  "让我们一起看看，是什么让你有这样的感受...",
  "这个想法背后，可能藏着一些未被满足的需求...",
  "听起来这件事对你很重要，可以多说一些吗？",
  "我注意到你提到了...，这让你有什么想法？",
  "如果可以回到那个时刻，你希望有什么不同？",
  "你觉得生活中缺少的是什么？",
  "这个情绪是什么时候开始的？",
  "如果你的朋友遇到同样的情况，你会对他说什么？",
  "现在让你最困扰的是什么？",
  "你觉得什么能够让你感觉好一些？",
];

class AIService {
  // 获取AI回复
  async getResponse(userMessage: string, mode: 'heal' | 'consult'): Promise<AIResponse> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
    
    const responses = mode === 'consult' ? consultResponses : healResponses;
    const randomIndex = Math.floor(Math.random() * responses.length);
    
    // 根据用户消息关键词给予更个性化的回复
    let customResponse = this.generateContextualResponse(userMessage, mode);
    
    return {
      text: customResponse || responses[randomIndex],
      suggestions: this.generateSuggestions(userMessage),
    };
  }

  // 根据关键词生成更个性化的回复
  private generateContextualResponse(message: string, mode: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // 压力相关
    if (lowerMessage.includes('压力') || lowerMessage.includes('累') || lowerMessage.includes('焦虑')) {
      return '听起来你最近承受了不少压力。深呼吸一下，告诉自己：尽力就好，不需要每件事都做到完美。';
    }
    
    // 失眠相关
    if (lowerMessage.includes('失眠') || lowerMessage.includes('睡不着') || lowerMessage.includes('熬夜')) {
      return '熬夜的时候思绪特别容易泛滥。不如试试把脑子里的想法写下来？有时候写出来，就能安心睡觉了。';
    }
    
    // 孤独相关
    if (lowerMessage.includes('孤独') || lowerMessage.includes('寂寞') || lowerMessage.includes('一个人')) {
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
      return '家人的关系有时候很复杂，但的血缘是无法切断的连结。尝试表达你的想法，也许会有意想不到的收获。';
    }
    
    // 自我怀疑
    if (lowerMessage.includes('没用') || lowerMessage.includes('失败') || lowerMessage.includes('不够好')) {
      return '你比自己想象中更重要。你的存在本身就有价值，不需要通过成就来证明。';
    }
    
    return null;
  }

  // 生成建议选项
  private generateSuggestions(message: string): string[] {
    const suggestions = [
      '今天有什么开心的事吗？',
      '想聊聊具体发生了什么吗？',
      '希望我给你一些建议，还是只是想倾诉？',
    ];
    
    // 随机返回1-2个建议
    const count = Math.random() > 0.5 ? 2 : 1;
    const shuffled = suggestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export const aiService = new AIService();
export default aiService;
