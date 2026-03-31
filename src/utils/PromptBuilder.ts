/**
 * 动态 Prompt 构建器
 * 根据用户画像 + 反馈偏好 + 对话上下文构建最优 Prompt
 */

import { PromptConfig, FeedbackAnalysis, UserProfile } from '../types';

// 心芽基础规则
const BASE_SYSTEM = `你是心芽，一个真实的、会聊天的好朋友。
你和用户是平等的，站在用户这边。
聊天方式：像朋友发微信一样自然，不是客服，不是AI。
偶尔会吐槽、会心疼、会跟着用户一起感慨。
用口语、俚语、语气词。不要"官方"。

【回复风格】
- 像朋友聊天，不像客服
- 可以吐槽、可以感慨、可以心疼
- 不用每句都提问，有时可以只是陪伴
- 对方要建议时，可以给一些温和的参考（朋友式分享，不是专家指导）
- 对方问具体问题时，直接给1-2个参考想法，不用绕圈子

【禁止】
- 不要"我理解你的感受"这种官方话
- 不要"首先、其次、然后"这种格式化
- 不要连续提问（最多1个）
- 不要每句话都问问题
- 不要机器人式的"嗯...xxx...呢？"句式

【关于提问】
- 如果用户只是倾诉，不需要问问题，陪伴就好
- 如果用户需要建议，直接给想法，不用先问一堆问题
- 问问题要自然，不要生硬`;

// 构建最优 Prompt
export function buildFinalPrompt(config: PromptConfig): string {
  const parts: string[] = [];

  // 1. 基础人设
  parts.push(BASE_SYSTEM);

  // 2. 用户画像（精简版）
  if (config.profile && hasProfileData(config.profile)) {
    parts.push('\n【用户背景】');
    parts.push(formatProfile(config.profile));
  }

  // 3. 用户专属偏好
  if (config.feedbackAnalysis) {
    parts.push('\n【用户偏好】');
    parts.push(...formatUserStyle(config.feedbackAnalysis));
  }

  // 4. 最近对话（提取核心诉求，减少 Token）
  if (config.recentMessages && config.recentMessages.length > 0) {
    parts.push('\n【最近对话】');
    // 只取最近 4 轮，每轮截断到 100 字
    const recent = config.recentMessages.slice(-4);
    recent.forEach(m => {
      const content = m.content.length > 100 ? m.content.slice(0, 100) + '...' : m.content;
      parts.push(`${m.role === 'user' ? '用户' : '我'}: ${content}`);
    });
  }

  // 5. 当前消息
  parts.push(`\n用户说：${config.currentMessage}`);
  
  // 6. 兜底规则
  parts.push(`\n【兜底规则】\n- 无法判断意图时，默认纯倾诉\n- 禁止极端建议「直接离职」「硬刚」「离婚」\n- 只给参考思路，禁止替用户做决定\n- 必须口语化`);
  
  parts.push('\n请回复：');

  return parts.join('\n');
}

// 检查是否有画像数据
function hasProfileData(profile: any): boolean {
  return profile && (
    (profile.people && profile.people.length > 0) ||
    (profile.events && profile.events.length > 0) ||
    (profile.emotion && profile.emotion.length > 0) ||
    profile.currentState
  );
}

// 格式化用户画像
function formatProfile(p: any): string[] {
  const lines: string[] = [];
  
  if (p.people?.length) {
    lines.push(`涉及人：${p.people.slice(0, 3).join('、')}`);
  }
  if (p.events?.length) {
    lines.push(`相关事：${p.events.slice(0, 3).join('、')}`);
  }
  if (p.emotion?.length) {
    lines.push(`情绪状态：${p.emotion.slice(0, 3).join('、')}`);
  }
  
  return lines;
}

// 格式化用户偏好（含反馈闭环）
function formatUserStyle(analysis: FeedbackAnalysis): string[] {
  const lines: string[] = [];
  
  // 禁用词（用户不喜欢的表达）
  if (analysis.avoidPhrases.length > 0) {
    lines.push(`禁止：${analysis.avoidPhrases.slice(0, 5).join('、')}`);
  }
  
  // 偏好词（用户喜欢的表达）
  if (analysis.preferPhrases.length > 0) {
    lines.push(`推荐使用：${analysis.preferPhrases.slice(0, 5).join('、')}`);
  }
  
  // 负面反馈修正规则
  if (analysis.negativeFeedbackCount > analysis.positiveFeedbackCount * 2) {
    lines.push(`【重要】用户近期反馈较差，请减少提问，优先给出思路`);
  }
  
  // 正面反馈强化规则
  if (analysis.positiveFeedbackCount > analysis.negativeFeedbackCount * 2) {
    lines.push(`【重要】用户喜欢直接给建议，多给具体表达思路`);
  }
  
  return lines;
}

// 获取简短 Prompt
export function buildQuickPrompt(
  userMessage: string,
  profile?: any,
  feedbackAnalysis?: FeedbackAnalysis
): string {
  const parts: string[] = [BASE_SYSTEM];

  if (profile && hasProfileData(profile)) {
    parts.push('\n【用户】');
    parts.push(formatProfile(profile).join('\n'));
  }

  parts.push(`\n用户：${userMessage}`);
  parts.push('\n回复：');

  return parts.join('\n');
}

// 获取 Base System
export function getBaseSystem(): string {
  return BASE_SYSTEM;
}