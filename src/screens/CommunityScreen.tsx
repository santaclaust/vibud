import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { getCommunityPosts, publishPost, toggleWarmth, toggleCollect, getUserPostStates, publishComment, getComments, getHotPosts, getRecommendedPosts, getHotTopics, checkSensitiveWords, reportPost, reportComment, blockUser } from '../services/CloudBaseService';

const CATEGORIES = ['情绪', '生活', '心理', '成长', '家庭', '互助', '爱情', '吐槽', '职场', '其他', '学业', '全部'];
const MAIN_CATEGORIES = ['全部']; // 默认显示
const CATEGORY_COLORS: Record<string, string> = {
  '全部': '#666', '情绪': '#E57373', '心理': '#9575CD', '家庭': '#FF8A65',
  '爱情': '#F06292', '职场': '#5B8DEF', '学业': '#4FC3F7', '生活': '#81C784',
  '成长': '#AED581', '互助': '#E65100', '吐槽': '#90A4AE', '其他': '#BDBDBD',
};
const CATEGORY_BG: Record<string, string> = {
  '全部': '#F5F5F5', '情绪': '#FFF0F0', '心理': '#F3EFFF', '家庭': '#FFF3E0',
  '爱情': '#FCE4EC', '职场': '#EEF3FF', '学业': '#E1F5FE', '生活': '#F0FFF4',
  '成长': '#F1F8E9', '互助': '#FFFDE7', '吐槽': '#ECEFF1', '其他': '#F5F5F5',
};

export default function CommunityScreen({ navigation, colors, userId, themeMode }: any) {
  const c = colors || { background: '#F2F3F5', surface: '#FFFFFF', text: '#1F1F1F', textSecondary: '#999', border: '#E5E5E5', primary: '#4A90E2' };
  const isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const overlayBg = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';
  const blurTint = isDark ? 'dark' : 'light';
  const uid = userId || 'guest';

  const [posts, setPosts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState('情绪');
  const [posting, setPosting] = useState(false);
  const [commentPost, setCommentPost] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  
  // 🆕 广场优化：Tab切换
  const [activeTab, setActiveTab] = useState<'latest' | 'hot' | 'recommend'>('latest');
  const [hotTopics, setHotTopics] = useState<{tag: string, count: number}[]>([]);
  // 🆕 举报弹窗
  const [reportModal, setReportModal] = useState<{visible: boolean, post: any | null, type: 'post' | 'comment', targetId: string}>({ visible: false, post: null, type: 'post', targetId: '' });
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // 🆕 根据Tab获取不同帖子
  const fetchPosts = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      let data: any[] = [];
      
      // 根据Tab选择不同的API
      switch (activeTab) {
        case 'hot':
          data = await getHotPosts(30);
          break;
        case 'recommend':
          data = await getRecommendedPosts(30);
          break;
        default:
          // latest: 按分类获取
          const category = activeCategory === '全部' ? undefined : activeCategory;
          data = await getCommunityPosts(category, 100);
          // 搜索过滤
          if (searchText.trim()) {
            const kw = searchText.trim().toLowerCase();
            data = data.filter((p: any) => 
              (p.text || '').toLowerCase().includes(kw) ||
              (p.authorName || '').toLowerCase().includes(kw) ||
              (p.category || '').toLowerCase().includes(kw)
            );
          }
      }
      
      const postIds = data.map((p: any) => p._id || p.id);
      console.log('[Community] Tab:', activeTab, '获取到', data.length, '条, Top3:', data.slice(0, 3).map((p: any) => ({ id: p._id, like: p.likeCount, score: p._score })));
      const { likedSet, collectedSet } = await getUserPostStates(postIds, uid);
      const merged = data.map((p: any) => {
        const pid = p._id || p.id;
        return { ...p, _warmed: likedSet.has(pid), _collected: collectedSet.has(pid) };
      });
      console.log('[Community] fetchPosts:', merged.length, '条，Tab:', activeTab);
      setPosts(merged);
    } catch (err) { console.error('获取帖子失败:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeTab, activeCategory, searchText, uid]);

  // 监听分类和搜索变化，重新加载帖子
  useEffect(() => {
    fetchPosts();
  }, [activeCategory, searchText]);

  // userId 从空变真实值时（匿名登录完成后）重新拉取帖子
  const prevUserId = useRef(userId);
  useEffect(() => {
    if (prevUserId.current !== userId && userId) {
      prevUserId.current = userId;
      fetchPosts();
    }
  }, [userId]);

  const handleRefresh = () => { setRefreshing(true); fetchPosts(); };

  // 🆕 加载热门话题
  useEffect(() => {
    getHotTopics(10).then(topics => setHotTopics(topics)).catch(console.error);
  }, []);

  const handlePublish = async () => {
    if (!postText.trim() || postText.trim().length < 5) { Alert.alert('内容太短了'); return; }
    
    // 🆕 敏感词检查
    const sensitive = checkSensitiveWords(postText.trim());
    if (sensitive.hasSensitive) {
      Alert.alert('内容包含敏感词', `请勿包含: ${sensitive.words.join(', ')}`);
      return;
    }
    
    setPosting(true);
    try {
      const displayName = userId ? '用户' + userId.slice(-4) : '游客';
      await publishPost({ authorId: uid, authorName: displayName, text: postText.trim(), category: postCategory });
      setShowPostModal(false);
      setPostText('');
      fetchPosts();
    } catch (err) { Alert.alert('发布失败，请重试'); }
    finally { setPosting(false); }
  };

  const syncPost = (updated: any) => {
    setPosts((prev: any[]) => prev.map((p: any) => p._id === updated._id ? updated : p));
    if (commentPost && commentPost._id === updated._id) setCommentPost(updated);
  };

  const handleWarmth = async (post: any) => {
    if (!post._id) { Alert.alert('帖子数据异常'); return; }
    if (!uid) { Alert.alert('请等待登录完成'); return; }
    try {
      // 新状态 = 取反当前状态
      const newWarmed = !post._warmed;
      const newCount = newWarmed ? (post.likeCount || 0) + 1 : Math.max(0, (post.likeCount || 0) - 1);
      const updated = { ...post, _warmed: newWarmed, likeCount: newCount };
      syncPost(updated);
      await toggleWarmth(post._id, uid);
    } catch (err) {
      syncPost(post);
      console.error('暖心失败:', err);
      Alert.alert('操作失败', err instanceof Error ? err.message : '请检查网络或稍后重试');
    }
  };

  const handleCollect = async (post: any) => {
    if (!post._id) { Alert.alert('帖子数据异常'); return; }
    if (!uid) { Alert.alert('请等待登录完成'); return; }
    try {
      const newCollected = !post._collected;
      const updated = { ...post, _collected: newCollected };
      syncPost(updated);
      await toggleCollect(post._id, uid);
    } catch (err) {
      syncPost(post);
      console.error('收藏失败:', err);
      Alert.alert('操作失败', err instanceof Error ? err.message : '请检查网络或稍后重试');
    }
  };

  const openComment = async (post: any) => {
    // 直接用传入的 post 对象，不需要额外查询
    setCommentPost(post);
    setComments([]);
    if (!uid || !post._id) return;
    try {
      const data = await getComments(post._id);
      setComments(data);
    } catch (err) { console.error('加载评论失败:', err); }
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    if (!uid) { Alert.alert('请等待登录完成'); return; }
    
    // 🆕 敏感词检查
    const sensitive = checkSensitiveWords(text);
    if (sensitive.hasSensitive) {
      Alert.alert('内容包含敏感词', `请勿包含: ${sensitive.words.join(', ')}`);
      return;
    }
    
    const displayName = uid ? '用户' + uid.slice(-4) : '游客';
    const newComment: any = {
      id: 'comment_' + Date.now(),
      postId: commentPost._id,
      authorId: uid,
      authorName: displayName,
      text,
      createTime: Date.now(),
    };
    setCommentText('');
    try {
      await publishComment({ postId: commentPost._id, authorId: uid, authorName: displayName, text, userId: uid });
      setComments((prev: any[]) => [newComment, ...prev]);
      // 刷新帖子列表（更新评论数）
      fetchPosts();
      // 关闭评论弹窗
      setCommentPost(null);
    } catch (err) { Alert.alert('评论失败'); console.error('评论失败:', err); }
  };

  const formatTime = (ts: number | string | undefined) => {
    if (!ts) return '';
    const ms = Number(ts);
    if (isNaN(ms)) return '';
    const diff = Date.now() - ms;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return new Date(ms).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const isWarmed = (post: any) => post._warmed || false;
  const isCollected = (post: any) => post._collected || false;

  const [moreMenuPost, setMoreMenuPost] = useState<any>(null);

  // 🆕 举报/拉黑操作 - 使用 Modal 替代 Alert（Web更稳定）
  const showPostOptions = (post: any) => {
    setMoreMenuPost(post);
  };

  const handleBlockUser = async (authorId: string) => {
    if (!uid) { Alert.alert('请先登录'); return; }
    if (authorId === uid) { Alert.alert('不能拉黑自己'); return; }
    try {
      const result = await blockUser(uid, authorId);
      if (result.success) {
        Alert.alert('已拉黑该用户', '将不再看到TA的内容');
        setMoreMenuPost(null);
        fetchPosts();
      } else {
        Alert.alert(result.message || '操作失败');
      }
    } catch { Alert.alert('操作失败'); }
  };

  const handleReport = async () => {
    if (!reportReason) { Alert.alert('请选择举报原因'); return; }
    if (!uid) { Alert.alert('请先登录'); return; }
    setReportLoading(true);
    console.log('[Report] 开始举报:', reportModal.targetId, uid, reportReason);
    try {
      let result;
      if (reportModal.type === 'post') {
        result = await reportPost(reportModal.targetId, uid, reportReason);
      } else {
        result = await reportComment(reportModal.targetId, uid, reportReason);
      }
      console.log('[Report] 结果:', result);
      if (result.success) {
        Alert.alert('举报成功', '我们会尽快处理');
        setReportModal({ visible: false, post: null, type: 'post', targetId: '' });
        setReportReason('');
      } else {
        Alert.alert(result.message || '举报失败');
      }
    } catch { Alert.alert('举报失败'); }
    finally { setReportLoading(false); }
  };

  const REPORT_REASONS = ['垃圾广告', '人身攻击', '虚假信息', '违规内容', '引战', '其他'];

  // 🆕 Tab切换栏
  const renderTabs = () => (
    <View style={[styles.tabBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
      <TouchableOpacity style={[styles.tabItem, activeTab === 'latest' && styles.tabItemActive]} onPress={() => setActiveTab('latest')}>
        <Text style={[styles.tabText, { color: c.textSecondary }, activeTab === 'latest' && { color: c.primary, fontWeight: '600' }]}>最新</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabItem, activeTab === 'hot' && styles.tabItemActive]} onPress={() => setActiveTab('hot')}>
        <Text style={[styles.tabText, { color: c.textSecondary }, activeTab === 'hot' && { color: '#FF6B6B', fontWeight: '600' }]}>🔥 热门</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabItem, activeTab === 'recommend' && styles.tabItemActive]} onPress={() => setActiveTab('recommend')}>
        <Text style={[styles.tabText, { color: c.textSecondary }, activeTab === 'recommend' && { color: '#FFB347', fontWeight: '600' }]}>✨ 推荐</Text>
      </TouchableOpacity>
    </View>
  );

  // 🆕 热门话题标签
  const renderTopics = () => {
    if (hotTopics.length === 0) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicsContainer} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {hotTopics.map((topic, idx) => (
          <TouchableOpacity key={idx} style={[styles.topicTag, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} onPress={() => { setSearchText(topic.tag.replace('#', '')); setActiveTab('latest'); }}>
            <Text style={[styles.topicText, { color: c.text }]}>{topic.tag}</Text>
            <Text style={[styles.topicCount, { color: c.textSecondary }]}> {topic.count}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderPost = ({ item }: { item: any }) => (
    <View style={[styles.postCard, { backgroundColor: c.surface }]}>
      {/* 点击卡片打开评论区 */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => openComment(item)}>
        <View style={styles.postHeader}>
          <View style={styles.avatarWrap}><Text style={styles.avatarText}>🌱</Text></View>
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: c.text }]}>{item.authorName}</Text>
            <Text style={[styles.postMeta, { color: c.textSecondary }]}>{formatTime(item.createTime)}</Text>
          </View>
          <View style={[styles.categoryTag, { backgroundColor: CATEGORY_BG[item.category] || '#F5F5F5' }]}>
            <Text style={[styles.categoryTagText, { color: CATEGORY_COLORS[item.category] || '#666' }]}>{item.category}</Text>
          </View>
        </View>
        <Text style={[styles.postText, { color: c.text }]}>{item.text}</Text>
      </TouchableOpacity>

      {/* 操作栏独立，不触发卡片点击 */}
      <View style={[styles.actionBar, { borderTopColor: c.border }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleWarmth(item)}>
          <Text style={[styles.actionIcon, isWarmed(item) ? styles.actionIconRed : { color: c.textSecondary }]}>{isWarmed(item) ? '❤️' : '🤍'}</Text>
          <Text style={[styles.actionCount, { color: c.textSecondary }, isWarmed(item) && styles.actionCountRed]}>{item.likeCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openComment(item)}>
          <Text style={[styles.actionIcon, { color: c.textSecondary }]}>💬</Text>
          <Text style={[styles.actionCount, { color: c.textSecondary }]}>{item.commentCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('转发功能', '开发中')}>
          <Text style={[styles.actionIcon, { color: c.textSecondary }]}>🔄</Text>
          <Text style={[styles.actionCount, { color: c.textSecondary }]}>{item.shareCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRight]} onPress={() => handleCollect(item)}>
          <Text style={[styles.actionIcon, isCollected(item) ? styles.actionIconYellow : { color: c.textSecondary }]}>{isCollected(item) ? '★' : '☆'}</Text>
        </TouchableOpacity>
        {/* 🆕 更多操作：举报/拉黑 */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => showPostOptions(item)}>
          <Text style={[styles.actionIcon, { color: c.textSecondary }]}>⋯</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>社群</Text>
      </View>
      {/* 搜索栏 */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.surface }}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: c.background, color: c.text }]}
          placeholder="搜索帖子内容..."
          placeholderTextColor={c.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
      {/* 🆕 Tab切换栏 */}
      {renderTabs()}
      {/* 🆕 热门话题 */}
      {renderTopics()}
      <View style={[styles.categoryWrap, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 }}>
          {!categoryExpanded && (
            <>
              <TouchableOpacity style={[styles.catTag, { backgroundColor: activeCategory === '全部' ? CATEGORY_COLORS['全部'] : c.surface, borderColor: CATEGORY_COLORS['全部'] }]} onPress={() => setActiveCategory('全部')}>
                <Text style={[styles.catTagText, { color: activeCategory === '全部' ? '#FFF' : CATEGORY_COLORS['全部'] }]}>全部</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.catTag, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setCategoryExpanded(true)}>
                <Text style={[styles.catTagText, { color: c.textSecondary }]}>+ 更多</Text>
              </TouchableOpacity>
            </>
          )}
          {categoryExpanded && (
            <>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[styles.catTag, { backgroundColor: activeCategory === cat ? CATEGORY_COLORS[cat] : c.surface, borderColor: CATEGORY_COLORS[cat] }]} onPress={() => setActiveCategory(cat)}>
                  <Text style={[styles.catTagText, { color: activeCategory === cat ? '#FFF' : CATEGORY_COLORS[cat] }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.catTag, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setCategoryExpanded(false)}>
                <Text style={[styles.catTagText, { color: c.textSecondary }]}>收起</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      {loading ? <View style={styles.loading}><Text style={{ color: c.textSecondary }}>加载中...</Text></View>
      : posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={[styles.emptyText, { color: c.text }]}>还没有帖子</Text>
          <Text style={[styles.emptySub, { color: c.textSecondary }]}>成为第一个分享的人吧</Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: c.primary }]} onPress={() => setShowPostModal(true)}>
            <Text style={[styles.emptyBtnText, { color: '#FFF' }]}>发布帖子</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={posts} renderItem={renderPost}
          keyExtractor={(item, index) => `post_${item._id || item.createTime}_${index}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.textSecondary} />}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setShowPostModal(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 发布弹窗 */}
      <Modal visible={showPostModal} transparent animationType="none" onRequestClose={() => setShowPostModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => { console.log('[发布] 点击关闭'); setShowPostModal(false); }}>
          <BlurView intensity={60} tint={blurTint} style={StyleSheet.absoluteFill} />
        </TouchableOpacity>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'box-none' }}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPostModal(false)}><Text style={[styles.modalCancel, { color: c.textSecondary }]}>取消</Text></TouchableOpacity>
              <Text style={[styles.modalTitle, { color: c.text }]}>发布帖子</Text>
              <TouchableOpacity onPress={handlePublish} disabled={posting || !postText.trim()}>
                <Text style={[styles.modalPublish, { color: (!posting && postText.trim()) ? c.primary : c.textSecondary }]}>{posting ? '发布中...' : '发布'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSectionLabel, { color: c.textSecondary }]}>选择分类</Text>
            <View style={styles.modalCatRow}>
              {CATEGORIES.filter(c => c !== '全部').map(cat => (
                <TouchableOpacity key={cat}
                  style={[styles.modalCatTag, { backgroundColor: postCategory === cat ? CATEGORY_COLORS[cat] : CATEGORY_BG[cat], borderColor: CATEGORY_COLORS[cat] }]}
                  onPress={() => setPostCategory(cat)}>
                  <Text style={{ color: postCategory === cat ? '#FFF' : CATEGORY_COLORS[cat], fontSize: 13 }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.modalInput, { color: c.text, backgroundColor: c.surface }]}
              placeholder="分享你的想法..." placeholderTextColor={c.textSecondary}
              multiline maxLength={500} value={postText} onChangeText={setPostText} autoFocus />
            <Text style={[styles.charCount, { color: c.textSecondary }]}>{postText.length}/500</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 评论弹窗 - 苹果风格居中卡片+虚化背景 */}
      <Modal visible={!!commentPost} transparent animationType="none" onRequestClose={() => setCommentPost(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => { console.log('[评论] 点击关闭'); setCommentPost(null); }}>
          <BlurView intensity={80} tint={blurTint} style={StyleSheet.absoluteFill} />
        </TouchableOpacity>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'box-none' }}>
          {/* 居中卡片 */}
          <View style={[styles.commentCard, { backgroundColor: c.surface }]}>
            {/* 卡片头部 */}
            <View style={[styles.commentCardHeader, { borderBottomColor: c.border }]}>
              <View style={{ width: 40 }} />
              <Text style={[styles.commentCardTitle, { color: c.text }]}>评论</Text>
              <TouchableOpacity onPress={() => setCommentPost(null)}>
                <Text style={{ color: c.textSecondary, fontSize: 15 }}>关闭</Text>
              </TouchableOpacity>
            </View>
            {/* 帖子内容 */}
            <ScrollView style={styles.commentScroll} contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={styles.commentPostHeader}>
                <View style={styles.avatarWrap}><Text style={styles.avatarText}>🌱</Text></View>
                <View style={styles.authorInfo}>
                  <Text style={[styles.authorName, { color: c.text }]}>{commentPost?.authorName || '匿名用户'}</Text>
                  <Text style={[styles.postMeta, { color: c.textSecondary }]}>{formatTime(commentPost?.createTime)}</Text>
                </View>
              </View>
              <Text style={[styles.commentPostText, { color: c.text }]}>{commentPost?.text || ''}</Text>
              {/* 分隔 */}
              <View style={[styles.commentDivider, { borderTopColor: c.border }]}>
                <Text style={[styles.commentDividerText, { color: c.textSecondary }]}>全部评论 ({comments.length})</Text>
              </View>
              {/* 评论列表 */}
              {comments.length === 0 ? (
                <View style={styles.commentEmpty}><Text style={{ color: c.textSecondary, fontSize: 14 }}>暂无评论，快来说点什么吧~</Text></View>
              ) : comments.map((item: any, index: number) => (
                <View key={item._id || item.id || index} style={[styles.commentItem, { borderBottomColor: c.border }]}>
                  <View style={styles.commentAvatar}><Text style={{ fontSize: 13 }}>🌱</Text></View>
                  <View style={styles.commentContent}>
                    <Text style={[styles.commentAuthorName, { color: c.text }]}>{item.authorName}</Text>
                    <Text style={[styles.commentText, { color: c.textSecondary }]}>{item.text}</Text>
                    <Text style={[styles.commentTime, { color: c.textSecondary }]}>{formatTime(item.createTime)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            {/* 输入区 */}
            <View style={[styles.commentInputWrap, { borderTopColor: c.border }]}>
              <TextInput style={[styles.commentInput, { backgroundColor: c.background, color: c.text }]}
                placeholder="说点什么..." placeholderTextColor={c.textSecondary} value={commentText}
                onChangeText={setCommentText} maxLength={200} />
              <TouchableOpacity style={[styles.commentSendBtn, { backgroundColor: commentText.trim() ? c.primary : '#CCC' }]}
                onPress={handleSendComment} disabled={!commentText.trim()}>
                <Text style={styles.commentSendBtnText}>发送</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🆕 举报弹窗 */}
      <Modal visible={reportModal.visible} transparent animationType="fade" onRequestClose={() => setReportModal({ visible: false, post: null, type: 'post', targetId: '' })}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setReportModal({ visible: false, post: null, type: 'post', targetId: '' })}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', pointerEvents: 'box-none' }}>
            <View style={[styles.modalCard, { backgroundColor: c.surface, padding: 20 }]}>
              <Text style={[styles.modalTitle, { color: c.text, marginBottom: 16, textAlign: 'center' }]}>举报</Text>
              <Text style={[styles.modalSectionLabel, { color: c.textSecondary, marginBottom: 12 }]}>选择举报原因</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {REPORT_REASONS.map(reason => (
                  <TouchableOpacity key={reason} style={[styles.modalCatTag, { paddingHorizontal: 16, paddingVertical: 8 }]} onPress={() => setReportReason(reason)}>
                    <Text style={{ color: reportReason === reason ? '#FFF' : c.text, fontSize: 14 }}>{reason}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20, backgroundColor: c.background }} onPress={() => setReportModal({ visible: false, post: null, type: 'post', targetId: '' })}>
                  <Text style={{ color: c.text, fontSize: 15 }}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20, backgroundColor: '#FF4444' }} onPress={handleReport} disabled={reportLoading}>
                  <Text style={{ color: '#FFF', fontSize: 15 }}>{reportLoading ? '提交中...' : '提交'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🆕 更多操作弹窗 */}
      <Modal visible={!!moreMenuPost} transparent animationType="fade" onRequestClose={() => setMoreMenuPost(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setMoreMenuPost(null)}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', pointerEvents: 'box-none' }}>
            <View style={[styles.modalCard, { backgroundColor: c.surface, paddingVertical: 20, paddingHorizontal: 30 }]}>
              <TouchableOpacity style={{ paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }} onPress={() => { setReportModal({ visible: true, post: moreMenuPost, type: 'post', targetId: moreMenuPost._id }); setMoreMenuPost(null); }}>
                <Text style={{ fontSize: 16, color: '#FF4444' }}>🚩 举报帖子</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 14 }} onPress={() => handleBlockUser(moreMenuPost?.authorId)}>
                <Text style={{ fontSize: 16, color: c.text }}>🚫 拉黑用户</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, marginTop: 10 }} onPress={() => setMoreMenuPost(null)}>
                <Text style={{ fontSize: 16, color: c.textSecondary, textAlign: 'center' }}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 48, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  categoryWrap: { paddingVertical: 8, borderBottomWidth: 0.5, minHeight: 44 },
  searchInput: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, fontSize: 14 },
  catTag: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, borderWidth: 1, marginRight: 8 },
  catTagText: { fontSize: 13, fontWeight: '500' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyText: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  emptySub: { fontSize: 14, marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { fontSize: 15, fontWeight: '600' },
  postCard: { borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18 },
  authorInfo: { flex: 1, marginLeft: 10 },
  authorName: { fontSize: 14, fontWeight: '600' },
  postMeta: { fontSize: 11, marginTop: 1 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryTagText: { fontSize: 11, fontWeight: '600' },
  postText: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  actionBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 0.5, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionBtnRight: { marginRight: 0, marginLeft: 'auto' },
  actionIcon: { fontSize: 16, marginRight: 4 },
  actionIconRed: { color: '#FF4757' },
  actionIconYellow: { color: '#FFD700' },
  actionCount: { fontSize: 13 },
  actionCountRed: { color: '#FF4757' },
  actionCountYellow: { color: '#FFD700' },
  fab: { position: 'absolute', bottom: 85, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 8px rgba(74,144,226,0.35)', elevation: 6 },
  fabText: { fontSize: 28, color: '#FFF', fontWeight: '300', marginTop: -2 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 44 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalPublish: { fontSize: 15, fontWeight: '600' },
  modalSectionLabel: { fontSize: 12, marginBottom: 10 },
  modalCatRow: { flexDirection: 'row', marginBottom: 16, gap: 8, flexWrap: 'wrap', maxWidth: '100%' },
  modalCatTag: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  modalInput: { borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 23, minHeight: 120, textAlignVertical: 'top', borderWidth: 1 },
  charCount: { textAlign: 'right', fontSize: 12, marginTop: 8 },
  commentDivider: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, marginTop: 0 },
  commentDividerText: { fontSize: 12, fontWeight: '600' },
  commentItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 0.5 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  commentContent: { flex: 1, marginLeft: 10 },
  commentAuthorName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  commentText: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  commentTime: { fontSize: 11 },
  commentEmpty: { alignItems: 'center', paddingVertical: 30 },
  commentInputWrap: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 0.5, gap: 10 },
  commentInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, borderWidth: 1, borderColor: '#E5E5E5' },
  commentSendBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  commentSendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  // 苹果风格评论弹窗
  commentOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  commentCard: { width: '90%', maxHeight: '80%', borderRadius: 20, overflow: 'hidden' },
  commentCardHeader: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentCardTitle: { fontSize: 16, fontWeight: '600' },
  commentScroll: { maxHeight: 400 },
  commentPostHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  commentPostText: { fontSize: 15, lineHeight: 22 },
  // 🆕 Tab样式
  tabBar: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#4A90E2' },
  tabText: { fontSize: 14 },
  // 🆕 话题标签样式
  topicsContainer: { maxHeight: 40 },
  topicTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  topicText: { fontSize: 13 },
  topicCount: { fontSize: 12, marginLeft: 4 },
});
