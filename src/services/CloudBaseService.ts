/**
 * CloudBase (腾讯云开发) 服务层
 * 替换 Firebase，适配国内网络环境
 * 
 * 安装: npm install @cloudbase/js-sdk
 * 文档: https://docs.cloudbase.net/api-reference/webv2/initialization.html
 */

import cloudbase from '@cloudbase/js-sdk';

// ========== CloudBase 配置 ==========
// 环境ID: vibud-1gcx4a5580370c2f

const cloudbaseConfig = {
  env: 'vibud-1gcx4a5580370c2f',
};

// ========== 初始化 ==========
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any = null;
let initialized = false;

export const initCloudBase = async (): Promise<boolean> => {
  if (initialized) return true;
  
  try {
    app = cloudbase.init(cloudbaseConfig);
    initialized = true;
    console.log('[CloudBase] 初始化成功');
    return true;
  } catch (err) {
    console.error('[CloudBase] 初始化失败:', err);
    return false;
  }
};

// ========== 认证服务 ==========

/**
 * 获取登录状态
 */
export const getAuthState = async () => {
  if (!initialized) await initCloudBase();
  return app!.auth({ persistence: 'local' }).getAuthState();
};

/**
 * 获取当前用户
 */
export const getCurrentUser = async () => {
  if (!initialized) await initCloudBase();
  return app!.auth({ persistence: 'local' }).currentUser;
};

/**
 * 匿名登录（最快速，无需配置）
 * 适合 MVP 阶段先跑通功能
 */
export const signInAnonymously = async () => {
  if (!initialized) await initCloudBase();
  return await app!.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
};

/**
 * 手机号登录（需要开通短信服务）
 */
export const signInWithPhone = async (phoneNumber: string, phoneCode: string) => {
  if (!initialized) await initCloudBase();
  // 需在控制台开通短信服务后使用
  return await app!.auth({ persistence: 'local' }).signInWithPhoneCode(phoneNumber, phoneCode);
};

/**
 * 退出登录
 */
export const logout = async () => {
  if (!initialized) await initCloudBase();
  return await app!.auth({ persistence: 'local' }).signOut();
};

/**
 * 监听登录状态变化
 */
export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!initialized) initCloudBase();
  return app!.auth({ persistence: 'local' }).onAuthStateChanged(callback);
};

// ========== 数据库操作 ==========

/**
 * 添加文档
 */
export const addDocument = async (collName: string, data: object) => {
  if (!initialized) await initCloudBase();
  return await app!.database().collection(collName).add({ data });
};

/**
 * 查询文档列表
 */
export const queryDocuments = async (
  collName: string,
  where?: Record<string, any>,
  orderBy?: { field: string; order: 'asc' | 'desc' }[],
  limitCount = 100
) => {
  if (!initialized) await initCloudBase();
  
  let q = app!.database().collection(collName);
  
  if (where) {
    q = q.where(where);
  }
  
  if (orderBy) {
    orderBy.forEach(o => {
      q = q.orderBy(o.field, o.order);
    });
  } else {
    q = q.orderBy('createdAt', 'desc');
  }
  
  return await q.limit(limitCount).get();
};

/**
 * 查询单个文档（通过 _id）
 */
export const getDocument = async (collName: string, docId: string) => {
  if (!initialized) await initCloudBase();
  return await app!.database().collection(collName).doc(docId).get();
};

/**
 * 更新文档
 */
export const updateDocument = async (collName: string, docId: string, data: object) => {
  if (!initialized) await initCloudBase();
  return await app!.database().collection(collName).doc(docId).update({ data });
};

/**
 * 删除文档
 */
export const deleteDocument = async (collName: string, docId: string) => {
  if (!initialized) await initCloudBase();
  return await app!.database().collection(collName).doc(docId).remove();
};

// ========== 数据模型 ==========

export interface UserProfile {
  _id?: string;
  id: string;
  phone?: string;
  nickname?: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
  stats?: {
    confessionCount: number;
    treeholeCount: number;
    timeMachineCount: number;
    continuousDays: number;
  };
}

export interface Confession {
  _id?: string;
  id: string;
  userId: string;
  text: string;
  mode: 'heal' | 'consult';
  timestamp: number;
  reply?: string;
}

export interface TreeHolePost {
  _id?: string;
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  likes: number;
  likedBy?: string[];
}

export interface TimeMachineEntry {
  _id?: string;
  id: string;
  userId: string;
  text: string;
  mood?: string;
  imageUrl?: string;
  timestamp: number;
}

export interface Favorite {
  _id?: string;
  id: string;
  userId: string;
  type: 'confession' | 'treehole' | 'timemachine';
  targetId: string;
  timestamp: number;
}

export interface Message {
  _id?: string;
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  timestamp: number;
}

// ========== 业务层封装 ==========

/** 创建/更新用户资料 */
export const saveUserProfile = async (profile: UserProfile) => {
  const now = Date.now();
  // 先查询是否存在
  const existing = await queryDocuments('users', { id: profile.id }, undefined, 1);
  
  if (existing.data?.length > 0) {
    const docId = existing.data[0]._id;
    return await updateDocument('users', docId, { ...profile, updatedAt: now });
  } else {
    return await addDocument('users', { ...profile, createdAt: now, updatedAt: now });
  }
};

/** 获取用户资料 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const res = await queryDocuments('users', { id: userId }, undefined, 1);
  return res.data?.[0] || null;
};

/** 保存倾诉记录 */
export const saveConfession = async (confession: Omit<Confession, 'id' | '_id'>) => {
  const id = `conf_${Date.now()}`;
  return await addDocument('confessions', { ...confession, id, timestamp: Date.now() });
};

/** 获取倾诉记录 */
export const getUserConfessions = async (userId: string, limitCount = 50) => {
  const res = await queryDocuments(
    'confessions',
    { userId },
    [{ field: 'timestamp', order: 'desc' }],
    limitCount
  );
  return res.data || [];
};

/** 发布树洞 */
export const postTreeHole = async (post: Omit<TreeHolePost, 'id' | '_id'>) => {
  const id = `tree_${Date.now()}`;
  return await addDocument('treehole', { ...post, id, timestamp: Date.now() });
};

/** 获取树洞列表 */
export const getTreeHolePosts = async (limitCount = 100) => {
  const res = await queryDocuments(
    'treehole',
    undefined,
    [{ field: 'timestamp', order: 'desc' }],
    limitCount
  );
  return res.data || [];
};

/** 点赞树洞 */
export const likeTreeHole = async (postId: string, userId: string) => {
  const posts = await queryDocuments('treehole', { id: postId }, undefined, 1);
  
  if (posts.data?.[0]) {
    const post = posts.data[0] as TreeHolePost;
    const likedBy = post.likedBy || [];
    if (!likedBy.includes(userId)) {
      return await updateDocument('treehole', post._id!, {
        likes: (post.likes || 0) + 1,
        likedBy: [...likedBy, userId]
      });
    }
  }
};

/** 添加收藏 */
export const addFavorite = async (userId: string, type: Favorite['type'], targetId: string) => {
  const id = `${userId}_${type}_${targetId}`;
  return await addDocument('favorites', { id, userId, type, targetId, timestamp: Date.now() });
};

/** 获取用户收藏 */
export const getUserFavorites = async (userId: string) => {
  const res = await queryDocuments('favorites', { userId }, [{ field: 'timestamp', order: 'desc' }]);
  return res.data || [];
};

/** 保存时光机记录 */
export const saveTimeMachineEntry = async (entry: Omit<TimeMachineEntry, 'id' | '_id'>) => {
  const id = `time_${Date.now()}`;
  return await addDocument('timemachine', { ...entry, id, timestamp: Date.now() });
};

/** 获取用户时光机记录 */
export const getUserTimeMachine = async (userId: string, limitCount = 50) => {
  const res = await queryDocuments(
    'timemachine',
    { userId },
    [{ field: 'timestamp', order: 'desc' }],
    limitCount
  );
  return res.data || [];
};

/** 保存消息 */
export const saveMessage = async (message: Omit<Message, 'id' | '_id'>) => {
  const id = `msg_${Date.now()}`;
  return await addDocument('messages', { ...message, id, timestamp: Date.now() });
};

/** 获取用户消息 */
export const getUserMessages = async (userId: string) => {
  const res = await queryDocuments(
    'messages',
    { userId },
    [{ field: 'timestamp', order: 'desc' }],
    50
  );
  return res.data || [];
};

/** 标记消息已读 */
export const markMessageRead = async (docId: string) => {
  return await updateDocument('messages', docId, { read: true });
};

// ========== 文件存储 ==========

/**
 * 上传文件
 */
export const uploadFile = async (cloudPath: string, filePath: string) => {
  if (!initialized) await initCloudBase();
  return await app!.uploadFile({ cloudPath, filePath });
};

/**
 * 获取文件链接
 */
export const getFileUrl = async (cloudPath: string) => {
  if (!initialized) await initCloudBase();
  return await app!.getFileURL({ cloudPath });
};
