// 用户画像服务 - 管理用户情绪档案和个性化配置
import { addDocument, queryDocuments, updateDocument } from './CloudBaseService';
import logger from './Logger';

// 用户画像类型
export interface UserEmotionProfile {
  userId: string;
  updatedAt: number;
  createdAt: number;
  
  // 情绪特征
  emotionProfile: {
    dominantEmotions: string[];     // 主要情绪 ['焦虑', '迷茫']
    recentEmotions: string[];       // 最近情绪
    triggerScenes: string[];        // 触发场景 ['工作', '感情']
    avoidanceTopics: string[];      // 回避话题
    preferredTone: 'gentle' | 'direct' | 'humor' | 'silent';
  };
  
  // 交互特征
  interactionPattern: {
    totalSessions: number;          // 总会话次数
    avgMessageLength: number;       // 平均消息长度
    responseStyle: 'long' | 'short' | 'mixed';
    circularCount: number;          // 累计循环次数
    breakthroughCount: number;      // 累计突破次数
    totalMessages: number;          // 总消息数
    totalChars: number;             // 总字符数
  };
  
  // 历史会话摘要
  sessionSummaries: SessionSummary[];
}

// 会话摘要
export interface SessionSummary {
  sessionId: string;
  timestamp: number;
  emotions: string[];               // 本次情绪关键词
  topics: string[];                 // 讨论话题
  breakthroughAttempted: boolean;   // 是否尝试突破
  breakthroughSuccess: boolean;     // 突破是否成功
  userSatisfaction?: number;        // 用户满意度 (1-5)
}

// 创建用户画像
export const createUserProfile = async (userId: string): Promise<UserEmotionProfile> => {
  const now = Date.now();
  const profile: UserEmotionProfile = {
    userId,
    updatedAt: now,
    createdAt: now,
    emotionProfile: {
      dominantEmotions: [],
      recentEmotions: [],
      triggerScenes: [],
      avoidanceTopics: [],
      preferredTone: 'gentle',
    },
    interactionPattern: {
      totalSessions: 0,
      avgMessageLength: 0,
      responseStyle: 'mixed',
      circularCount: 0,
      breakthroughCount: 0,
      totalMessages: 0,
      totalChars: 0,
    },
    sessionSummaries: [],
    personalization: {
      firstMetAt: now,
      lastActiveAt: now,
      preferredGreeting: '',
    },
  };
  
  await addDocument('user_profiles', profile);
  return profile;
};

// 获取用户画像
export const getUserProfile = async (userId: string): Promise<UserEmotionProfile | null> => {
  const res = await queryDocuments('user_profiles', { userId }, undefined, 1);
  return res.data?.[0] || null;
};

// 更新用户画像
export const updateUserProfile = async (userId: string, updates: Partial<UserEmotionProfile>): Promise<void> => {
  const profile = await getUserProfile(userId);
  if (!profile) {
    await createUserProfile(userId);
    return;
  }
  
  await updateDocument('user_profiles', profile._id, {
    ...updates,
    updatedAt: Date.now(),
  });
};

// 添加会话摘要
export const addSessionSummary = async (userId: string, summary: SessionSummary): Promise<void> => {
  const profile = await getUserProfile(userId);
  if (!profile) return;
  
  // 保留最近 20 次会话摘要
  const summaries = [...profile.sessionSummaries, summary].slice(-20);
  
  await updateDocument('user_profiles', profile._id, {
    sessionSummaries: summaries,
    updatedAt: Date.now(),
  });
};

// 更新情绪特征
export const updateEmotionProfile = async (
  userId: string, 
  emotions: string[], 
  topics: string[],
  isCircular: boolean = false,
  breakthroughAttempted: boolean = false
): Promise<void> => {
  const profile = await getUserProfile(userId);
  if (!profile) {
    await createUserProfile(userId);
    return getUserProfile(userId); // 递归更新
  }
  
  const now = Date.now();
  const ep = profile.emotionProfile;
  
  // 更新最近情绪（去重，保留最多 5 个）
  const newRecent = [...new Set([...emotions, ...ep.recentEmotions])].slice(0, 5);
  
  // 更新主导情绪（出现频率最高的）
  const emotionCounts = new Map<string, number>();
  profile.sessionSummaries.forEach(s => {
    s.emotions.forEach(e => emotionCounts.set(e, (emotionCounts.get(e) || 0) + 1));
  });
  const topEmotions = [...emotionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);
  
  // 更新交互统计
  const pattern = profile.interactionPattern;
  pattern.totalSessions += 1;
  if (isCircular) pattern.circularCount += 1;
  if (breakthroughAttempted) pattern.breakthroughCount += 1;
  
  // 更新最近活跃时间
  const personalization = profile.personalization;
  personalization.lastActiveAt = now;
  
  await updateDocument('user_profiles', profile._id, {
    emotionProfile: {
      ...ep,
      recentEmotions: newRecent,
      dominantEmotions: topEmotions.length > 0 ? topEmotions : ep.dominantEmotions,
    },
    interactionPattern: pattern,
    personalization,
    updatedAt: now,
  });
};

// 从会话消息生成摘要
export const generateSessionSummary = (
  sessionId: string,
  messages: { role: string; content: string }[],
  emotions: string[],
  topics: string[],
  isCircular: boolean,
  breakthroughAttempted: boolean
): SessionSummary => {
  // 提取讨论话题（简化版：取用户消息中的关键词）
  const userMessages = messages.filter(m => m.role === 'user');
  const userText = userMessages.map(m => m.content).join(' ');
  
  return {
    sessionId,
    timestamp: Date.now(),
    emotions: emotions.slice(0, 3),
    topics: topics.slice(0, 3),
    breakthroughAttempted,
    breakthroughSuccess: !isCircular, // 简化：如果不再循环就算成功
  };
};

// 获取用于 AI 上下文的用户画像摘要
export const getProfileSummaryForAI = async (userId: string): Promise<string> => {
  const profile = await getUserProfile(userId);
  if (!profile) return '';
  
  logger.log('[UserProfile] 获取画像 for AI, userId:', userId);
  
  const { emotionProfile, interactionPattern, sessionSummaries } = profile;
  
  // 获取最近一次会话摘要
  const lastSummary = sessionSummaries[sessionSummaries.length - 1];
  const recentTopics = lastSummary?.topics || [];
  
  let summary = '【用户画像】\n';
  
  // 1. 情绪特征
  if (emotionProfile.dominantEmotions.length > 0) {
    summary += `主要情绪：${emotionProfile.dominantEmotions.join('、')}。\n`;
  }
  
  if (emotionProfile.recentEmotions.length > 0) {
    summary += `近期情绪：${emotionProfile.recentEmotions.join('、')}。\n`;
  }
  
  // 2. 偏好风格（根据交互统计推断）
  if (emotionProfile.preferredTone !== 'gentle') {
    summary += `偏好的沟通风格：${emotionProfile.preferredTone}。\n`;
  }
  
  // 3. 回避话题
  if (emotionProfile.avoidanceTopics.length > 0) {
    summary += `需要避免的话题：${emotionProfile.avoidanceTopics.join('、')}。\n`;
  }
  
  // 4. 最近话题
  if (recentTopics.length > 0) {
    summary += `最近在讨论：${recentTopics.join('、')}。\n`;
  }
  
  // 5. 循环/突破统计
  if (interactionPattern.circularCount > 3) {
    summary += `【重要】用户有时会陷入思维循环（${interactionPattern.circularCount}次），需要耐心引导换角度，避免重复安慰。\n`;
  }
  
  if (interactionPattern.breakthroughCount > 0) {
    summary += `已尝试突破引导 ${interactionPattern.breakthroughCount} 次。\n`;
  }
  
  // 6. 会话频率
  const daysSinceLastActive = Math.floor((Date.now() - interactionPattern.lastActiveAt) / (1000 * 60 * 60 * 24));
  if (daysSinceLastActive <= 1) {
    summary += `用户今天很活跃。\n`;
  } else if (daysSinceLastActive <= 7) {
    summary += `用户 ${daysSinceLastActive} 天前活跃过。\n`;
  }
  
  logger.log('[UserProfile] 画像摘要:', summary);
  return summary;
};

// 学习用户偏好风格
// 分析用户的回复模式，推断偏好风格
export const learnUserTone = async (
  userId: string,
  userMessages: string[],
  aiResponses: string[]
): Promise<void> => {
  if (userMessages.length < 3) return; // 至少3条消息才学习
  
  const profile = await getUserProfile(userId);
  if (!profile) return;
  
  // 分析用户消息特征
  const avgLength = userMessages.reduce((sum, m) => sum + m.length, 0) / userMessages.length;
  const hasQuestions = userMessages.some(m => m.includes('?') || m.includes('？'));
  const hasEmoji = userMessages.some(m => /[\uD83C-\uDBFF\uDC00-\uDFFF]+/.test(m));
  
  // 分析 AI 回复效果
  // 如果用户继续回复，说明回复有效
  // 如果用户不再回复，可能需要调整风格
  
  let newTone: 'gentle' | 'direct' | 'humor' | 'silent' = 'gentle';
  
  // 推断规则
  if (hasEmoji && avgLength < 50) {
    newTone = 'humor'; // 喜欢用 emoji，消息短 → 可能喜欢轻松风格
  } else if (avgLength > 200 || hasQuestions) {
    newTone = 'direct'; // 消息长，喜欢提问 → 可能喜欢直接深入
  } else if (avgLength < 30) {
    newTone = 'silent'; // 消息很短 → 可能需要更简洁
  } else {
    newTone = 'gentle'; // 默认温柔风格
  }
  
  // 只有变化显著时才更新
  if (newTone !== profile.emotionProfile.preferredTone) {
    logger.log('[UserProfile] 学习到新风格:', newTone, '原风格:', profile.emotionProfile.preferredTone);
    profile.emotionProfile.preferredTone = newTone;
    await updateDocument('user_profiles', profile._id, {
      emotionProfile: profile.emotionProfile,
      updatedAt: Date.now(),
    });
  }
};