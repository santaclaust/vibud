/**
 * 反馈分析引擎
 * AI 智能分析用户评价，生成个性化偏好
 */

import { MessageFeedback, FeedbackAnalysis } from '../types';

// 最终版分析函数
export function analyzeFeedback(feedbacks: MessageFeedback[]): FeedbackAnalysis {
  const analysis: FeedbackAnalysis = {
    userStyle: {
      preferredTone: [],
      preferredLength: 'normal',
    },
    goodPatterns: [],
    badPatterns: [],
    preferPhrases: [],
    avoidPhrases: [],
    forbiddenActions: [],
  };

  if (feedbacks.length === 0) return analysis;

  const positive = feedbacks.filter(f => f.rating >= 4);
  const negative = feedbacks.filter(f => f.rating <= 2);

  // 提取好评偏好
  if (positive.length > 0) {
    analysis.preferPhrases = extractGoodPhrases(positive);
    // 好评超过3次才确定偏好
    if (positive.length >= 3) {
      analysis.userStyle.preferredTone = inferPreferredTone(positive);
    }
  }

  // 提取差评禁止项
  if (negative.length > 0) {
    const { avoid, forbidden } = extractBadRules(negative);
    analysis.avoidPhrases = avoid;
    analysis.forbiddenActions = forbidden;
  }

  // 自动判断回复长度偏好
  analysis.userStyle.preferredLength = getPreferredLength(feedbacks);

  return analysis;
}

// 提取用户喜欢的表达
function extractGoodPhrases(positive: MessageFeedback[]): string[] {
  const allResponses = positive.map(f => f.aiResponse).join('');
  
  const goodPatterns = [
    { phrase: '我懂', weight: 2 },
    { phrase: '听起来', weight: 2 },
    { phrase: '真的', weight: 1 },
    { phrase: '心疼', weight: 2 },
    { phrase: '抱抱', weight: 2 },
    { phrase: '能感觉到', weight: 2 },
    { phrase: '这样啊', weight: 1 },
    { phrase: '嗯', weight: 1 },
    { phrase: '太不容易了', weight: 2 },
    { phrase: '太难了', weight: 1 },
    { phrase: '嗯嗯', weight: 1 },
    { phrase: '嗯...', weight: 1 },
  ];
  
  const found: string[] = [];
  for (const { phrase, weight } of goodPatterns) {
    const count = (allResponses.match(new RegExp(phrase, 'g')) || []).length;
    if (count >= positive.length * weight * 0.3) {
      found.push(phrase);
    }
  }
  
  return found.length > 0 ? found : ['我懂', '听起来', '真的', '心疼'];
}

// 推断用户喜欢的语气
function inferPreferredTone(positive: MessageFeedback[]): string[] {
  const tones: string[] = ['温柔', '共情'];
  
  // 分析回复长度
  const avgLength = positive.reduce((sum, f) => sum + f.aiResponse.length, 0) / positive.length;
  if (avgLength < 30) {
    tones.push('简短');
  }
  
  // 分析是否喜欢抱抱等安抚词
  const hasComfort = positive.some(f => 
    f.aiResponse.includes('抱抱') || 
    f.aiResponse.includes('心疼') || 
    f.aiResponse.includes('嗯')
  );
  if (hasComfort) {
    tones.push('陪伴感');
  }
  
  return tones;
}

// 提取禁止短语 + 行为
function extractBadRules(negative: MessageFeedback[]): {
  avoid: string[],
  forbidden: string[]
} {
  const avoid: string[] = [];
  const forbidden: string[] = [];
  
  const allResponses = negative.map(f => f.aiResponse).join('');
  
  // 禁止短语
  const avoidPhrases = [
    '你应该', '你可以尝试', '首先', '其次', '综上所述',
    '相信我', '你要坚强', '不如', '也许可以', '我建议',
    '不妨', '可以考虑', '试着', '可以试试'
  ];
  
  for (const phrase of avoidPhrases) {
    if (allResponses.includes(phrase)) {
      avoid.push(phrase);
    }
  }
  
  // 禁止行为
  if (negative.some(f => f.aiResponse.length > 80)) {
    forbidden.push('过长回复');
  }
  
  if (negative.some(f => (f.aiResponse.match(/[？?]/g) || []).length > 2)) {
    forbidden.push('频繁提问');
  }
  
  if (negative.some(f => f.reason === 'too_suggest')) {
    forbidden.push('给建议');
  }
  
  if (negative.some(f => f.reason === 'too_robotic')) {
    forbidden.push('机械回复');
  }
  
  return { 
    avoid: avoid.length > 0 ? avoid : ['你应该', '可以尝试', '首先'],
    forbidden: forbidden.length > 0 ? forbidden : ['给建议', '说教', '讲道理']
  };
}

// 智能判断最佳长度
function getPreferredLength(feedbacks: MessageFeedback[]): 'short' | 'normal' | 'long' {
  // 分析好评中短回复的比例
  const goodShort = feedbacks.filter(f => f.rating >= 4 && f.aiResponse.length < 40);
  const goodTotal = feedbacks.filter(f => f.rating >= 4).length;
  
  if (goodShort.length >= 2 && goodShort.length / goodTotal > 0.5) {
    return 'short';
  }
  
  // 分析差评中长回复的比例
  const badLong = feedbacks.filter(f => f.rating <= 2 && f.aiResponse.length > 80);
  if (badLong.length >= 2) {
    return 'short';
  }
  
  return 'normal';
}

// 统计反馈数据
export function getFeedbackStats(feedbacks: MessageFeedback[]): {
  total: number;
  positive: number;
  negative: number;
  avgRating: number;
} {
  const positive = feedbacks.filter(f => f.rating >= 4).length;
  const negative = feedbacks.filter(f => f.rating <= 2).length;
  const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
  
  return {
    total: feedbacks.length,
    positive,
    negative,
    avgRating: Math.round(avgRating * 10) / 10,
  };
}