import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform,
  Alert, ScrollView
} from 'react-native';
import { getCommunityPosts, publishPost, toggleWarmth, toggleCollect } from '../services/CloudBaseService';

const CATEGORIES = ['全部', '职场', '生活', '情感', '其他'];
const CATEGORY_COLORS: Record<string, string> = {
  '全部': '#666', '职场': '#5B8DEF', '生活': '#4CAF50', '情感': '#FF7E7E', '其他': '#9E9E9E',
};
const CATEGORY_BG: Record<string, string> = {
  '全部': '#F5F5F5', '职场': '#EEF3FF', '生活': '#F0FFF4', '情感': '#FFF0F0', '其他': '#F5F5F5',
};

export default function CommunityScreen({ navigation, colors, userId }: any) {
  const c = colors || { background: '#F2F3F5', surface: '#FFFFFF', text: '#1F1F1F', textSecondary: '#999', border: '#E5E5E5', primary: '#4A90E2' };

  const [posts, setPosts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState('生活');
  const [posting, setPosting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const category = activeCategory === '全部' ? undefined : activeCategory;
      const data = await getCommunityPosts(category, 100);
      setPosts(data);
    } catch (err) {
      console.error('获取帖子失败:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleRefresh = () => { setRefreshing(true); fetchPosts(); };

  const handlePublish = async () => {
    if (!postText.trim()) { Alert.alert('请输入内容'); return; }
    if (postText.trim().length < 5) { Alert.alert('内容太短了'); return; }
    setPosting(true);
    try {
      const uid = userId || 'guest';
      const displayName = userId ? `用户${userId.slice(-4)}` : '游客';
      await publishPost({ authorId: uid, authorName: displayName, text: postText.trim(), category: postCategory });
      setShowPostModal(false);
      setPostText('');
      fetchPosts();
    } catch (err) {
      Alert.alert('发布失败，请重试');
    } finally {
      setPosting(false);
    }
  };

  const handleWarmth = async (post: any) => {
    const uid = userId || 'guest';
    try {
      await toggleWarmth(post.id, uid);
      setPosts(prev => prev.map(p => {
        if (p.id !== post.id) return p;
        const warmed = p.warmedBy || [];
        const hasWarmed = warmed.includes(uid);
        return { ...p, warmthCount: hasWarmed ? Math.max(0, p.warmthCount - 1) : p.warmthCount + 1, warmedBy: hasWarmed ? warmed.filter((u: string) => u !== uid) : [...warmed, uid] };
      }));
    } catch (err) {
      console.error('暖心失败:', err);
    }
  };

  const handleCollect = async (post: any) => {
    const uid = userId || 'guest';
    try {
      await toggleCollect(post.id, uid);
      setPosts(prev => prev.map(p => {
        if (p.id !== post.id) return p;
        const collected = p.collectedBy || [];
        const hasCollected = collected.includes(uid);
        return { ...p, collectedBy: hasCollected ? collected.filter((u: string) => u !== uid) : [...collected, uid] };
      }));
    } catch (err) {
      console.error('收藏失败:', err);
    }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const isWarmedByMe = (post: any) => {
    const uid = userId || 'guest';
    return (post.warmedBy || []).includes(uid);
  };

  const isCollectedByMe = (post: any) => {
    const uid = userId || 'guest';
    return (post.collectedBy || []).includes(uid);
  };

  const renderPost = ({ item }: { item: any }) => {
    const warmed = isWarmedByMe(item);
    const collected = isCollectedByMe(item);

    return (
      <View style={styles.postCard}>
        {/* 帖子头部 */}
        <View style={styles.postHeader}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>🌱</Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{item.authorName}</Text>
            <Text style={styles.postMeta}>{formatTime(item.createdAt)}</Text>
          </View>
          <View style={[styles.categoryTag, { backgroundColor: CATEGORY_BG[item.category] || '#F5F5F5' }]}>
            <Text style={[styles.categoryTagText, { color: CATEGORY_COLORS[item.category] || '#666' }]}>{item.category}</Text>
          </View>
        </View>

        {/* 帖子正文 */}
        <Text style={styles.postText}>{item.text}</Text>

        {/* 互动栏 */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleWarmth(item)}>
            <Text style={[styles.actionIcon, warmed && styles.actionIconActive]}>❤️</Text>
            <Text style={[styles.actionCount, warmed && styles.actionCountActive]}>{item.warmthCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('评论功能', '评论区开发中，敬请期待')}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionCount}>{item.commentCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('转发功能', '转发功能开发中，敬请期待')}>
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionCount}>{item.shareCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRight]} onPress={() => handleCollect(item)}>
            <Text style={[styles.actionIcon, collected && styles.actionIconActive]}>{(collected) ? '★' : '☆'}</Text>
            <Text style={[styles.actionCount, collected && styles.actionCountActive]}>收藏</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      {/* 顶部标题 */}
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>社群</Text>
      </View>

      {/* 分类标签 */}
      <View style={styles.categoryWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catTag, { backgroundColor: activeCategory === cat ? CATEGORY_COLORS[cat] : '#FFF', borderColor: CATEGORY_COLORS[cat] }]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.catTagText, { color: activeCategory === cat ? '#FFF' : CATEGORY_COLORS[cat] }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 帖子列表 */}
      {loading ? (
        <View style={styles.loading}><Text style={{ color: c.textSecondary }}>加载中...</Text></View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={[styles.emptyText, { color: c.text }]}>还没有帖子</Text>
          <Text style={[styles.emptySub, { color: c.textSecondary }]}>成为第一个分享的人吧</Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: c.primary }]} onPress={() => setShowPostModal(true)}>
            <Text style={styles.emptyBtnText}>发布帖子</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item._id || item.id || String(item.createdAt)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.textSecondary} />}
        />
      )}

      {/* 发布按钮 */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowPostModal(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 发布弹窗 */}
      <Modal visible={showPostModal} transparent animationType="slide" onRequestClose={() => setShowPostModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            {/* 弹窗头部 */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <Text style={[styles.modalCancel, { color: c.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: c.text }]}>发布帖子</Text>
              <TouchableOpacity onPress={handlePublish} disabled={posting || !postText.trim()}>
                <Text style={[styles.modalPublish, { color: (!posting && postText.trim()) ? c.primary : c.textSecondary }]}>
                  {posting ? '发布中...' : '发布'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 分类选择 */}
            <Text style={[styles.modalSectionLabel, { color: c.textSecondary }]}>选择分类</Text>
            <View style={styles.modalCatRow}>
              {CATEGORIES.slice(1).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalCatTag, {
                    backgroundColor: postCategory === cat ? CATEGORY_COLORS[cat] : CATEGORY_BG[cat],
                    borderColor: CATEGORY_COLORS[cat],
                  }]}
                  onPress={() => setPostCategory(cat)}
                >
                  <Text style={{ color: postCategory === cat ? '#FFF' : CATEGORY_COLORS[cat], fontSize: 13 }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 内容输入 */}
            <TextInput
              style={[styles.modalInput, { color: c.text, backgroundColor: '#F7F7F7' }]}
              placeholder="分享你的想法..."
              placeholderTextColor="#BFBFBF"
              multiline
              maxLength={500}
              value={postText}
              onChangeText={setPostText}
              autoFocus
            />
            <Text style={[styles.charCount, { color: c.textSecondary }]}>{postText.length}/500</Text>
          </View>
        </KeyboardAvoidingView>
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
  actionIcon: { fontSize: 15, marginRight: 4 },
  actionIconActive: { color: '#FF6B6B' },
  actionCount: { fontSize: 13, color: '#999' },
  actionCountActive: { color: '#FF6B6B' },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: '#FFF', fontWeight: '300', marginTop: -2 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 44 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalPublish: { fontSize: 15, fontWeight: '600' },
  modalSectionLabel: { fontSize: 12, marginBottom: 10 },
  modalCatRow: { flexDirection: 'row', marginBottom: 16, gap: 8, flexWrap: 'wrap' },
  modalCatTag: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  modalInput: { borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 23, minHeight: 120, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', fontSize: 12, marginTop: 8 },
});
