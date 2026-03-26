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
  return app!.auth({ persistence: 'local' }).hasLoginState();
};

/**
 * 获取当前用户
 */
export const getCurrentUser = async () => {
  if (!initialized) await initCloudBase();
  const state = await app!.auth({ persistence: 'local' }).hasLoginState();
  return state?.user || null;
};

/**
 * 自定义登录 - 用任意用户名创建本地用户（无需 CloudBase 认证）
 * 用于测试多用户场景
 */
export const customLogin = async (username: string): Promise<string> => {
  // 生成本地用户 ID
  const userId = `user_${username}_${Date.now()}`;
  console.log('[CloudBase] customLogin:', userId);
  return userId;
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
 * 退出登录 - 强制创建新匿名用户
 */
export const logout = async () => {
  if (!initialized) await initCloudBase();
  console.log('[CloudBase] logout 开始');
  try {
    // 先退出当前用户
    console.log('[CloudBase] 执行 signOut');
    await app!.auth({ persistence: 'local' }).signOut();
    console.log('[CloudBase] signOut 完成');
    
    // 清除所有可能的认证相关 localStorage
    console.log('[CloudBase] 清除 localStorage');
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('user') || key.includes('token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        localStorage.removeItem(k);
        console.log('[CloudBase] 清除:', k);
      });
    } catch (e) {
      console.log('[CloudBase] 清除 localStorage 跳过', e);
    }
    
    // 清除 sessionStorage 也试试
    try {
      sessionStorage.clear();
      console.log('[CloudBase] sessionStorage 已清除');
    } catch (e) {}
    
    // 延迟一下确保状态清理完成
    await new Promise(r => setTimeout(r, 300));
    console.log('[CloudBase] 延迟完成，准备重新登录');
    
    // 尝试用不同的方式创建新匿名用户
    // 先获取当前用户确认已退出
    const currentBefore = await app!.auth({ persistence: 'local' }).hasLoginState();
    console.log('[CloudBase] 登录前状态:', currentBefore);
    
    // 重新匿名登录
    const result = await signInAnonymously();
    console.log('[CloudBase] 新登录完成，返回:', result);
    
    // 验证新用户
    const currentAfter = await app!.auth({ persistence: 'local' }).hasLoginState();
    console.log('[CloudBase] 登录后状态:', currentAfter?.user?.uid);
    
    return result;
  } catch (err) {
    console.error('[CloudBase] logout 失败:', err);
    throw err;
  }
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
  // 直接传对象存顶层字段（扁平结构），查询返回即 doc.field（非 doc.data.field）
  return await app!.database().collection(collName).add(data);
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
    q = q.orderBy('createTime', 'desc');
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
  const result = await app!.database().collection(collName).doc(docId).update(data);
  console.log('[CloudBase] updateDocument result:', JSON.stringify(result));
  return result;
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
  category?: string;
  timestamp: number;
  likes: number;
  likedBy?: string[];
}

// 社群帖子
export interface CommunityPost {
  _id?: string;
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  category: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createTime: number;
  updateTime: number;
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

export interface EmotionLog {
  _id?: string;
  id: string;
  userId: string;
  keywords: string[];    // 3个关键词
  mood?: string;          // 主情绪
  textExcerpt: string;    // 原始文本摘要（限50字）
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
export const postTreeHole = async (post: Omit<TreeHolePost, 'id' | '_id' | 'timestamp'>) => {
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

// ========== 社群帖子 ==========

/** 发布社群帖子 - addDocument返回的id就是CloudBase的_id */
export const publishPost = async (post: {
  authorId: string;
  authorName: string;
  text: string;
  category: string;
}): Promise<{ docId: string }> => {
  const createTime = Date.now();
  const r: any = await addDocument('community_posts', {
    ...post,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createTime,
    updateTime: createTime,
  });
  const docId = r?.id || '';
  console.log('[CloudBase] publishPost CloudBase _id:', docId);
  return { docId };
};

/** 获取社群帖子列表（按分类或全部） - 不含用户点赞/收藏状态（状态独立查询） */
export const getCommunityPosts = async (category?: string, limitCount = 50) => {
  try {
    if (!initialized) await initCloudBase();
    let q = app!.database().collection('community_posts');
    const r = await q.limit(limitCount).get();
    const docs = r.data || [];
    const data = docs.map((doc: any) => {
      const inner = doc.data || {};
      const likeCount = doc.likeCount ?? inner.likeCount ?? 0;
      const commentCount = doc.commentCount ?? inner.commentCount ?? 0;
      const shareCount = doc.shareCount ?? inner.shareCount ?? 0;
      const _id = doc._id || '';
      return {
        ...doc,
        ...inner,
        _id,
        likeCount,
        commentCount,
        shareCount,
      };
    });
    return data.sort((a: any, b: any) => (b.createTime || 0) - (a.createTime || 0));
  } catch (err) {
    console.error('[CloudBase] getCommunityPosts 失败:', err);
    return [];
  }
};

/** 批量获取某用户对一批帖子的暖心/收藏状态 */
export const getUserPostStates = async (postIds: string[], userId: string) => {
  if (!initialized) await initCloudBase();
  try {
    const [likeR, collectR] = await Promise.all([
      app!.database().collection('likes').where({ userId }).get(),
      app!.database().collection('favorites').where({ userId }).get(),
    ]);
    const likedSet = new Set((likeR.data || []).map((d: any) => d.postId));
    const collectedSet = new Set((collectR.data || []).map((d: any) => d.postId));
    return { likedSet, collectedSet };
  } catch {
    return { likedSet: new Set<string>(), collectedSet: new Set<string>() };
  }
};

/** 查询某帖子是否有任何点赞（返回是否有记录，前端自行判断 userId） */
const getPostLikesCount = async (postId: string) => {
  if (!initialized) await initCloudBase();
  const r = await app!.database().collection('likes')
    .where({ postId })
    .get();
  return r.data || [];
};

/** 查询某帖子是否有任何收藏（同理） */
const getPostCollectsCount = async (postId: string) => {
  if (!initialized) await initCloudBase();
  const r = await app!.database().collection('favorites')
    .where({ postId })
    .get();
  return r.data || [];
};

/** 暖心（toggle）- likes 集合存记录，likeCount 从 likes 集合实时统计 */
export const toggleWarmth = async (postId: string, userId: string) => {
  try {
    if (!initialized) await initCloudBase();
    const cloudBaseId = String(postId); // 确保是字符串
    
    // 查询该帖子所有点赞记录
    const allLikes = await getPostLikesCount(cloudBaseId);
    const currentCount = allLikes.length;
    const hasLiked = allLikes.some((d: any) => d.userId === userId);
    
    if (hasLiked) {
      // 取消暖心：删除当前用户的记录
      const likeToRemove = allLikes.find((d: any) => d.userId === userId);
      if (likeToRemove) {
        await app!.database().collection('likes').doc(likeToRemove._id).remove();
      }
    } else {
      // 添加暖心：新增记录
      await app!.database().collection('likes').add({ postId: cloudBaseId, userId, createTime: Date.now() });
    }
    // 实时更新帖子 likes 集合的记录数（即真实点赞数）
    const newCount = hasLiked ? currentCount - 1 : currentCount + 1;
    await app!.database().collection('community_posts').doc(cloudBaseId).update({ likeCount: newCount });
  } catch (err) {
    console.error('[CloudBase] toggleWarmth 失败:', err);
    throw err;
  }
};

export const toggleCollect = async (postId: string, userId: string) => {
  try {
    if (!initialized) await initCloudBase();
    const cloudBaseId = postId;
    
    // 查询该帖子所有收藏记录
    const allCollects = await getPostCollectsCount(cloudBaseId);
    const hasCollected = allCollects.some((d: any) => d.userId === userId);
    
    if (hasCollected) {
      // 取消收藏：删除当前用户的记录
      const collectToRemove = allCollects.find((d: any) => d.userId === userId);
      if (collectToRemove) {
        await app!.database().collection('favorites').doc(collectToRemove._id).remove();
      }
    } else {
      // 添加收藏：新增记录
      await app!.database().collection('favorites').add({ postId: cloudBaseId, userId, createTime: Date.now() });
    }
  } catch (err) {
    console.error('[CloudBase] toggleCollect 失败:', err);
    throw err;
  }
};

/** 判断某用户是否暖心过某帖子（用于渲染状态） */
export const isPostWarmedByUser = async (postId: string, userId: string): Promise<boolean> => {
  const allLikes = await getPostLikesCount(postId);
  return allLikes.some((d: any) => d.userId === userId);
};

/** 判断某用户是否收藏过某帖子 */
export const isPostCollectedByUser = async (postId: string, userId: string): Promise<boolean> => {
  const allCollects = await getPostCollectsCount(postId);
  return allCollects.some((d: any) => d.userId === userId);
};

/** 批量取消收藏 */
export const batchUncollect = async (postIds: string[], userId: string) => {
  if (!initialized) await initCloudBase();
  try {
    await Promise.all(postIds.map(async (postId) => {
      const r = await app!.database().collection('favorites').where({ postId, userId }).get();
      if (r.data?.[0]) {
        await app!.database().collection('favorites').doc(r.data[0]._id).remove();
      }
    }));
  } catch (err) {
    console.error('[CloudBase] batchUncollect 失败:', err);
    throw err;
  }
};

// ========== 评论集合 ==========

/** 发布评论 */
export const publishComment = async (comment: {
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
  userId: string;
}) => {
  if (!initialized) await initCloudBase();
  const r: any = await addDocument('comments', {
    ...comment,
    postId: String(comment.postId),
    createTime: Date.now(),
  });
  // 更新帖子评论数（更新顶层 commentCount）
  const postR = await app!.database().collection('community_posts').doc(String(comment.postId)).get();
  if (postR.data) {
    const post: any = postR.data;
    const inner = post.data || {};
    const currentCount = post.commentCount ?? inner.commentCount ?? 0;
    await app!.database().collection('community_posts').doc(comment.postId).update({ commentCount: currentCount + 1 });
  }
  return r;
};

/** 获取某帖子的所有评论 */
export const getComments = async (postId: string) => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('comments')
      .where({ postId })
      .get();
    console.log('[CloudBase] getComments postId:', postId, '条数:', r.data?.length);
    return r.data || [];
  } catch (err) {
    console.error('[CloudBase] getComments 失败:', err);
    return [];
  }
};

/** 根据 _id 获取单个帖子 */
export const getPostById = async (postId: string) => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('community_posts').doc(postId).get();
    return r.data || null;
  } catch (err) {
    console.error('[CloudBase] getPostById 失败:', err);
    return null;
  }
};

/** 获取某用户收藏的所有帖子完整内容 */
export const getFavoritePosts = async (userId: string) => {
  if (!initialized) await initCloudBase();
  try {
    console.log('[CloudBase] ===== getFavoritePosts 开始 =====');
    console.log('[CloudBase] userId:', userId);
    
    // 步骤1: 查 favorites 集合
    console.log('[CloudBase] 步骤1: 查询 favorites 集合...');
    const favR = await app!.database().collection('favorites').where({ userId }).get();
    console.log('[CloudBase] favorites 返回:', JSON.stringify(favR.data));
    
    const postIds: string[] = (favR.data || []).map((d: any) => d.postId);
    console.log('[CloudBase] postIds:', postIds);
    
    if (postIds.length === 0) {
      console.log('[CloudBase] 没有收藏记录，返回空数组');
      return [];
    }
    
    // 步骤2: 批量查帖子
    console.log('[CloudBase] 步骤2: 批量查询帖子...');
    const posts = await Promise.all(postIds.map((id: string) => {
      console.log('[CloudBase] 查询帖子:', id);
      return app!.database().collection('community_posts').doc(id).get();
    }));
    
    console.log('[CloudBase] 帖子查询结果:');
    posts.forEach((r: any, i: number) => {
      console.log(`[CloudBase]   帖子${i}:`, JSON.stringify(r.data));
    });
    
    // 步骤3: 格式化数据 - r.data 是数组 [doc]，取第一个元素
    console.log('[CloudBase] 步骤3: 格式化数据...');
    const result = posts.map((r: any) => {
      // r.data 可能是数组 [doc] 或直接是 doc 对象
      const doc = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!doc) return null;
      // 直接从 doc 取字段
      const formatted = {
        _id: doc._id || '',
        text: doc.text || '',
        authorName: doc.authorName || '未知',
        category: doc.category || '',
        likeCount: doc.likeCount ?? 0,
        commentCount: doc.commentCount ?? 0,
        shareCount: doc.shareCount ?? 0,
        createTime: doc.createTime || 0,
      };
      console.log('[CloudBase] 格式化后:', JSON.stringify(formatted));
      return formatted;
    }).filter(Boolean);
    
    console.log('[CloudBase] 最终返回:', result.length, '条');
    console.log('[CloudBase] ===== getFavoritePosts 结束 =====');
    return result;
  } catch (err) {
    console.error('[CloudBase] getFavoritePosts 失败:', err);
    return [];
  }
};

// ========== 情绪日志 ==========

/** 保存情绪日志（倾诉后提取关键词） */
export const saveEmotionLog = async (log: Omit<EmotionLog, 'id' | '_id'>) => {
  const id = 'emot_' + Date.now();
  return await addDocument('emotion_logs', { ...log, id, timestamp: Date.now() });
};

/** 获取用户情绪日志（时间线） */
export const getEmotionLogs = async (userId: string, limitCount = 30) => {
  const res = await queryDocuments(
    'emotion_logs',
    { userId },
    [{ field: 'timestamp', order: 'desc' }],
    limitCount
  );
  return res.data || [];
};

/** 获取近N天的情绪日志（用于RAG上下文） */
export const getRecentEmotionLogs = async (userId: string, days = 7) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const res = await queryDocuments(
    'emotion_logs',
    { userId },
    [{ field: 'timestamp', order: 'desc' }],
    50
  );
  return (res.data || []).filter((log: EmotionLog) => log.timestamp >= cutoff);
};

// ========== 情绪关键词提取（本地规则） ==========

/** 情绪词库 */
const EMOTION_WORDS = [
  '焦虑', '焦虑感', '焦虑的', '担忧', '担心', '害怕', '恐惧', '紧张',
  '悲伤', '难过', '伤心', '痛苦', '心碎', '沮丧', '低落', '抑郁',
  '孤独', '寂寞', '空落落', '空荡荡',
  '迷茫', '困惑', '不知所措', '方向', '迷茫的',
  '愤怒', '生气', '恼火', '烦躁', '烦躁的',
  '失眠', '睡不着', '熬夜', '早醒', '睡眠',
  '工作', '职场', '辞职', '裁员', '加班',
  '感情', '失恋', '分手', '婚姻', '争吵', '冷战',
  '家庭', '父母', '亲子', '亲情',
  '健康', '身体', '生病', '疲惫', '累',
  '释怀', '放下', '接受', '平静', '治愈',
];

/** 停用词（不作为关键词） */
const STOP_WORDS = new Set([
  '我', '你', '他', '她', '它', '的', '了', '是', '在', '有',
  '和', '就', '不', '也', '很', '都', '会', '能', '想', '觉得',
  '感觉', '好像', '可能', '知道', '其实', '已经', '还是', '但是',
  '因为', '所以', '如果', '虽然', '然后', '一直', '什么', '怎么',
  '今天', '最近', '现在', '有时候', '有时候', '每次', '总是',
  '有点', '有些', '一些', '特别', '真的', '非常', '越来越',
]);

/**
 * 从文本中提取3个关键词
 * 策略：先匹配情绪词，再提取高频名词/动词
 */
export const extractEmotionKeywords = (text: string): string[] => {
  const words: Array<{ word: string; score: number; type: 'emotion' | 'noun' }> = [];
  
  // 1. 匹配情绪词
  for (const emotion of EMOTION_WORDS) {
    if (text.includes(emotion)) {
      words.push({ word: emotion, score: 3, type: 'emotion' });
    }
  }
  
  // 2. 提取名词/动词片段（简单分词）
  const fragments = text.split(/[,，、。！？；：""''（）()、\n\r\s]+/)
    .filter(f => f.length >= 2 && f.length <= 8)
    .filter(f => !STOP_WORDS.has(f))
    .filter(f => !EMOTION_WORDS.includes(f));
  
  // 统计词频
  const freq = new Map<string, number>();
  for (const f of fragments) {
    freq.set(f, (freq.get(f) || 0) + 1);
  }
  
  // 取高频词
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  for (const [word, count] of sorted) {
    if (words.length >= 5) break;
    if (!words.find(w => w.word === word)) {
      words.push({ word, score: count, type: 'noun' });
    }
  }
  
  // 优先取情绪词，取满3个
  const emotionWords = words.filter(w => w.type === 'emotion').map(w => w.word);
  const otherWords = words.filter(w => w.type === 'noun').map(w => w.word);
  
  const result = [...emotionWords, ...otherWords].slice(0, 3);
  
  // 不够3个用占位
  while (result.length < 3) {
    result.push('...');
  }
  
  return result;
};

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
