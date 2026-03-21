import AsyncStorage from '@react-native-async-storage/async-storage';

// 存储键名
const STORAGE_KEYS = {
  CONFESSIONS: 'xinya_confessions',      // 倾诉记录
  TREEHOLE: 'xinya_treehole',            // 树洞记录
  TIMEMACHINE: 'xinya_timemachine',      // 时光机记录
  CHAT_HISTORY: 'xinya_chat_history',    // AI对话历史
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
}

// AI对话消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
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
}

export const storageService = new StorageService();
export default storageService;
