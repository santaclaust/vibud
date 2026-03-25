import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { getTreeHolePosts, likeTreeHole, postTreeHole, queryDocuments } from '../services/CloudBaseService';

const CATEGORIES = ['全部', '内观', '感悟', '陪伴', '远眺', '隐喻'];
const CATEGORY_COLORS: Record<string, string> = {
  '内观': '#8B9FD4', '感悟': '#D4A08B', '陪伴': '#D48BA0',
  '远眺': '#8BD4A0', '隐喻': '#A08BD4', '全部': '#999999',
};

export default function CommunityScreen({ navigation, colors, userId }: any) {
  const c = colors || { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#999999', border: '#F0F0F0', primary: '#4A90E2' };

  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState('内观');
  const [posting, setPosting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await queryDocuments('treehole', undefined, [{ field: 'timestamp', order: 'desc' }], 100);
      setPosts(data.data || []);
    } catch (err) {
      console.error('获取帖子失败:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // 分类筛选
  useEffect(() => {
    if (activeCategory === '全部') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(p => p.category === activeCategory));
    }
  }, [activeCategory, posts]);

  const handleRefresh = () => { setRefreshing(true); fetchPosts(); };

  const handleLike = async (post: any) => {
    const uid = userId || 'guest';
    try {
      await likeTreeHole(post.id, uid);
      setPosts(prev => prev.map(p => {
        if (p.id !== post.id) return p;
        const likedBy = p.likedBy || [];
        const hasLiked = likedBy.includes(uid);
        return {
          ...p,
          likes: hasLiked ? p.likes : (p.likes || 0) + 1,
          likedBy: hasLiked ? likedBy : [...likedBy, uid],
        };
      }));
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const handlePost = async () => {
    if (!postText.trim()) { Alert.alert('请输入内容'); return; }
    setPosting(true);
    try {
      const uid = userId || 'guest';
      await postTreeHole({ userId: uid, text: postText.trim(), category: postCategory, likes: 0 });
      setShowPostModal(false);
      setPostText('');
      setPostCategory('内观');
      fetchPosts();
    } catch (err) {
      Alert.alert('发布失败，请重试');
    } finally {
      setPosting(false);
    }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const isLikedByMe = (post: any) => {
    const uid = userId || 'guest';
    return (post.likedBy || []).includes(uid);
  };

  const renderPost = ({ item }: { item: any }) => {
    const liked = isLikedByMe(item);
    return (
      <View style={[styles.postCard, { backgroundColor: c.surface }]}>
        <View style={styles.postHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_COLORS[item.category] || '#999') + '22' }]}>
            <Text style={[styles.categoryBadgeText, { color: CATEGORY_COLORS[item.category] || '#999' }]}>{item.category || '内观'}</Text>
          </View>
          <Text style={[styles.postTime, { color: c.textSecondary }]}>{formatTime(item.timestamp)}</Text>
        </View>
        <Text style={[styles.postText, { color: c.text }]}>{item.text}</Text>
        <View style={styles.postFooter}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
            <Text style={[styles.actionText, liked && { color: '#FF6B6B' }]}>❤️ {item.likes || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>社群</Text>
      </View>

      {/* 分类标签 */}
      <View style={styles.categoryScroll}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryTag,
                { backgroundColor: activeCategory === item ? (CATEGORY_COLORS[item] || '#999') : c.surface, borderColor: CATEGORY_COLORS[item] || '#999' }
              ]}
              onPress={() => setActiveCategory(item)}
            >
              <Text style={[
                styles.categoryTagText,
                { color: activeCategory === item ? '#FFF' : (CATEGORY_COLORS[item] || '#999') }
              ]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.loading}><Text style={{ color: c.textSecondary }}>加载中...</Text></View>
      ) : filteredPosts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={[styles.emptyText, { color: c.text }]}>暂无内容</Text>
          <Text style={[styles.emptySub, { color: c.textSecondary }]}>成为第一个分享的人吧</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={item => item._id || item.id || String(item.timestamp)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.textSecondary} />}
        />
      )}

      {/* 发布按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowPostModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 发布弹窗 */}
      <Modal visible={showPostModal} transparent animationType="slide" onRequestClose={() => setShowPostModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <Text style={[styles.modalCancel, { color: c.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: c.text }]}>分享心情</Text>
              <TouchableOpacity onPress={handlePost} disabled={posting}>
                <Text style={[styles.modalPublish, { color: posting ? c.textSecondary : c.primary }]}>{posting ? '发布中...' : '发布'}</Text>
              </TouchableOpacity>
            </View>
            {/* 分类选择 */}
            <View style={styles.postCategoryRow}>
              {['内观', '感悟', '陪伴', '远眺', '隐喻'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.postCategoryTag, postCategory === cat && { backgroundColor: CATEGORY_COLORS[cat] }]}
                  onPress={() => setPostCategory(cat)}
                >
                  <Text style={{ color: postCategory === cat ? '#FFF' : CATEGORY_COLORS[cat], fontSize: 13 }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.postInput, { color: c.text, backgroundColor: c.background }]}
              placeholder="此刻你在想什么..."
              placeholderTextColor={c.textSecondary}
              multiline
              value={postText}
              onChangeText={setPostText}
              maxLength={300}
            />
            <Text style={[styles.charCount, { color: c.textSecondary }]}>{postText.length}/300</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 44, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '600' },
  categoryScroll: { paddingVertical: 12 },
  categoryTag: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  categoryTagText: { fontSize: 13, fontWeight: '500' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, marginBottom: 6 },
  emptySub: { fontSize: 14 },
  postCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  categoryBadgeText: { fontSize: 12, fontWeight: '600' },
  postTime: { fontSize: 12 },
  postText: { fontSize: 15, lineHeight: 23, marginBottom: 10 },
  postFooter: { flexDirection: 'row' },
  actionBtn: { paddingVertical: 4 },
  actionText: { fontSize: 13, color: '#999' },
  fab: { position: 'absolute', bottom: 110, right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: '#FFF', fontWeight: '300', marginTop: -2 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalPublish: { fontSize: 15, fontWeight: '600' },
  postCategoryRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  postCategoryTag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  postInput: { borderRadius: 12, padding: 16, fontSize: 15, lineHeight: 23, minHeight: 120, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', fontSize: 12, marginTop: 8 },
});
