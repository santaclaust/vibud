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
  if (initialized && app) return true;
  
  try {
    app = cloudbase.init(cloudbaseConfig);
    initialized = true;
    console.log('[CloudBase] 初始化成功');
    // 🆕 确保登录状态
    try {
      await app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
    } catch (e) {
      // 可能已登录
    }
    return true;
  } catch (err) {
    console.error('[CloudBase] 初始化失败:', err);
    return false;
  }
};

/**
 * 重新初始化 CloudBase（用于切换用户后）
 */
export const reinitCloudBase = async (): Promise<boolean> => {
  initialized = false;
  app = null;
  return initCloudBase();
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

// ========== 云函数 ==========

/**
 * 调用云函数
 */
export const callFunction = async (name: string, data: object): Promise<any> => {
  if (!initialized) await initCloudBase();
  return await app!.callFunction({
    name,
    data,
  });
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

// ========== 对话评价 ==========

export interface ConversationRating {
  _id?: string;
  id: string;
  userId: string;
  sessionId: string;
  messageId?: string;      // 评价的具体消息ID（单条评价）
  rating: number;          // 1-5星
  feedback?: string;       // 可选文字反馈
  isSessionEnd: boolean;   // 是否为会话结束评价
  timestamp: number;
}

/** 保存对话评价 */
export const saveConversationRating = async (rating: Omit<ConversationRating, 'id' | 'timestamp'>) => {
  const id = 'rat_' + Date.now();
  return await addDocument('conversation_ratings', { ...rating, id, timestamp: Date.now() });
};

/** 获取用户对话评价历史 */
export const getConversationRatings = async (userId: string, limitCount = 30) => {
  const res = await queryDocuments(
    'conversation_ratings',
    { userId },
    [{ field: 'timestamp', order: 'desc' }],
    limitCount
  );
  return res.data || [];
};

/** 获取会话的平均评分 */
export const getSessionAvgRating = async (sessionId: string): Promise<number> => {
  const res = await queryDocuments(
    'conversation_ratings',
    { sessionId },
    undefined,
    100
  );
  const ratings = res.data || [];
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc: number, r: ConversationRating) => acc + r.rating, 0);
  return sum / ratings.length;
};

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

/** 获取用户情绪画像（从 user_profiles 集合） */
export const getUserEmotionProfile = async (userId: string): Promise<any | null> => {
  const res = await queryDocuments('user_profiles', { userId }, undefined, 1);
  return res.data?.[0] || null;
};

/** 创建用户情绪画像 */
export const createUserEmotionProfile = async (userId: string): Promise<any> => {
  const now = Date.now();
  const profile = {
    userId,
    updatedAt: now,
    createdAt: now,
    emotionProfile: {
      dominantEmotions: [],
      recentEmotions: [],
      triggerScenes: [],
      avoidanceTopics: [],
      preferredTone: 'gentle',
    },
    interactionPattern: {
      totalSessions: 0,
      avgMessageLength: 0,
      responseStyle: 'mixed',
      circularCount: 0,
      breakthroughCount: 0,
      totalMessages: 0,
      totalChars: 0,
      lastActiveAt: now,
    },
    sessionSummaries: [],
    personalization: {
      firstMetAt: now,
      lastActiveAt: now,
      preferredGreeting: '',
    },
  };
  return await addDocument('user_profiles', profile);
};

/** 更新用户情绪画像 */
export const updateUserEmotionProfile = async (userId: string, updates: any): Promise<void> => {
  const res = await queryDocuments('user_profiles', { userId }, undefined, 1);
  if (res.data?.length > 0) {
    await updateDocument('user_profiles', res.data[0]._id, {
      ...updates,
      updatedAt: Date.now(),
    });
  }
};

/** 保存推送 Token */
export const savePushToken = async (userId: string, token: string) => {
  const existing = await queryDocuments('push_tokens', { userId }, undefined, 1);
  if (existing.data?.length > 0) {
    // 已存在则更新
    return await updateDocument('push_tokens', existing.data[0]._id, { token, updatedAt: Date.now() });
  } else {
    // 新增
    return await addDocument('push_tokens', { userId, token, createdAt: Date.now(), updatedAt: Date.now() });
  }
};

/** 获取用户的推送 Token */
export const getPushToken = async (userId: string): Promise<string | null> => {
  const res = await queryDocuments('push_tokens', { userId }, undefined, 1);
  return res.data?.[0]?.token || null;
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

/** 根据ID获取单个帖子 */
export const getPostById = async (postId: string): Promise<any | null> => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('community_posts').doc(postId).get();
    const docs = r.data || [];
    return docs[0] || null;
  } catch (err) {
    console.error('[CloudBase] getPostById 失败:', err);
    return null;
  }
};

/** 获取社群帖子列表（按分类或全部） - 不含用户点赞/收藏状态（状态独立查询） */
export const getCommunityPosts = async (category?: string, limitCount = 50) => {
  try {
    if (!initialized) await initCloudBase();
    let q = app!.database().collection('community_posts');
    // 按分类筛选
    if (category) {
      q = q.where({ category });
    }
    const r = await q.limit(limitCount).get();
    const docs = r.data || []; // CloudBase 返回数组
    
    // 批量查询每个帖子的评论数
    const postsWithCounts = await Promise.all(docs.map(async (doc: any) => {
      const inner = doc.data || {};
      const _id = doc._id || '';
      
      // 查询评论数量（排除已删除的）
      const commentR = await app!.database().collection('comments').where({ postId: _id }).get();
      const realCommentCount = (commentR.data || []).length;
      
      const likeCount = doc.likeCount ?? inner.likeCount ?? 0;
      const shareCount = doc.shareCount ?? inner.shareCount ?? 0;
      
      // 跳过已删除的帖子（检查 doc.deleted 或 inner.deleted）
      const isDeleted = doc.deleted || inner.deleted || (inner.data?.deleted);
      if (isDeleted) {
        console.log('[DBG] 跳过已删除帖子:', _id, 'deleted:', doc.deleted, inner.deleted);
        return null;
      }
      
      console.log('[DBG] post _id:', _id, 'realCommentCount:', realCommentCount);
      
      return {
        ...inner,
        ...doc,
        _id,
        likeCount,
        commentCount: realCommentCount, // 使用真实的评论数
        shareCount,
      };
    }));
    
    // 过滤掉已删除的帖子
    const validPosts = postsWithCounts.filter(p => p !== null);
    return validPosts.sort((a: any, b: any) => (b.createTime || 0) - (a.createTime || 0));
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

/** 获取热门帖子（按点赞数+评论数综合排序） */
export const getHotPosts = async (limitCount = 20) => {
  try {
    if (!initialized) await initCloudBase();
    
    // 先用 getCommunityPosts 获取所有帖子
    const allPosts = await getCommunityPosts(undefined, 100);
    console.log('[DBG] getHotPosts 获取到', allPosts.length, '条');
    
    if (allPosts.length === 0) return [];
    
    // 综合排序：点赞*2 + 评论
    const posts = allPosts.map((post: any) => {
      const likeCount = post.likeCount || 0;
      const commentCount = post.commentCount || 0;
      const score = likeCount * 2 + commentCount;
      console.log('[DBG] post', post._id, 'likeCount:', likeCount, 'commentCount:', commentCount, 'score:', score);
      return { ...post, _score: score };
    });
    
    // 按分数排序
    const sorted = posts.sort((a: any, b: any) => b._score - a._score);
    console.log('[DBG] getHotPosts 排序后Top3:', sorted.slice(0, 3).map(p => ({ id: p._id, score: p._score, like: p.likeCount })));
    
    return sorted.slice(0, limitCount);
  } catch (err) {
    console.error('[CloudBase] getHotPosts 失败:', err);
    return [];
  }
};

/** 获取推荐帖子（近期发布 + 较高互动） */
export const getRecommendedPosts = async (limitCount = 20) => {
  try {
    if (!initialized) await initCloudBase();
    const now = Date.now();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
    
    // 获取近期帖子
    const r = await app!.database().collection('community_posts')
      .where({
        createTime: app!.database().command.gt(threeDaysAgo)
      })
      .limit(limitCount * 2) // 多取一些用于筛选
      .get();
    const docs = r.data || [];
    
    // 计算推荐分数：时间衰减 + 互动量
    const posts = docs.map((doc: any) => {
      const inner = doc.data || {};
      const likeCount = doc.likeCount ?? inner.likeCount ?? 0;
      const commentCount = doc.commentCount ?? inner.commentCount ?? 0;
      const createTime = doc.createTime || now;
      
      // 时间衰减因子（3天内，随时间递减）
      const hoursAgo = (now - createTime) / (1000 * 60 * 60);
      const timeFactor = Math.max(0, 1 - hoursAgo / 72);
      
      const score = (likeCount + commentCount) * timeFactor;
      return { ...inner, ...doc, likeCount, commentCount, _score: score };
    });
    
    // 取评分最高的
    return posts.sort((a: any, b: any) => b._score - a._score).slice(0, limitCount);
  } catch (err) {
    console.error('[CloudBase] getRecommendedPosts 失败:', err);
    return [];
  }
};

/** 获取热门话题（从帖子提取） */
export const getHotTopics = async (limitCount = 10) => {
  try {
    if (!initialized) await initCloudBase();
    // 获取近期100条帖子
    const r = await app!.database().collection('community_posts')
      .orderBy('createTime', 'desc')
      .limit(100)
      .get();
    const docs = r.data || [];
    
    // 提取#话题标签
    const topicCount: Record<string, number> = {};
    docs.forEach((doc: any) => {
      const text = doc.text || doc.data?.text || '';
      const matches = text.match(/#[^\s#，。,、]+/g);
      if (matches) {
        matches.forEach((tag: string) => {
          topicCount[tag] = (topicCount[tag] || 0) + 1;
        });
      }
    });
    
    // 排序取Top
    const topics = Object.entries(topicCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitCount)
      .map(([tag, count]) => ({ tag, count }));
    
    return topics;
  } catch (err) {
    console.error('[CloudBase] getHotTopics 失败:', err);
    return [];
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
  const postList = postR.data || [];
  const post = postList[0]; // CloudBase 返回数组
  console.log('[publishComment] postR:', JSON.stringify(postR));
  if (post) {
    const inner = post.data || {};
    const currentCount = post.commentCount ?? inner.commentCount ?? 0;
    console.log('[publishComment] post._id:', post._id, 'currentCount:', currentCount);
    await app!.database().collection('community_posts').doc(comment.postId).update({ commentCount: currentCount + 1 });
    console.log('[publishComment] updated commentCount to:', currentCount + 1);
  }
  return r;
};

// ========== 社交连接：关注系统 ==========

/** 关注用户 */
export const followUser = async (followerId: string, followingId: string) => {
  if (!initialized) await initCloudBase();
  try {
    // 检查是否已关注
    const existing = await app!.database().collection('follows')
      .where({ followerId, followingId })
      .get();
    if ((existing.data || []).length > 0) {
      return { success: false, message: '已经关注过了' };
    }
    // 添加关注
    await app!.database().collection('follows').add({
      followerId,
      followingId,
      createTime: Date.now(),
    });
    return { success: true };
  } catch (err) {
    console.error('[CloudBase] followUser 失败:', err);
    return { success: false, message: '操作失败' };
  }
};

/** 取消关注 */
export const unfollowUser = async (followerId: string, followingId: string) => {
  if (!initialized) await initCloudBase();
  try {
    const existing = await app!.database().collection('follows')
      .where({ followerId, followingId })
      .get();
    if (existing.data && existing.data.length > 0) {
      await app!.database().collection('follows').doc(existing.data[0]._id).remove();
    }
    return { success: true };
  } catch (err) {
    console.error('[CloudBase] unfollowUser 失败:', err);
    return { success: false };
  }
};

/** 检查是否已关注 */
export const isFollowing = async (followerId: string, followingId: string): Promise<boolean> => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('follows')
      .where({ followerId, followingId })
      .get();
    return (r.data || []).length > 0;
  } catch {
    return false;
  }
};

/** 获取我的关注列表 */
export const getFollowingList = async (userId: string): Promise<string[]> => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('follows')
      .where({ followerId: userId })
      .get();
    return (r.data || []).map((d: any) => d.followingId);
  } catch {
    return [];
  }
};

/** 获取我的粉丝列表 */
export const getFollowersList = async (userId: string): Promise<string[]> => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('follows')
      .where({ followingId: userId })
      .get();
    return (r.data || []).map((d: any) => d.followerId);
  } catch {
    return [];
  }
};

/** 获取关注数 */
export const getFollowStats = async (userId: string) => {
  const following = await getFollowingList(userId);
  const followers = await getFollowersList(userId);
  return { followingCount: following.length, followersCount: followers.length };
};

// ========== 内容审核 ==========

/** 敏感词库（前端简单过滤，真实需要后端） */
const SENSITIVE_WORDS = [
  '自杀', '自残', '割腕', '跳楼', '安眠药', '不想活', '死了',
  '色情', '赌博', '毒品', '诈骗', '暴力',
];

/** 检查文本是否包含敏感词 */
export const checkSensitiveWords = (text: string): { hasSensitive: boolean; words: string[] } => {
  const found: string[] = [];
  const lower = text.toLowerCase();
  SENSITIVE_WORDS.forEach(word => {
    if (lower.includes(word)) {
      found.push(word);
    }
  });
  return { hasSensitive: found.length > 0, words: found };
};

/** 举报帖子 */
export const reportPost = async (postId: string, reporterId: string, reason: string, detail?: string) => {
  if (!initialized) await initCloudBase();
  console.log('[CloudBase] reportPost 开始:', postId, reporterId, reason);
  try {
    // 简单防重复：同一用户对同一帖子每天最多举报1次
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const existing = await app!.database().collection('reports')
      .where({
        targetId: postId,
        reporterId,
        createTime: app!.database().command.gt(todayStart.getTime()),
      })
      .get();
    
    if ((existing.data || []).length > 0) {
      return { success: false, message: '今天已经举报过了' };
    }
    
    await app!.database().collection('reports').add({
      type: 'post',
      targetId: postId,
      reporterId,
      reason,
      detail: detail || '',
      status: 'pending', // pending / reviewed / rejected
      createTime: Date.now(),
    });
    return { success: true };
  } catch (err) {
    console.error('[CloudBase] reportPost 失败:', err);
    return { success: false, message: '举报失败' };
  }
};

/** 举报评论 */
export const reportComment = async (commentId: string, reporterId: string, reason: string, detail?: string) => {
  if (!initialized) await initCloudBase();
  try {
    const existing = await app!.database().collection('reports')
      .where({ targetId: commentId, reporterId, type: 'comment' })
      .get();
    if ((existing.data || []).length > 0) {
      return { success: false, message: '已经举报过了' };
    }
    await app!.database().collection('reports').add({
      type: 'comment',
      targetId: commentId,
      reporterId,
      reason,
      detail: detail || '',
      status: 'pending',
      createTime: Date.now(),
    });
    return { success: true };
  } catch (err) {
    console.error('[CloudBase] reportComment 失败:', err);
    return { success: false, message: '举报失败' };
  }
};

/** 获取我的举报记录 */
export const getMyReports = async (userId: string) => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('reports')
      .where({ reporterId: userId })
      .orderBy('createTime', 'desc')
      .get();
    return r.data || [];
  } catch {
    return [];
  }
};

/** 拉黑用户 */
export const blockUser = async (blockerId: string, blockedId: string) => {
  if (!initialized) await initCloudBase();
  try {
    const existing = await app!.database().collection('blocks')
      .where({ blockerId, blockedId })
      .get();
    if ((existing.data || []).length > 0) {
      return { success: false, message: '已经拉黑了' };
    }
    await app!.database().collection('blocks').add({
      blockerId,
      blockedId,
      createTime: Date.now(),
    });
    return { success: true };
  } catch (err) {
    console.error('[CloudBase] blockUser 失败:', err);
    return { success: false };
  }
};

/** 取消拉黑 */
export const unblockUser = async (blockerId: string, blockedId: string) => {
  if (!initialized) await initCloudBase();
  try {
    const existing = await app!.database().collection('blocks')
      .where({ blockerId, blockedId })
      .get();
    if (existing.data && existing.data.length > 0) {
      await app!.database().collection('blocks').doc(existing.data[0]._id).remove();
    }
    return { success: true };
  } catch {
    return { success: false };
  }
};

/** 检查是否已拉黑 */
export const isBlocked = async (blockerId: string, blockedId: string): Promise<boolean> => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('blocks')
      .where({ blockerId, blockedId })
      .get();
    return (r.data || []).length > 0;
  } catch {
    return false;
  }
};

/** 获取我拉黑的用户列表 */
export const getBlockedUsers = async (userId: string): Promise<string[]> => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('blocks')
      .where({ blockerId: userId })
      .get();
    return (r.data || []).map((d: any) => d.blockedId);
  } catch {
    return [];
  }
};

// ========== 举报审核（超级管理员） ==========

const ADMIN_USER_ID = 'santaclaust';

/** 检查是否是超级管理员 */
export const isSuperAdmin = (userId: string): boolean => {
  // 支持直接 ID 或包含 santaclaust 的自定义 ID
  return userId === ADMIN_USER_ID || userId.includes('santaclaust');
};

/** 获取待审核的举报列表（仅超级管理员可用） */
export const getPendingReports = async () => {
  if (!initialized) await initCloudBase();
  try {
    // 只获取 pending 状态的举报
    const r = await app!.database().collection('reports')
      .where({ status: 'pending' })
      .orderBy('createTime', 'desc')
      .get();
    return r.data || [];
  } catch (err) {
    console.error('[CloudBase] getPendingReports 失败:', err);
    return [];
  }
};

/** 获取所有举报（仅超级管理员可用） */
export const getAllReports = async (limit = 50) => {
  if (!initialized) await initCloudBase();
  try {
    const r = await app!.database().collection('reports')
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();
    return r.data || [];
  } catch {
    return [];
  }
};

/** 处理举报（仅超级管理员可用） */
export const processReport = async (reportId: string, adminId: string, action: 'approve' | 'reject') => {
  if (!initialized) await initCloudBase();
  if (!isSuperAdmin(adminId)) {
    return { success: false, message: '权限不足' };
  }
  try {
    // 获取举报详情
    const report = await app!.database().collection('reports').doc(reportId).get();
    const reportData = report.data?.[0];
    
    if (!reportData) {
      return { success: false, message: '举报不存在' };
    }

    // 更新举报状态
    let updateSuccess = false;
    try {
      await app!.database().collection('reports').doc(reportId).update({
        status: action === 'approve' ? 'reviewed' : 'rejected',
        adminId,
        adminTime: Date.now(),
      });
      updateSuccess = true;
    } catch (e) {
      // 更新失败则删除举报记录
      try {
        await app!.database().collection('reports').doc(reportId).remove();
      } catch (e2) {}
    }
    
    // 如果是批准（删除内容）- 标记删除帖子
    if (action === 'approve' && reportData?.type === 'post' && reportData.targetId) {
      try {
        await app!.database().collection('community_posts').doc(reportData.targetId).update({
          deleted: true,
          deletedAt: Date.now(),
          deleteReason: reportData.reason || '举报处理',
        });
      } catch (e) {
        console.log('[CloudBase] 标记删除帖子失败:', e);
      }
    }
    
    return { success: true };
  } catch (err) {
    console.error('[CloudBase] processReport 失败:', err);
    return { success: false, message: '操作失败' };
  }
};

/** 清空所有举报记录（仅超级管理员可用） */
export const clearAllReports = async (adminId: string) => {
  if (!initialized) await initCloudBase();
  if (!isSuperAdmin(adminId)) {
    return { success: false, message: '权限不足' };
  }
  try {
    // 获取所有举报
    const allR = await app!.database().collection('reports').get();
    const allReports = allR.data || [];
    
    // 逐个删除
    for (const report of allReports) {
      try {
        await app!.database().collection('reports').doc(report._id).remove();
      } catch (e) {
        console.log('[CloudBase] 删除举报失败:', report._id);
      }
    }
    return { success: true, message: `已清空 ${allReports.length} 条举报` };
  } catch (err) {
    console.error('[CloudBase] clearAllReports 失败:', err);
    return { success: false, message: '操作失败' };
  }
};

/** 批量删除帖子（仅超级管理员可用） */
export const deletePostByAdmin = async (postId: string, adminId: string, reason: string) => {
  if (!initialized) await initCloudBase();
  if (!isSuperAdmin(adminId)) {
    return { success: false, message: '权限不足' };
  }
  try {
    await app!.database().collection('community_posts').doc(postId).update({
      deleted: true,
      deleteReason: reason,
      deletedBy: adminId,
      deletedAt: Date.now(),
    });
    return { success: true };
  } catch {
    return { success: false };
  }
};

/** 恢复帖子（仅超级管理员可用） */
export const restorePostByAdmin = async (postId: string, adminId: string) => {
  if (!initialized) await initCloudBase();
  if (!isSuperAdmin(adminId)) {
    return { success: false, message: '权限不足' };
  }
  try {
    await app!.database().collection('community_posts').doc(postId).update({
      deleted: false,
      deleteReason: '',
      deletedBy: '',
      deletedAt: null,
    });
    return { success: true };
  } catch {
    return { success: false };
  }
};

/** 彻底删除帖子（仅超级管理员可用）- 从数据库物理删除 */
export const hardDeletePost = async (postId: string, adminId: string) => {
  console.log('[CloudBase] hardDeletePost 开始 postId:', postId, 'adminId:', adminId);
  if (!initialized) await initCloudBase();
  if (!isSuperAdmin(adminId)) {
    console.log('[CloudBase] hardDeletePost 权限不足');
    return { success: false, message: '权限不足' };
  }
  try {
    console.log('[CloudBase] hardDeletePost 准备删除...');
    
    // 尝试获取当前用户 context（包含 openid）
    let currentOpenId = '';
    try {
      // 获取当前用户信息
      const userInfo = await app!.auth().getUserInfo();
      currentOpenId = userInfo?.openid || '';
      console.log('[CloudBase] 当前用户 openid:', currentOpenId);
    } catch (e) {
      console.log('[CloudBase] 获取用户信息失败:', e);
    }
    
    // 先检查帖子是否存在
    const checkDoc = await app!.database().collection('community_posts').doc(postId).get();
    console.log('[CloudBase] 帖子存在检查:', checkDoc.data);
    
    if (!checkDoc.data) {
      console.log('[CloudBase] 帖子不存在或已删除');
      return { success: false, message: '帖子不存在或已删除' };
    }
    
    // 检查帖子作者 _openid
    const postData = checkDoc.data;
    const postAuthorOpenId = postData._openid || '';
    console.log('[CloudBase] 帖子作者 _openid:', postAuthorOpenId);
    
    // 关键修复：无 _openid → 允许管理员强制删除
    // 如果有 _openid 但不匹配 → 尝试强制删除
    let result;
    if (!postAuthorOpenId) {
      // 无作者，允许删除
      console.log('[CloudBase] 无作者 openid，允许删除');
      result = await app!.database().collection('community_posts').doc(postId).remove();
    } else if (postAuthorOpenId === currentOpenId) {
      // 作者匹配，直接删除
      console.log('[CloudBase] 作者匹配，允许删除');
      result = await app!.database().collection('community_posts').doc(postId).remove();
    } else {
      // 作者不匹配，超级管理员尝试强制删除
      console.log('[CloudBase] 作者不匹配，超级管理员强制删除');
      // CloudBase 可能有限制，尝试使用 update 标记删除
      result = await app!.database().collection('community_posts').doc(postId).update({
        deleted: true,
        deletedAt: Date.now(),
        deletedBy: adminId,
        deleteReason: '管理员强制删除',
      });
    }
    
    console.log('[CloudBase] hardDeletePost 删除结果:', result);
    if (result && (result.deleted > 0 || result.updated > 0)) {
      return { success: true };
    } else {
      return { success: false, message: '删除失败' };
    }
  } catch (e: any) {
    console.error('[CloudBase] hardDeletePost 异常:', e);
    return { success: false, message: e?.message || '删除失败' };
  }
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
