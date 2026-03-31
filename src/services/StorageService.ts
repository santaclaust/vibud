import AsyncStorage from '@react-native-async-storage/async-storage';

// 存储键名
const STORAGE_KEYS = {
  CONFESSIONS: 'xinya_confessions',      // 倾诉记录
  TREEHOLE: 'xinya_treehole',            // 树洞记录
  TIMEMACHINE: 'xinya_timemachine',      // 时光机记录
  CHAT_HISTORY: 'xinya_chat_history',    // AI对话历史
  DRAFT_TREEHOLE: 'xinya_draft_treehole',     // 树洞草稿
  DRAFT_CONFESSION: 'xinya_draft_confession', // 倾诉草稿
  DRAFT_TIMEMACHINE: 'xinya_draft_timemachine', // 时光机草稿
};

// 倾诉记录类型
export interface Confession {
  id: string;
  text: string;
  mode: 'heal' | 'treehole' | 'consult' | 'record' | 'draw';
  timestamp: number;
  reply?: string;  // AI回复（治愈/咨询模式）
}

// 树洞记录类型
export interface TreeHolePost {
  id: string;
  text: string;
  timestamp: number;
  likes: number;
}

// 时光机记录类型
export interface TimeMachineEntry {
  id: string;
  text: string;
  mood?: string;
  imageUrl?: string;
  timestamp: number;
  unlockAt?: number;  // 解锁时间（时间戳），未设置则为undefined
}

// AI对话消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// 对话历史记录（用于用户回查）
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
}

// 通用存储服务
class StorageService {
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

  // 生成唯一ID
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ========== 倾诉相关 ==========
  
  // 保存倾诉记录
  async saveConfession(confession: Omit<Confession, 'id'>): Promise<Confession> {
    const record: Confession = {
      ...confession,
      id: this.generateId(),
    };
    
    const records = await this.getItem<Confession[]>(STORAGE_KEYS.CONFESSIONS) || [];
    records.unshift(record);
    await this.setItem(STORAGE_KEYS.CONFESSIONS, records);
    
    return record;
  }

  // 获取倾诉记录
  async getConfessions(): Promise<Confession[]> {
    return await this.getItem<Confession[]>(STORAGE_KEYS.CONFESSIONS) || [];
  }

  // ========== 树洞相关 ==========

  // 发布树洞
  async postToTreeHole(text: string): Promise<TreeHolePost> {
    const post: TreeHolePost = {
      id: this.generateId(),
      text,
      timestamp: Date.now(),
      likes: 0,
    };
    
    const posts = await this.getItem<TreeHolePost[]>(STORAGE_KEYS.TREEHOLE) || [];
    posts.unshift(post);
    await this.setItem(STORAGE_KEYS.TREEHOLE, posts);
    
    return post;
  }

  // 获取树洞列表
  async getTreeHolePosts(): Promise<TreeHolePost[]> {
    return await this.getItem<TreeHolePost[]>(STORAGE_KEYS.TREEHOLE) || [];
  }

  // ========== 时光机相关 ==========

  // 添加时光记录
  async addTimeMachineEntry(entry: Omit<TimeMachineEntry, 'id'>): Promise<TimeMachineEntry> {
    const record: TimeMachineEntry = {
      ...entry,
      id: this.generateId(),
    };
    
    const records = await this.getItem<TimeMachineEntry[]>(STORAGE_KEYS.TIMEMACHINE) || [];
    records.unshift(record);
    await this.setItem(STORAGE_KEYS.TIMEMACHINE, records);
    
    return record;
  }

  // 获取时光记录
  async getTimeMachineEntries(): Promise<TimeMachineEntry[]> {
    return await this.getItem<TimeMachineEntry[]>(STORAGE_KEYS.TIMEMACHINE) || [];
  }

  // ========== AI对话相关 ==========

  // 保存对话消息
  async addChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const msg: ChatMessage = {
      ...message,
      id: this.generateId(),
    };
    
    const messages = await this.getItem<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY) || [];
    messages.push(msg);
    await this.setItem(STORAGE_KEYS.CHAT_HISTORY, messages);
    
    return msg;
  }

  // 获取对话历史
  async getChatHistory(): Promise<ChatMessage[]> {
    return await this.getItem<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY) || [];
  }

  // 清空对话历史
  async clearChatHistory(): Promise<void> {
    await this.setItem(STORAGE_KEYS.CHAT_HISTORY, []);
  }

  // ========== 草稿缓存 ==========

  // 保存树洞草稿
  async saveTreeHoleDraft(text: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.DRAFT_TREEHOLE, { text, timestamp: Date.now() });
  }

  // 读取树洞草稿
  async getTreeHoleDraft(): Promise<{ text: string; timestamp: number } | null> {
    return await this.getItem(STORAGE_KEYS.DRAFT_TREEHOLE);
  }
  
  // 清空树洞草稿
  async clearTreeHoleDraft(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DRAFT_TREEHOLE);
    } catch (error) {
      console.error('Error clearing treehole draft:', error);
    }
  }

  // 保存倾诉草稿
  async saveConfessionDraft(text: string, mode: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.DRAFT_CONFESSION, { text, mode, timestamp: Date.now() });
  }

  // 读取倾诉草稿
  async getConfessionDraft(): Promise<{ text: string; mode: string; timestamp: number } | null> {
    return await this.getItem(STORAGE_KEYS.DRAFT_CONFESSION);
  }
  
  // 清空倾诉草稿（发送后调用）
  async clearConfessionDraft(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DRAFT_CONFESSION);
    } catch (error) {
      console.error('Error clearing confession draft:', error);
    }
  }

  // 保存时光机草稿
  async saveTimeMachineDraft(text: string, mood: string | null): Promise<void> {
    await this.setItem(STORAGE_KEYS.DRAFT_TIMEMACHINE, { text, mood, timestamp: Date.now() });
  }

  // 读取时光机草稿
  async getTimeMachineDraft(): Promise<{ text: string; mood: string | null; timestamp: number } | null> {
    return await this.getItem(STORAGE_KEYS.DRAFT_TIMEMACHINE);
  }
  
  // 清空时光机草稿
  async clearTimeMachineDraft(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DRAFT_TIMEMACHINE);
    } catch (error) {
      console.error('Error clearing timemachine draft:', error);
    }
  }
  
  // ========== 对话历史存储 ==========
  
  // 保存对话历史（用户可回查）- 支持更新已有记录
  async saveChatHistory(record: ChatHistoryRecord): Promise<void> {
    try {
      let history = await this.getChatHistoryList();
      // 如果已存在相同 sessionId，先移除（更新）
      history = history.filter(h => h.sessionId !== record.sessionId);
      history.unshift(record); // 最新在前
      // 保留最近50条
      const trimmed = history.slice(0, 50);
      await this.setItem(STORAGE_KEYS.CHAT_HISTORY, trimmed);
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }
  
  // 获取对话历史列表
  async getChatHistoryList(): Promise<ChatHistoryRecord[]> {
    return await this.getItem(STORAGE_KEYS.CHAT_HISTORY) || [];
  }
  
  // 获取单条对话详情
  async getChatHistory(sessionId: string): Promise<ChatHistoryRecord | null> {
    const history = await this.getChatHistoryList();
    return history.find(h => h.sessionId === sessionId) || null;
  }
}

export const storageService = new StorageService();
export default storageService;
