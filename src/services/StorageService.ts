import AsyncStorage from '@react-native-async-storage/async-storage';

// 获取带用户ID的存储键
const getKey = (base: string, userId: string = 'guest') => `${base}_${userId}`;

// 存储键名（基础部分）
const BASE_KEYS = {
  CONFESSIONS: 'xinya_confessions',
  TREEHOLE: 'xinya_treehole',
  TIMEMACHINE: 'xinya_timemachine',
  CHAT_HISTORY: 'xinya_chat_history',
  DRAFT_TREEHOLE: 'xinya_draft_treehole',
  DRAFT_CONFESSION: 'xinya_draft_confession',
  DRAFT_TIMEMACHINE: 'xinya_draft_timemachine',
  TEMPERAMENT_RESULT: 'xinya_temperament_result',
};

// 倾诉记录类型
export interface Confession {
  id: string;
  text: string;
  mode: 'heal' | 'treehole' | 'consult' | 'record' | 'draw';
  timestamp: number;
  reply?: string;
  userId?: string;
}

// 树洞记录类型
export interface TreeHolePost {
  id: string;
  text: string;
  timestamp: number;
  likes: number;
  comments: number;
  isLiked: boolean;
  userId?: string;
}

// 气质测试结果类型
export interface TemperamentResult {
  primaryType: string;
  secondaryType: string;
  resultType: string;
  plant: string;
  scores: {
    bile: number;
    blood: number;
    slime: number;
    depression: number;
  };
  completionRate?: number;
  bonusPercent?: number;
  baseScore?: number;
  finalScore?: number;
}

// 时光机记录类型
export interface TimeMachineEntry {
  id: string;
  text: string;
  mood?: string;
  imageUrl?: string;
  timestamp: number;
  unlockAt?: number;
  userId?: string;
}

// AI对话消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// 对话历史记录
export interface ChatHistoryRecord {
  sessionId: string;
  timestamp: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  rating: number;
  feedback?: string | null;
  userId?: string;
}

// 通用存储服务
class StorageService {
  private userId: string = 'guest';

  setUserId(uid: string) {
    this.userId = uid;
  }
  
  getUserId(): string {
    return this.userId;
  }

  private async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return null;
    }
  }

  private async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing ${key}:`, error);
      return false;
    }
  }

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ========== 倾诉相关 ==========
  
  async saveConfession(confession: Omit<Confession, 'id'>): Promise<Confession> {
    const record: Confession = {
      ...confession,
      id: this.generateId(),
      userId: this.userId,
    };
    
    const key = getKey(BASE_KEYS.CONFESSIONS, this.userId);
    const records = await this.getItem<Confession[]>(key) || [];
    records.unshift(record);
    await this.setItem(key, records);
    
    return record;
  }

  async getConfessions(): Promise<Confession[]> {
    const key = getKey(BASE_KEYS.CONFESSIONS, this.userId);
    return await this.getItem<Confession[]>(key) || [];
  }

  // ========== 树洞相关 ==========

  async postToTreeHole(text: string): Promise<TreeHolePost> {
    const post: TreeHolePost = {
      id: this.generateId(),
      text,
      timestamp: Date.now(),
      likes: 0,
      userId: this.userId,
    };
    
    const key = getKey(BASE_KEYS.TREEHOLE, this.userId);
    const posts = await this.getItem<TreeHolePost[]>(key) || [];
    posts.unshift(post);
    await this.setItem(key, posts);
    
    return post;
  }

  async getTreeHolePosts(): Promise<TreeHolePost[]> {
    const key = getKey(BASE_KEYS.TREEHOLE, this.userId);
    return await this.getItem<TreeHolePost[]>(key) || [];
  }

  // ========== 时光机相关 ==========

  async addTimeMachineEntry(entry: Omit<TimeMachineEntry, 'id'>): Promise<TimeMachineEntry> {
    const record: TimeMachineEntry = {
      ...entry,
      id: this.generateId(),
      userId: this.userId,
    };
    
    const key = getKey(BASE_KEYS.TIMEMACHINE, this.userId);
    const records = await this.getItem<TimeMachineEntry[]>(key) || [];
    records.unshift(record);
    await this.setItem(key, records);
    
    return record;
  }

  async getTimeMachineEntries(): Promise<TimeMachineEntry[]> {
    const key = getKey(BASE_KEYS.TIMEMACHINE, this.userId);
    return await this.getItem<TimeMachineEntry[]>(key) || [];
  }

  // ========== AI对话相关 ==========

  async addChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const msg: ChatMessage = {
      ...message,
      id: this.generateId(),
    };
    
    const key = getKey(BASE_KEYS.CHAT_HISTORY, this.userId);
    const messages = await this.getItem<ChatMessage[]>(key) || [];
    messages.push(msg);
    await this.setItem(key, messages);
    
    return msg;
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    const key = getKey(BASE_KEYS.CHAT_HISTORY, this.userId);
    return await this.getItem<ChatMessage[]>(key) || [];
  }

  async clearChatHistory(): Promise<void> {
    const key = getKey(BASE_KEYS.CHAT_HISTORY, this.userId);
    await this.setItem(key, []);
  }

  // ========== 草稿缓存 ==========

  async saveTreeHoleDraft(text: string): Promise<void> {
    const key = getKey(BASE_KEYS.DRAFT_TREEHOLE, this.userId);
    await this.setItem(key, { text, timestamp: Date.now() });
  }

  async getTreeHoleDraft(): Promise<{ text: string; timestamp: number } | null> {
    const key = getKey(BASE_KEYS.DRAFT_TREEHOLE, this.userId);
    return await this.getItem(key);
  }
  
  async clearTreeHoleDraft(): Promise<void> {
    const key = getKey(BASE_KEYS.DRAFT_TREEHOLE, this.userId);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing treehole draft:', error);
    }
  }

  async saveConfessionDraft(text: string, mode: string): Promise<void> {
    const key = getKey(BASE_KEYS.DRAFT_CONFESSION, this.userId);
    await this.setItem(key, { text, mode, timestamp: Date.now() });
  }

  async getConfessionDraft(): Promise<{ text: string; mode: string; timestamp: number } | null> {
    const key = getKey(BASE_KEYS.DRAFT_CONFESSION, this.userId);
    return await this.getItem(key);
  }
  
  async clearConfessionDraft(): Promise<void> {
    const key = getKey(BASE_KEYS.DRAFT_CONFESSION, this.userId);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing confession draft:', error);
    }
  }

  async saveTimeMachineDraft(text: string, mood: string | null): Promise<void> {
    const key = getKey(BASE_KEYS.DRAFT_TIMEMACHINE, this.userId);
    await this.setItem(key, { text, mood, timestamp: Date.now() });
  }

  async getTimeMachineDraft(): Promise<{ text: string; mood: string | null; timestamp: number } | null> {
    const key = getKey(BASE_KEYS.DRAFT_TIMEMACHINE, this.userId);
    return await this.getItem(key);
  }
  
  async clearTimeMachineDraft(): Promise<void> {
    const key = getKey(BASE_KEYS.DRAFT_TIMEMACHINE, this.userId);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing timemachine draft:', error);
    }
  }
  
  // ========== 气质测试结果存储 ==========
  
  async saveTemperamentResult(result: TemperamentResult): Promise<void> {
    const key = getKey(BASE_KEYS.TEMPERAMENT_RESULT, this.userId);
    await this.setItem(key, { ...result, savedAt: Date.now() });
  }
  
  async getTemperamentResult(): Promise<(TemperamentResult & { savedAt: number }) | null> {
    const key = getKey(BASE_KEYS.TEMPERAMENT_RESULT, this.userId);
    return await this.getItem(key);
  }
  
  // ========== 对话历史存储 ==========
  
  async saveChatHistory(record: ChatHistoryRecord): Promise<void> {
    try {
      const key = getKey(BASE_KEYS.CHAT_HISTORY, this.userId);
      let history = await this.getItem<ChatHistoryRecord[]>(key) || [];
      history = history.filter(h => h.sessionId !== record.sessionId);
      history.unshift({ ...record, userId: this.userId });
      const trimmed = history.slice(0, 50);
      await this.setItem(key, trimmed);
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }
  
  async getChatHistoryList(): Promise<ChatHistoryRecord[]> {
    const key = getKey(BASE_KEYS.CHAT_HISTORY, this.userId);
    return await this.getItem(key) || [];
  }
  
  async getChatHistory(sessionId: string): Promise<ChatHistoryRecord | null> {
    const history = await this.getChatHistoryList();
    return history.find(h => h.sessionId === sessionId) || null;
  }
}

export const storageService = new StorageService();
export default storageService;