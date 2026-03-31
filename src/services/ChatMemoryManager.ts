/**
 * 对话记忆管理器
 * 管理用户对话上下文、本地持久化、历史蒸馏
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Message, toAIContext } from '../types/UserProfile';
import { generateProfileFromChat, mergeProfile, inferChatStyle, inferPersonality } from '../utils/ProfileParser';

const SESSION_KEY = 'CHAT_SESSION';
const PROFILE_KEY = 'USER_PROFILE';
const MAX_RECENT = 10; // 最近10轮原文

// 内存中的会话数据
interface ChatMemoryData {
  sessionId: string;
  summary: string;  // 久远对话蒸馏摘要
  recentMessages: Message[];  // 最近10轮原文
}

export class ChatMemoryManager {
  private memory: ChatMemoryData;
  private profile: UserProfile | null = null;

  constructor() {
    this.memory = {
      sessionId: `sess_${Date.now()}`,
      summary: '',
      recentMessages: [],
    };
  }

  // 初始化：加载本地持久化数据
  async init() {
    try {
      // 加载会话记忆
      const savedSession = await AsyncStorage.getItem(SESSION_KEY);
      if (savedSession) {
        this.memory = JSON.parse(savedSession);
      }
      
      // 加载用户画像
      const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        // 确保数组字段是数组
        const ensureArray = (val: any): string[] => {
          if (Array.isArray(val)) return val;
          if (val && typeof val === 'string') return [val];
          return [];
        };
        this.profile = {
          userId: parsed.userId || 'guest',
          people: ensureArray(parsed.people),
          events: ensureArray(parsed.events),
          time: parsed.time || '',
          emotion: ensureArray(parsed.emotion),
          currentState: parsed.currentState || '',
          needs: ensureArray(parsed.needs),
          worry: ensureArray(parsed.worry),
          personality: parsed.personality || '',
          chatStyle: parsed.chatStyle || '',
        };
      }
    } catch (e) {
      console.log('[Memory] 加载失败:', e);
    }
  }

  // 新增一条对话
  async addMessage(role: 'user' | 'assistant', content: string) {
    this.memory.recentMessages.push({ role, content, timestamp: Date.now() });

    // 超过10条 → 自动蒸馏最旧的消息
    if (this.memory.recentMessages.length > MAX_RECENT) {
      const oldest = this.memory.recentMessages.shift();
      if (oldest && oldest.role === 'user') {
        await this.distillOldMessage(oldest);
      }
    }

    await this.save();
  }

  // 蒸馏旧消息 → 生成摘要
  async distillOldMessage(msg: { role: string; content: string }) {
    const content = msg.content;
    
    // 情绪关键词
    const emotionWords = ['难过', '委屈', '生气', '焦虑', '疲惫', '绝望', '无奈', '心累', '失眠', '压力', '迷茫'];
    const foundEmotions = emotionWords.filter(w => content.includes(w));

    // 话题关键词
    const topicWords = ['工作', '学习', '家庭', '感情', '人际', '健康', '未来', '事业'];
    const foundTopics = topicWords.filter(w => content.includes(w));

    // 构建蒸馏信息
    const parts: string[] = [];
    if (foundEmotions.length > 0) parts.push(`情绪:${foundEmotions.join('/')}`);
    if (foundTopics.length > 0) parts.push(`话题:${foundTopics.join('/')}`);

    const keyInfo = parts.length > 0 ? parts.join('；') : '持续倾诉中';

    // 合并到总摘要
    this.memory.summary += `\n${keyInfo}`;
    this.memory.summary = this.memory.summary.trim();
    
    // 更新画像
    await this.updateProfileFromChat();
  }

  // 从对话中提取并更新画像
  async updateProfileFromChat() {
    if (!this.profile) {
      this.profile = {
        userId: 'guest',
        people: [],
        events: [],
        time: '',
        emotion: [],
        needs: [],
        worry: [],
        personality: '',
        chatStyle: '',
        currentState: '',
      };
    }
    
    // 从最近对话中提取四要素
    const extracted = this.extractFromMessages(this.memory.recentMessages);
    
    // 合并到现有画像
    this.profile = mergeProfile(this.profile, extracted);
    
    // 保存画像
    await this.saveProfile();
  }

  // 从消息中提取四要素
  private extractFromMessages(messages: Message[]): Partial<UserProfile> {
    const userMsgs = messages.filter(m => m.role === 'user').map(m => m.content);
    
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
      people: extract(['老板', '同事', '领导', '老公', '老婆', '妈妈', '爸爸', '朋友', '客户']),
      events: extract(['加班', '离职', '涨薪', '工作量', '报销', '开会', '被骂', '考核', 'KPI', '内耗', '迷茫']),
      emotion: extract(['疲惫', '无力', '委屈', '迷茫', '压抑', '焦虑', '失眠', '不安', '愤怒', '失望']),
      currentState: extract(['失眠', '睡不醒', '没兴趣', '提不起劲', '没动力', '不想动', '身心俱疲']).join('、'),
    };
  }

  // 手动设置用户画像
  async setProfile(profile: UserProfile) {
    this.profile = profile;
    await this.saveProfile();
  }

  // 获取用户画像（本地）
  getProfile(): UserProfile | null {
    return this.profile;
  }

  // 获取用户画像（带JSON结构，用于云端同步）
  getProfileForSync(): Partial<UserProfile> | null {
    if (!this.profile) return null;
    
    // 确保所有数组字段都是数组
    const ensureArray = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'string') return [val];
      return [];
    };
    
    return {
      userId: this.profile.userId,
      people: ensureArray(this.profile.people),
      events: ensureArray(this.profile.events),
      time: this.profile.time || '',
      emotion: ensureArray(this.profile.emotion),
      currentState: this.profile.currentState || '',
      needs: ensureArray(this.profile.needs),
      worry: ensureArray(this.profile.worry),
      personality: this.profile.personality || '',
      chatStyle: this.profile.chatStyle || '',
    };
  }

  // 获取 AI 上下文格式的画像摘要
  getProfileForAI(): string {
    if (!this.profile) return '';
    return toAIContext(this.profile);
  }

  // 打包发送给云函数的结构
  getUploadPackage() {
    // 最近10轮原文
    const history: Array<{ role: string; content: string }> = this.memory.recentMessages.map(m => ({
      role: m.role,
      content: m.content.slice(0, 200)
    }));

    return {
      sessionId: this.memory.sessionId,
      summary: this.memory.summary,
      recentMessages: history,
      profile: this.profile ? toAIContext(this.profile) : '', // AI可读的画像
    };
  }

  // 持久化保存会话
  private async save() {
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(this.memory));
    } catch (e) {
      console.log('[Memory] 会话保存失败:', e);
    }
  }

  // 持久化保存画像
  private async saveProfile() {
    try {
      if (this.profile) {
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
      }
    } catch (e) {
      console.log('[Memory] 画像保存失败:', e);
    }
  }

  // 清空会话（保留画像）
  async clearSession() {
    this.memory = {
      sessionId: `sess_${Date.now()}`,
      summary: this.memory.summary, // 保留蒸馏摘要
      recentMessages: [],
    };
    await this.save();
  }

  // 清空全部（包括画像）
  async clear() {
    this.memory = {
      sessionId: `sess_${Date.now()}`,
      summary: '',
      recentMessages: [],
    };
    this.profile = null;
    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem(PROFILE_KEY);
  }
}

// 导出单例
export const chatMemory = new ChatMemoryManager();