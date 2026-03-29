/**
 * 用户上下文枚举和接口定义
 */

// 用户群体枚举
export enum UserGroup {
  ADOLESCENT = '青少年',
  WORKER = '职场人士', 
  CHRONIC_PATIENT = '慢性病患者',
  GENERAL = '通用'
}

// 情绪强度枚举
export enum EmotionIntensity {
  LOW = '低',
  MEDIUM = '中',
  HIGH = '高',
  CRISIS = '危机'
}

// 对话阶段枚举
export enum ConversationStage {
  INITIAL = '初始接触',
  EXPLORE = '深度探索',
  INSIGHT = '洞察行动',
  CLOSING = '结束阶段'
}

// 用户上下文接口
export interface UserContext {
  user_id: string;
  user_group: UserGroup;
  emotion_intensity: EmotionIntensity;
  conversation_stage: ConversationStage;
  current_round: number;
  risk_level: number; // 1-3, 1为最高风险
  last_response_style?: string;
}

// 语料条目接口
export interface CorpusItem {
  content: string;
  category: string;
  subcategory: string;
  user_groups: string[];
  emotion_intensity: string[];
  conversation_stages: string[];
  psychology_theory: string;
  style_tags: string[];
  usage_count: number;
  effectiveness_score: number;
}
