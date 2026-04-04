/**
 * 对话记忆管理器
 * 管理用户对话上下文、本地持久化、历史蒸馏
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Message, toAIContext } from '../types/UserProfile';
import { generateProfileFromChat, mergeProfile, inferChatStyle, inferPersonality } from '../utils/ProfileParser';
import { addDocument, queryDocuments, updateDocument, initCloudBase } from './CloudBaseService';

const MAX_RECENT = 10;

// 获取带用户ID的存储键
const getSessionKey = (userId: string) => `CHAT_SESSION_${userId}`;
const getProfileKey = (userId: string) => `USER_PROFILE_${userId}`;

// 内存中的会话数据
interface ChatMemoryData {
  sessionId: string;
  summary: string;
  recentMessages: Message[];
}

export class ChatMemoryManager {
  private userId: string = 'guest';
  private memory: ChatMemoryData;
  private profile: UserProfile | null = null;

  constructor() {
    this.memory = {
      sessionId: `sess_${Date.now()}`,
      summary: '',
      recentMessages: [],
    };
  }

  // 设置用户ID
  setUserId(uid: string) {
    this.userId = uid;
  }

  getUserId(): string {
    return this.userId;
  }

  // 初始化：加载本地持久化数据
  async init(uid?: string) {
    if (uid) this.userId = uid;
    
    try {
      const sessionKey = getSessionKey(this.userId);
      const profileKey = getProfileKey(this.userId);
      
      const savedSession = await AsyncStorage.getItem(sessionKey);
      if (savedSession) {
        this.memory = JSON.parse(savedSession);
      }
      
      const savedProfile = await AsyncStorage.getItem(profileKey);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        const ensureArray = (val: any): string[] => {
          if (Array.isArray(val)) return val;
          if (val && typeof val === 'string') return [val];
          return [];
        };
        this.profile = {
          userId: parsed.userId || this.userId,
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

    if (this.memory.recentMessages.length > MAX_RECENT) {
      const oldest = this.memory.recentMessages.shift();
      if (oldest && oldest.role === 'user') {
        await this.distillOldMessage(oldest);
      }
    }

    await this.save();
  }

  // 蒸馏旧消息
  async distillOldMessage(msg: { role: string; content: string }) {
    const content = msg.content;
    
    const emotionWords = ['难过', '委屈', '生气', '焦虑', '疲惫', '绝望', '无奈', '心累', '失眠', '压力', '迷茫'];
    const foundEmotions = emotionWords.filter(w => content.includes(w));

    const topicWords = ['工作', '学习', '家庭', '感情', '人际', '健康', '未来', '事业'];
    const foundTopics = topicWords.filter(w => content.includes(w));

    const parts: string[] = [];
    if (foundEmotions.length > 0) parts.push(`情绪:${foundEmotions.join('/')}`);
    if (foundTopics.length > 0) parts.push(`话题:${foundTopics.join('/')}`);

    const keyInfo = parts.length > 0 ? parts.join('；') : '持续倾��中';

    this.memory.summary += `\n${keyInfo}`;
    this.memory.summary = this.memory.summary.trim();
    
    await this.updateProfileFromChat();
  }

  // 从对话中提取并更新画像
  async updateProfileFromChat() {
    if (!this.profile) {
      this.profile = {
        userId: this.userId,
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
    
    const extracted = this.extractFromMessages(this.memory.recentMessages);
    this.profile = mergeProfile(this.profile, extracted);
    await this.saveProfile();
  }

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

  async setProfile(profile: UserProfile) {
    this.profile = profile;
    this.userId = profile.userId || this.userId;
    await this.saveProfile();
  }

  getProfile(): UserProfile | null {
    return this.profile;
  }

  getProfileForSync(): Partial<UserProfile> | null {
    if (!this.profile) return null;
    
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

  getProfileForAI(): string {
    if (!this.profile) return '';
    return toAIContext(this.profile);
  }

  getUploadPackage() {
    const history: Array<{ role: string; content: string }> = this.memory.recentMessages.map(m => ({
      role: m.role,
      content: m.content.slice(0, 200)
    }));

    return {
      sessionId: this.memory.sessionId,
      summary: this.memory.summary,
      recentMessages: history,
      profile: this.profile ? toAIContext(this.profile) : '',
    };
  }

  private async save() {
    try {
      const key = getSessionKey(this.userId);
      await AsyncStorage.setItem(key, JSON.stringify(this.memory));
    } catch (e) {
      console.log('[Memory] 会话保存失败:', e);
    }
  }

  private async saveProfile() {
    try {
      if (this.profile) {
        const key = getProfileKey(this.userId);
        await AsyncStorage.setItem(key, JSON.stringify(this.profile));
      }
    } catch (e) {
      console.log('[Memory] 画像保存失败:', e);
    }
  }

  async clearSession() {
    this.memory = {
      sessionId: `sess_${Date.now()}`,
      summary: this.memory.summary,
      recentMessages: [],
    };
    await this.save();
  }
  
  async syncToCloud(userId?: string): Promise<boolean> {
    const uid = userId || this.userId;
    try {
      await initCloudBase();
      const uploadPkg = this.getUploadPackage();
      
      const existing = await queryDocuments('user_profiles', { userId: uid }, undefined, 1);
      
      if (existing.data && existing.data.length > 0) {
        await updateDocument('user_profiles', existing.data[0]._id, {
          ...uploadPkg.profile,
          summary: uploadPkg.summary,
          lastSyncAt: Date.now(),
          userId: uid,
        });
      } else {
        await addDocument('user_profiles', {
          ...uploadPkg.profile,
          summary: uploadPkg.summary,
          lastSyncAt: Date.now(),
          userId: uid,
          createdAt: Date.now(),
        });
      }
      
      console.log('[ChatMemory] 云端同步成功');
      return true;
    } catch (e) {
      console.error('[ChatMemory] 云端同步失败:', e);
      return false;
    }
  }

  async restoreFromCloud(userId?: string): Promise<boolean> {
    const uid = userId || this.userId;
    try {
      await initCloudBase();
      const existing = await queryDocuments('user_profiles', { userId: uid }, undefined, 1);
      
      if (existing.data && existing.data.length > 0) {
        const cloudProfile = existing.data[0];
        
        if (cloudProfile.emotionProfile) {
          this.profile = { ...this.profile, ...cloudProfile };
        }
        
        if (cloudProfile.summary) {
          this.memory.summary = cloudProfile.summary;
        }
        
        await this.saveProfile();
        console.log('[ChatMemory] 云端恢复成功');
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('[ChatMemory] 云端恢复失败:', e);
      return false;
    }
  }

  async clear() {
    const sessionKey = getSessionKey(this.userId);
    const profileKey = getProfileKey(this.userId);
    
    this.memory = {
      sessionId: `sess_${Date.now()}`,
      summary: '',
      recentMessages: [],
    };
    this.profile = null;
    await AsyncStorage.removeItem(sessionKey);
    await AsyncStorage.removeItem(profileKey);
  }
}

export const chatMemory = new ChatMemoryManager();