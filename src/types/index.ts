/**
 * 心芽项目・类型定义
 * 用户画像 + 反馈分析 + Prompt 配置
 */

// ========== 用户画像 ==========
export interface UserProfile {
  userId: string;
  sessionId?: string;
  people: string[];
  events: string[];
  time: string;
  emotion: string[];
  currentState?: string;
  needs: string[];
  worry?: string[];
  personality?: string;
  chatStyle?: string;
}

// ========== 消息反馈 ==========
export interface MessageFeedback {
  messageId: string;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
  rating: 1 | 2 | 3 | 4 | 5; // 1=很差 5=完美
  reason?: 'too_suggest' | 'too_robotic' | 'not_empathic' | 'off_topic' | 'too_long' | 'other';
  timestamp: number;
  context: {
    stage: number;
    profile: Partial<UserProfile>;
    recentMessages: Array<{ role: string; content: string }>;
  };
}

// ========== 反馈分析结果（核心） ==========
export interface FeedbackAnalysis {
  userStyle: {
    preferredTone: string[]; // 喜欢的语气：温柔、简短、安静、共情
    preferredLength: 'short' | 'normal' | 'long';
  };
  goodPatterns: string[];
  badPatterns: string[];
  preferPhrases: string[];
  avoidPhrases: string[];
  forbiddenActions: string[];
  positiveFeedbackCount?: number;  // 好评次数
  negativeFeedbackCount?: number; // 差评次数
  totalFeedbackCount?: number;     // 总反馈次数
}

// ========== Prompt 配置 ==========
export interface PromptConfig {
  systemBase: string;
  profile: UserProfile | any;
  stage: number;
  recentMessages: Array<{ role: string; content: string }>;
  currentMessage: string;
  feedbackAnalysis?: FeedbackAnalysis;
}

// ========== 对话消息 ==========
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  displayText?: string;
  isTyping?: boolean;
  rating?: number;
}

// ========== 对话历史记录 ==========
export interface ChatHistoryRecord {
  sessionId: string;
  timestamp: number;
  messages: ChatMessage[];
  rating: number;
  feedback?: string | null;
}

// ========== AI 回复接口 ==========
export interface AIResponse {
  text: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}