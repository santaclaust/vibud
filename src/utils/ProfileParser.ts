/**
 * 画像解析工具
 * 从对话中自动提取用户画像
 */

import { UserProfile, ProfileSummary, toAIContext, extractProfileFromConversation, Message } from '../types/UserProfile';

// 从对话消息生成完整画像
export function generateProfileFromChat(
  userId: string,
  sessionId: string,
  messages: Message[]
): UserProfile {
  // 提取基础要素
  const extracted = extractProfileFromConversation(messages);
  
  return {
    userId,
    sessionId,
    people: extracted.people || [],
    events: extracted.events || [],
    time: extracted.time || '',
    emotion: extracted.emotion || [],
    currentState: extracted.currentState || '',
    needs: [],
    worry: [],
    personality: '',
    chatStyle: '',
  };
}

// 生成极简摘要（用于 AI 上下文）
export function generateProfileSummary(profile: UserProfile): ProfileSummary {
  return {
    people: profile.people.join('、') || '暂无',
    events: profile.events.join('、') || '暂无',
    time: profile.time || '暂无',
    emotion: profile.emotion.join('、') || '暂无',
    currentState: profile.currentState || '暂无',
    needs: profile.needs.join('、') || '暂无',
    worry: (profile.worry || []).join('、') || '暂无',
    personality: profile.personality || '暂无',
    chatStyle: profile.chatStyle || '普通',
  };
}

// 转换为 AI 上下文格式
export function getAIContext(profile: UserProfile): string {
  return toAIContext(profile);
}

// 从对话推断聊天风格
export function inferChatStyle(messages: Message[]): string {
  const userMsgs = messages.filter(m => m.role === 'user');
  if (userMsgs.length === 0) return '普通';
  
  const totalChars = userMsgs.reduce((sum, m) => sum + m.content.length, 0);
  const avgLength = totalChars / userMsgs.length;
  
  // 短消息多 → 简洁风格
  const shortCount = userMsgs.filter(m => m.content.length < 30).length;
  if (shortCount / userMsgs.length > 0.6) return '简洁';
  
  // 长消息多 → 详细风格
  if (avgLength > 100) return '详细';
  
  // 有问号 → 喜欢提问
  const questionCount = userMsgs.filter(m => m.content.includes('?') || m.content.includes('？')).length;
  if (questionCount / userMsgs.length > 0.3) return '爱提问';
  
  return '普通';
}

// 从对话推断性格
export function inferPersonality(messages: Message[]): string {
  const userMsgs = messages.filter(m => m.role === 'user');
  const text = userMsgs.map(m => m.content).join('');
  
  const traits: string[] = [];
  
  // 讨好型
  if (text.includes('不好意思') || text.includes('抱歉') || text.includes('打扰')) {
    traits.push('讨好型');
  }
  
  // 隐忍型
  if (text.includes('算了') || text.includes('没事') || text.includes('没关系')) {
    traits.push('隐忍');
  }
  
  // 敏感型
  if (text.includes('在意') || text.includes('觉得') && text.includes('是不是')) {
    traits.push('敏感');
  }
  
  // 要强型
  if (text.includes('我可以') || text.includes('没问题') || text.includes('能撑') || text.includes('硬撑')) {
    traits.push('要强');
  }
  
  return traits.length > 0 ? traits.join('、') : '';
}

// 更新画像（合并新信息）
export function mergeProfile(current: UserProfile, newInfo: Partial<UserProfile>): UserProfile {
  const mergeArray = (a: string[] = [], b: string[] = []): string[] => {
    const arrA = Array.isArray(a) ? a : [];
    const arrB = Array.isArray(b) ? b : [];
    const combined = arrA.concat(arrB);
    // 去重
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of combined) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
        if (result.length >= 10) break;
      }
    }
    return result;
  };
  
  return {
    ...current,
    people: mergeArray(current.people, newInfo.people),
    events: mergeArray(current.events, newInfo.events),
    emotion: mergeArray(current.emotion, newInfo.emotion),
    needs: mergeArray(current.needs, newInfo.needs),
    worry: mergeArray(current.worry, newInfo.worry),
    time: newInfo.time || current.time,
    currentState: newInfo.currentState || current.currentState,
    personality: newInfo.personality || current.personality,
    chatStyle: newInfo.chatStyle || current.chatStyle,
  };
}