/**
 * 心芽倾听项目・用户画像类型定义
 * 生产级、可存储、可蒸馏、可长期记忆
 */

// ========== 核心用户画像 ==========
export interface UserProfile {
  // 唯一标识
  userId: string;
  sessionId?: string; // 当前对话会话ID

  // 核心四要素（必须有，AI最需要）
  people: string[];        // 相关人物：老板、同事、家人、伴侣...
  events: string[];         // 关键事件：加班、加活、不被重视、内耗、迷茫...
  time: string;             // 时间线：过完年开始、持续3个月、最近一周...
  emotion: string[];        // 核心情绪：疲惫、委屈、无助、压抑、迷茫、焦虑...

  // 长期性格 & 状态
  personality?: string;     // 性格：敏感、内向、要强、讨好型...
  currentState?: string;    // 当前状态：对任何事没兴趣、失眠、睡不醒、无力...

  // 需求 & 期望
  needs: string[];          // 内心需求：被认可、想休息、想被理解、想涨薪、想被重视...
  worry?: string[];         // 担忧：不敢离职、怕找不到工作、怕改变...

  // 偏好（用于聊天更像真人）
  chatStyle?: string;       // 聊天风格：喜欢简短、喜欢温柔、不喜欢说教...
}

// ========== 本地聊天记忆结构 ==========
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatMemory {
  sessionId: string;
  profile: UserProfile;        // 用户画像（长期记忆）
  summary: string;             // 久远对话蒸馏摘要
  recentMessages: Message[];   // 最近10轮原文
}

// ========== 对话历史记录（用户可查） ==========
export interface ChatHistoryRecord {
  sessionId: string;
  timestamp: number;
  messages: Message[];
  rating: number;
  feedback?: string | null;
}

// ========== 会话摘要（云端存储） ==========
export interface SessionSummary {
  id: string;
  userId: string;
  sessionId: string;
  // 核心四要素
  people: string[];
  events: string[];
  time: string;
  emotion: string[];
  // 对话内容
  userMessages: string[];
  aiResponses: string[];
  // 评价
  rating: number;
  feedback?: string | null;
  // 元数据
  timestamp: number;
  emotionTags?: string;
}

// ========== 差评详情（用于分析优化） ==========
export interface NegativeDetail {
  id: string;
  userId: string;
  sessionId: string;
  userMessageBefore: string;
  aiResponse: string;
  rating: number;
  timestamp: number;
}

// ========== AI 蒸馏用的极简画像摘要 ==========
export interface ProfileSummary {
  // 人物事件
  people: string;
  events: string;
  time: string;
  emotion: string;
  // 当前状态
  currentState: string;
  // 需求
  needs: string;
  // 担忧
  worry: string;
  // 性格偏好
  personality: string;
  chatStyle: string;
}

// 转换为 AI 上下文格式
export function toAIContext(profile: UserProfile): string {
  const lines = ['【用户画像】'];
  
  if (profile.people.length > 0) {
    lines.push(`人物：${profile.people.join('、')}`);
  }
  if (profile.events.length > 0) {
    lines.push(`事件：${profile.events.join('、')}`);
  }
  if (profile.time) {
    lines.push(`时间：${profile.time}`);
  }
  if (profile.emotion.length > 0) {
    lines.push(`情绪：${profile.emotion.join('、')}`);
  }
  if (profile.currentState) {
    lines.push(`当前状态：${profile.currentState}`);
  }
  if (profile.needs.length > 0) {
    lines.push(`需求：${profile.needs.join('、')}`);
  }
  if (profile.worry && profile.worry.length > 0) {
    lines.push(`担忧：${profile.worry.join('、')}`);
  }
  if (profile.personality) {
    lines.push(`性格：${profile.personality}`);
  }
  if (profile.chatStyle) {
    lines.push(`聊天风格：${profile.chatStyle}`);
  }
  
  return lines.join('\n');
}

// 从对话中提取四要素
export function extractProfileFromConversation(messages: Message[]): Partial<UserProfile> {
  // 提取用户消息
  const userMsgs = messages.filter(m => m.role === 'user').map(m => m.content);
  
  // 简单关键词匹配（后续可接入NLP）
  const peopleKeywords = ['老板', '同事', '领导', '老公', '老婆', '妈妈', '爸爸', '男朋友', '女朋友', '闺蜜', '朋友', '家人', '孩子', '客户', 'partner', '上司', '下属', '室友'];
  const eventKeywords = ['加班', '离职', '涨薪', '工作量', '报销', '开会', '被骂', '被说', '考核', 'KPI', '升职', '裁员', '内耗', '迷茫', '压力', '焦虑', '失眠', '疲惫', '委屈', '不公平', '付出', '回报'];
  const emotionKeywords = ['疲惫', '无力', '委屈', '迷茫', '压抑', '焦虑', '失眠', '不安', '愤怒', '失望', '绝望', '孤独', '难过', '伤心', '痛苦', '崩溃', '喘不过气', '想哭', '想死', '活够了'];
  const stateKeywords = ['失眠', '睡不醒', '没兴趣', '提不起劲', '没动力', '不想动', '身心俱疲', '透支', '没胃口', '暴饮暴食'];
  
  const extract = (keywords: string[]) => {
    const found: string[] = [];
    for (const msg of userMsgs) {
      for (const kw of keywords) {
        if (msg.includes(kw) && !found.includes(kw)) {
          found.push(kw);
        }
      }
    }
    return found;
  };
  
  return {
    people: extract(peopleKeywords),
    events: extract(eventKeywords),
    emotion: extract(emotionKeywords),
    currentState: extract(stateKeywords).join('、'),
    needs: [],  // 需要进一步引导
    worry: [],  // 需要进一步引导
  };
}