import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { getCommunityPosts, publishPost, toggleWarmth, toggleCollect, getUserPostStates, publishComment, getComments, getPostById } from '../services/CloudBaseService';

const CATEGORIES = ['全部', '情绪', '心理', '家庭', '爱情', '职场', '学业', '生活', '成长', '互助', '吐槽', '其他'];
const CATEGORY_COLORS: Record<string, string> = {
  '全部': '#666', '情绪': '#E57373', '心理': '#9575CD', '家庭': '#FF8A65',
  '爱情': '#F06292', '职场': '#5B8DEF', '学业': '#4FC3F7', '生活': '#81C784',
  '成长': '#AED581', '互助': '#FFD54F', '吐槽': '#90A4AE', '其他': '#BDBDBD',
};
const CATEGORY_BG: Record<string, string> = {
  '全部': '#F5F5F5', '情绪': '#FFF0F0', '心理': '#F3EFFF', '家庭': '#FFF3E0',
  '爱情': '#FCE4EC', '职场': '#EEF3FF', '学业': '#E1F5FE', '生活': '#F0FFF4',
  '成长': '#F1F8E9', '互助': '#FFFDE7', '吐槽': '#ECEFF1', '其他': '#F5F5F5',
};

export default function CommunityScreen({ navigation, colors, userId }: any) {
  const c = colors || { background: '#F2F3F5', surface: '#FFFFFF', text: '#1F1F1F', textSecondary: '#999', border: '#E5E5E5', primary: '#4A90E2' };
  const uid = userId || 'guest';

  const [posts, setPosts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState('情绪');
  const [posting, setPosting] = useState(false);
  const [commentPost, setCommentPost] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  const fetchPosts = useCallback(async () => {
    if (!uid) return; // userId 未设置前不查，避免用 guest uid 查不到真实用户数据
    setLoading(true);
    try {
      const category = activeCategory === '全部' ? undefined : activeCategory;
      const data = await getCommunityPosts(category, 100);
      const postIds = data.map((p: any) => p._id || p.id);
      const { likedSet, collectedSet } = await getUserPostStates(postIds, uid);
      const merged = data.map((p: any) => {
        const pid = p._id || p.id;
        return { ...p, _warmed: likedSet.has(pid), _collected: collectedSet.has(pid) };
      });
      console.log('[Community] fetchPosts:', merged.length, '条，暖心状态:', likedSet.size, '收藏状态:', collectedSet.size);
      setPosts(merged);
    } catch (err) { console.error('获取帖子失败:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeCategory, uid]);

  // userId 从空变真实值时（匿名登录完成后）重新拉取帖子
  const prevUserId = useRef(userId);
  useEffect(() => {
    if (prevUserId.current !== userId && userId) {
      prevUserId.current = userId;
      fetchPosts();
    }
  }, [userId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleRefresh = () => { setRefreshing(true); fetchPosts(); };

  const handlePublish = async () => {
    if (!postText.trim() || postText.trim().length < 5) { Alert.alert('内容太短了'); return; }
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
    setCommentPost(post);
    setComments([]);
    if (!uid || !post._id) return;
    try {
      const [comments, postData] = await Promise.all([
        getComments(post._id),
        getPostById(post._id),
      ]);
      setComments(comments);
      if (postData) {
        // 确保 _id 是干净字符串（CloudBase 返回的可能是对象格式）
        const cleanPost = { ...postData, _id: String(postData._id || post._id) };
        setCommentPost(cleanPost);
      }
    } catch (err) { console.error('加载评论失败:', err); }
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    if (!uid) { Alert.alert('请等待登录完成'); return; }
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
          <Text style={[styles.actionCount, { color: c.textSecondary }, isCollected(item) && styles.actionCountYellow]}>{isCollected(item) ? '已收藏' : '收藏'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>社群</Text>
      </View>
      <View style={[styles.categoryWrap, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} style={[styles.catTag, { backgroundColor: activeCategory === cat ? CATEGORY_COLORS[cat] : c.surface, borderColor: CATEGORY_COLORS[cat] }]} onPress={() => setActiveCategory(cat)}>
              <Text style={[styles.catTagText, { color: activeCategory === cat ? '#FFF' : CATEGORY_COLORS[cat] }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
      <Modal visible={showPostModal} transparent animationType="slide" onRequestClose={() => setShowPostModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
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
      <Modal visible={!!commentPost} transparent animationType="fade" onRequestClose={() => setCommentPost(null)}>
        <View style={styles.commentOverlay}>
          {/* 苹果虚化背景 */}
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          {/* 半透明遮罩点击关闭 */}
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setCommentPost(null)} activeOpacity={1} />
          {/* 居中卡片 */}
          <View style={[styles.commentCard, { backgroundColor: c.surface }]}>
            {/* 卡片头部 */}
            <View style={[styles.commentCardHeader, { borderBottomColor: c.border }]}>
              <TouchableOpacity onPress={() => setCommentPost(null)}>
                <Text style={{ color: c.textSecondary, fontSize: 15 }}>关闭</Text>
              </TouchableOpacity>
              <Text style={[styles.commentCardTitle, { color: c.text }]}>评论</Text>
              <View style={{ width: 40 }} />
            </View>
            {/* 帖子内容 */}
            <ScrollView style={styles.commentScroll} contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={styles.commentPostHeader}>
                <View style={styles.avatarWrap}><Text style={styles.avatarText}>🌱</Text></View>
                <View style={styles.authorInfo}>
                  <Text style={[styles.authorName, { color: c.text }]}>{commentPost?.authorName}</Text>
                  <Text style={[styles.postMeta, { color: c.textSecondary }]}>{formatTime(commentPost?.createTime)}</Text>
                </View>
              </View>
              <Text style={[styles.commentPostText, { color: c.text }]}>{commentPost?.text}</Text>
              {/* 操作栏 */}
              <View style={[styles.actionBar, { borderTopColor: c.border, marginTop: 12 }]}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => commentPost && handleWarmth(commentPost)}>
                  <Text style={[styles.actionIcon, isWarmed(commentPost || {}) ? styles.actionIconRed : { color: c.textSecondary }]}>{isWarmed(commentPost || {}) ? '❤️' : '🤍'}</Text>
                  <Text style={[styles.actionCount, { color: c.textSecondary }, isWarmed(commentPost || {}) && styles.actionCountRed]}>{commentPost?.likeCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={[styles.actionIcon, { color: c.textSecondary }]}>💬</Text>
                  <Text style={[styles.actionCount, { color: c.textSecondary }]}>{commentPost?.commentCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRight]} onPress={() => commentPost && handleCollect(commentPost)}>
                  <Text style={[styles.actionIcon, isCollected(commentPost || {}) ? styles.actionIconYellow : { color: c.textSecondary }]}>{isCollected(commentPost || {}) ? '★' : '☆'}</Text>
                  <Text style={[styles.actionCount, { color: c.textSecondary }, isCollected(commentPost || {}) && styles.actionCountYellow]}>{isCollected(commentPost || {}) ? '已收藏' : '收藏'}</Text>
                </TouchableOpacity>
              </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 48, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  categoryWrap: { paddingVertical: 10, borderBottomWidth: 0.5 },
  catTag: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, borderWidth: 1, marginRight: 8 },
  catTagText: { fontSize: 13, fontWeight: '500' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyText: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  emptySub: { fontSize: 14, marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { fontSize: 15, fontWeight: '600' },
  postCard: { borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
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
  fab: { position: 'absolute', bottom: 85, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
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
});
