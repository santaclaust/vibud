import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { getCommunityPosts, publishPost, toggleWarmth, toggleCollect } from '../services/CloudBaseService';

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
    setLoading(true);
    try {
      const category = activeCategory === '全部' ? undefined : activeCategory;
      const data = await getCommunityPosts(category, 100);
      console.log('[Community] fetchPosts 返回条数:', data.length, '首条:', JSON.stringify(data[0])?.slice(0, 200));
      setPosts(data);
    } catch (err) { console.error('获取帖子失败:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeCategory]);

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
    setPosts((prev: any[]) => prev.map((p: any) => p.id === updated.id ? updated : p));
    if (commentPost && commentPost.id === updated.id) setCommentPost(updated);
  };

  const handleWarmth = async (post: any) => {
    const postId = post.id || post._id;
    if (!postId) { Alert.alert('帖子数据异常'); return; }
    try {
      const warmed = (post.warmedBy || []).includes(uid);
      const updated = { ...post, warmthCount: warmed ? Math.max(0, (post.warmthCount || 0) - 1) : (post.warmthCount || 0) + 1, warmedBy: warmed ? (post.warmedBy || []).filter((u: string) => u !== uid) : [...(post.warmedBy || []), uid] };
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
    try {
      const collected = (post.collectedBy || []).includes(uid);
      const updated = { ...post, collectedBy: collected ? (post.collectedBy || []).filter((u: string) => u !== uid) : [...(post.collectedBy || []), uid] };
      syncPost(updated);
      await toggleCollect(post._id, uid);
    } catch (err) {
      syncPost(post);
      console.error('收藏失败:', err);
      Alert.alert('操作失败', err instanceof Error ? err.message : '请检查网络或稍后重试');
    }
  };

  const openComment = (post: any) => { setCommentPost(post); setComments([]); };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    const displayName = userId ? '用户' + userId.slice(-4) : '游客';
    const newComment: any = { id: 'comment_' + Date.now(), postId: commentPost.id, authorId: uid, authorName: displayName, text: commentText.trim(), createdAt: Date.now() };
    setComments((prev: any[]) => [newComment, ...prev]);
    setCommentText('');
    const updated = { ...commentPost, commentCount: (commentPost.commentCount || 0) + 1 };
    syncPost(updated);
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

  const isWarmed = (post: any) => (post.warmedBy || []).includes(uid);
  const isCollected = (post: any) => (post.collectedBy || []).includes(uid);

  const renderPost = ({ item }: { item: any }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatarWrap}><Text style={styles.avatarText}>🌱</Text></View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.authorName}</Text>
          <Text style={styles.postMeta}>{formatTime(item.createdAt)}</Text>
        </View>
        <View style={[styles.categoryTag, { backgroundColor: CATEGORY_BG[item.category] || '#F5F5F5' }]}>
          <Text style={[styles.categoryTagText, { color: CATEGORY_COLORS[item.category] || '#666' }]}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.postText}>{item.text}</Text>
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleWarmth(item)}>
          <Text style={[styles.actionIcon, isWarmed(item) && styles.actionIconRed]}>{isWarmed(item) ? '❤️' : '🤍'}</Text>
          <Text style={[styles.actionCount, isWarmed(item) && styles.actionCountRed]}>{item.warmthCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openComment(item)}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{item.commentCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('转发功能', '开发中')}>
          <Text style={styles.actionIcon}>🔄</Text>
          <Text style={styles.actionCount}>{item.shareCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRight]} onPress={() => handleCollect(item)}>
          <Text style={[styles.actionIcon, isCollected(item) && styles.actionIconYellow]}>{isCollected(item) ? '★' : '☆'}</Text>
          <Text style={[styles.actionCount, isCollected(item) && styles.actionCountYellow]}>{isCollected(item) ? '已收藏' : '收藏'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>社群</Text>
      </View>
      <View style={styles.categoryWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} style={[styles.catTag, { backgroundColor: activeCategory === cat ? CATEGORY_COLORS[cat] : '#FFF', borderColor: CATEGORY_COLORS[cat] }]} onPress={() => setActiveCategory(cat)}>
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
            <Text style={styles.emptyBtnText}>发布帖子</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={posts} renderItem={renderPost}
          keyExtractor={(item, index) => `post_${item._id || item.id || item.createdAt}_${index}`}
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

      {/* 评论弹窗 */}
      <Modal visible={!!commentPost} transparent animationType="slide" onRequestClose={() => setCommentPost(null)}>
        <SafeAreaView style={[styles.commentModal, { backgroundColor: c.background }]}>
          <View style={[styles.commentHeader, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setCommentPost(null)}><Text style={{ color: c.textSecondary, fontSize: 15 }}>← 返回</Text></TouchableOpacity>
            <Text style={[styles.commentHeaderTitle, { color: c.text }]}>评论</Text>
            <View style={{ width: 50 }} />
          </View>
          {commentPost && (
            <FlatList
              data={[{ ...commentPost, isOriginalPost: true }, ...comments.map((c: any) => ({ ...c, isOriginalPost: false }))]}
              keyExtractor={(item: any, index: number) => `comment_${item._id || item.id || item.createdAt}_${index}`}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListHeaderComponent={
                <View style={[styles.commentPostCard, { backgroundColor: c.surface }]}>
                  <View style={styles.postHeader}>
                    <View style={styles.avatarWrap}><Text style={styles.avatarText}>🌱</Text></View>
                    <View style={styles.authorInfo}>
                      <Text style={styles.authorName}>{commentPost.authorName}</Text>
                      <Text style={styles.postMeta}>{formatTime(commentPost.createdAt)}</Text>
                    </View>
                    <View style={[styles.categoryTag, { backgroundColor: CATEGORY_BG[commentPost.category] || '#F5F5F5' }]}>
                      <Text style={[styles.categoryTagText, { color: CATEGORY_COLORS[commentPost.category] || '#666' }]}>{commentPost.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.postText}>{commentPost.text}</Text>
                  <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleWarmth(commentPost)}>
                      <Text style={[styles.actionIcon, isWarmed(commentPost) && styles.actionIconRed]}>{isWarmed(commentPost) ? '❤️' : '🤍'}</Text>
                      <Text style={[styles.actionCount, isWarmed(commentPost) && styles.actionCountRed]}>{commentPost.warmthCount || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                      <Text style={styles.actionIcon}>💬</Text>
                      <Text style={styles.actionCount}>{commentPost.commentCount || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('转发功能', '开发中')}>
                      <Text style={styles.actionIcon}>🔄</Text>
                      <Text style={styles.actionCount}>{commentPost.shareCount || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRight]} onPress={() => handleCollect(commentPost)}>
                      <Text style={[styles.actionIcon, isCollected(commentPost) && styles.actionIconYellow]}>{isCollected(commentPost) ? '★' : '☆'}</Text>
                      <Text style={[styles.actionCount, isCollected(commentPost) && styles.actionCountYellow]}>{isCollected(commentPost) ? '已收藏' : '收藏'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.commentDivider, { borderTopColor: c.border }]}>
                    <Text style={[styles.commentDividerText, { color: c.textSecondary }]}>评论</Text>
                  </View>
                </View>
              }
              renderItem={({ item, index }: { item: any; index: number }) => {
                if (index === 0) return null;
                return (
                  <View style={[styles.commentItem, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                    <View style={styles.commentAvatar}><Text style={{ fontSize: 13 }}>🌱</Text></View>
                    <View style={styles.commentContent}>
                      <Text style={styles.commentAuthorName}>{item.authorName}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                      <Text style={[styles.commentTime, { color: c.textSecondary }]}>{formatTime(item.createdAt)}</Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<View style={styles.commentEmpty}><Text style={{ color: c.textSecondary, fontSize: 14 }}>暂无评论，快来抢沙发吧~</Text></View>}
            />
          )}
          <View style={[styles.commentInputWrap, { backgroundColor: c.surface, borderTopColor: c.border }]}>
            <TextInput style={[styles.commentInput, { backgroundColor: c.background, color: c.text }]}
              placeholder="说点什么..." placeholderTextColor={c.textSecondary} value={commentText}
              onChangeText={setCommentText} maxLength={200} />
            <TouchableOpacity style={[styles.commentSendBtn, { backgroundColor: commentText.trim() ? c.primary : '#CCC' }]}
              onPress={handleSendComment} disabled={!commentText.trim()}>
              <Text style={styles.commentSendBtnText}>发送</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 48, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#E5E5E5' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  categoryWrap: { paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#E5E5E5' },
  catTag: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, borderWidth: 1, marginRight: 8 },
  catTagText: { fontSize: 13, fontWeight: '500' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyText: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  emptySub: { fontSize: 14, marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  postCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18 },
  authorInfo: { flex: 1, marginLeft: 10 },
  authorName: { fontSize: 14, fontWeight: '600', color: '#1F1F1F' },
  postMeta: { fontSize: 11, color: '#999', marginTop: 1 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryTagText: { fontSize: 11, fontWeight: '600' },
  postText: { fontSize: 15, lineHeight: 22, color: '#1F1F1F', marginBottom: 12 },
  actionBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#F0F0F0', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionBtnRight: { marginRight: 0, marginLeft: 'auto' },
  actionIcon: { fontSize: 16, marginRight: 4 },
  actionIconRed: { color: '#FF4757' },
  actionIconYellow: { color: '#FFD700' },
  actionCount: { fontSize: 13, color: '#999' },
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
  modalInput: { borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 23, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E5E5E5' },
  charCount: { textAlign: 'right', fontSize: 12, marginTop: 8, color: '#999' },
  commentModal: { flex: 1 },
  commentHeader: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  commentHeaderTitle: { fontSize: 16, fontWeight: '600' },
  commentPostCard: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5E5E5' },
  commentDivider: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, marginTop: 0 },
  commentDividerText: { fontSize: 12, fontWeight: '600' },
  commentItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 0.5 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  commentContent: { flex: 1, marginLeft: 10 },
  commentAuthorName: { fontSize: 13, fontWeight: '600', color: '#1F1F1F', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 4 },
  commentTime: { fontSize: 11 },
  commentEmpty: { alignItems: 'center', paddingVertical: 30 },
  commentInputWrap: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 0.5, gap: 10 },
  commentInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, borderWidth: 1, borderColor: '#E5E5E5' },
  commentSendBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  commentSendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
