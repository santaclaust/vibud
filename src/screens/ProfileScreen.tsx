import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet as RNSS } from 'react-native';
import { BlurView } from 'expo-blur';
import { getEmotionLogs, getCommunityPosts, toggleCollect, getFavoritePosts, batchUncollect, getComments } from '../services/CloudBaseService';

interface ProfileScreenProps {
  navigation: any;
  colors: any;
  userId?: string | null;
  userInfo?: any;
  onUserCardPress?: () => void;
}

const menuItems = [
  { id: 'emotion', icon: '🌿', name: '心绪历程', arrow: '›' },
  { id: 'records', icon: '📝', name: '我的记录', arrow: '›' },
  { id: 'favorites', icon: '★', name: '收藏', arrow: '›' },
  { id: 'settings', icon: '⚙️', name: '设置', arrow: '›' },
  { id: 'help', icon: '❓', name: '帮助与反馈', arrow: '›' },
  { id: 'about', icon: 'ℹ️', name: '关于心芽', arrow: '›' },
];

export default function ProfileScreen({ navigation, colors: c, userId, userInfo, onUserCardPress }: ProfileScreenProps) {
  const displayName = userInfo?.nickname || '游客';
  const displayDesc = userId ? `ID: ${userId.slice(-8)}` : '未登录';
  const stats = userInfo?.stats || { confessionCount: 0, treeholeCount: 0, timeMachineCount: 0, continuousDays: 0 };

  // 情绪记忆弹窗
  const [showEmotionMemory, setShowEmotionMemory] = useState(false);
  const [emotionLogs, setEmotionLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 收藏弹窗
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoritePosts, setFavoritePosts] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);

  // 帖子详情弹窗
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [detailPost, setDetailPost] = useState<any>(null);
  const [detailComments, setDetailComments] = useState<any[]>([]);
  const [loadingDetailComments, setLoadingDetailComments] = useState(false);

  // 主题
  const isDark = c.surface === '#2D2D2D';
  const blurTint = isDark ? 'dark' : 'light';

  // 打开帖子详情
  const handlePostPress = async (post: any) => {
    console.log('[Profile] handlePostPress post._id:', post._id);
    setDetailPost(post);
    setShowPostDetail(true);
    setLoadingDetailComments(true);
    try {
      const comments = await getComments(post._id);
      console.log('[Profile] getComments 返回:', comments.length, '条');
      setDetailComments(comments);
    } catch (err) {
      console.error('获取评论失败:', err);
    } finally {
      setLoadingDetailComments(false);
    }
  };

  const handleClosePostDetail = () => {
    setShowPostDetail(false);
    setDetailPost(null);
    setDetailComments([]);
  };

  // 格式化时间
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
  };

  const toggleSelectFavorite = (post: any, index: number) => {
    const key = String(post._id || post.id || `fav_${index}`);
    setSelectedFavorites(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allKeys = favoritePosts.map((p, i) => String(p._id || p.id || `fav_${i}`));
    if (selectedFavorites.size === allKeys.length) {
      setSelectedFavorites(new Set());
    } else {
      setSelectedFavorites(new Set(allKeys));
    }
  };

  const handleBatchUncollect = async () => {
    if (!userId || selectedFavorites.size === 0) return;
    const ids = Array.from(selectedFavorites);
    setLoadingFavorites(true);
    try {
      await batchUncollect(ids, userId);
      setFavoritePosts(prev => prev.filter((p, i) => {
        const key = String(p._id || p.id || `fav_${i}`);
        return !selectedFavorites.has(key);
      }));
      setSelectedFavorites(new Set());
      setEditMode(false);
    } catch (err) { console.error('批量取消收藏失败:', err); }
    finally { setLoadingFavorites(false); }
  };

  const handleCloseFavorites = () => {
    setShowFavorites(false);
    setSelectedFavorites(new Set());
    setEditMode(false);
  };

  const handleMenuPress = (itemId: string) => {
    if (itemId === 'emotion') { openEmotionMemory(); }
    else if (itemId === 'favorites') { openFavorites(); }
  };

  const openEmotionMemory = async () => {
    setShowEmotionMemory(true);
    setLoadingLogs(true);
    try {
      const uid = userId || 'guest';
      const logs = await getEmotionLogs(uid, 30);
      setEmotionLogs(logs);
    } catch (err) {
      console.error('获取情绪日志失败:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const openFavorites = async () => {
    if (!userId) return;
    setShowFavorites(true);
    setLoadingFavorites(true);
    try {
      console.log('[Profile] openFavorites userId:', userId);
      const posts = await getFavoritePosts(userId);
      console.log('[Profile] openFavorites 返回:', posts.length, '条');
      setFavoritePosts(posts);
    } catch (err) {
      console.error('获取收藏失败:', err);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleUncollect = async (post: any) => {
    if (!userId || !post._id) return;
    try {
      await toggleCollect(post._id, userId);
      setFavoritePosts(prev => prev.filter(p => p._id !== post._id));
    } catch (err) {
      console.error('取消收藏失败:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>我的</Text>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity style={[styles.userCard, { backgroundColor: c.surface }]} onPress={onUserCardPress} activeOpacity={0.7}>
          <View style={styles.avatar}><Text style={styles.avatarText}>🌱</Text></View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: c.text }]}>{displayName}</Text>
            <Text style={[styles.userDesc, { color: c.textSecondary }]}>{displayDesc}</Text>
          </View>
          <Text style={[styles.arrow, { color: c.textSecondary }]}>›</Text>
        </TouchableOpacity>

        <View style={[styles.statsRow, { backgroundColor: c.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: c.text }]}>{stats.confessionCount || 0}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>倾诉次数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: c.text }]}>{stats.treeholeCount || 0}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>树洞</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: c.text }]}>{stats.continuousDays || 0}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>连续天数</Text>
          </View>
        </View>

        <View style={[styles.menuSection, { backgroundColor: c.surface }]}>
          {menuItems.map(item => (
            <TouchableOpacity key={item.id} style={[styles.menuItem, { borderBottomColor: c.border }]} onPress={() => handleMenuPress(item.id)}>
              <Text style={[styles.menuIcon, item.id === 'favorites' && { color: '#FFD700' }]}>{item.icon}</Text>
              <Text style={[styles.menuName, { color: c.text }]}>{item.name}</Text>
              <Text style={[styles.menuArrow, { color: c.textSecondary }]}>{item.arrow}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 收藏弹窗 */}
      <Modal visible={showFavorites} transparent animationType="fade" onRequestClose={handleCloseFavorites}>
        <View style={styles.favOverlay}>
          <View style={[styles.favCard, { backgroundColor: c.surface }]}>
            <View style={[styles.favHeader, { borderBottomColor: c.border }]}>
              {editMode ? (
                <>
                  <TouchableOpacity onPress={toggleSelectAll}>
                    <Text style={{ color: c.primary, fontSize: 15 }}>{selectedFavorites.size === favoritePosts.length ? '取消全选' : '全选'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.favTitle, { color: c.text }]}>{selectedFavorites.size}/{favoritePosts.length} 已选</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={handleBatchUncollect} disabled={selectedFavorites.size === 0}>
                      <Text style={{ color: selectedFavorites.size > 0 ? '#FF4757' : '#CCC', fontSize: 15 }}>取消收藏{selectedFavorites.size > 0 ? `(${selectedFavorites.size})` : ''}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditMode(false); setSelectedFavorites(new Set()); }}>
                      <Text style={{ color: c.textSecondary, fontSize: 15 }}>关闭</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.favTitle, { color: c.text }]}>★ 我的收藏</Text>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    {favoritePosts.length > 0 && (
                      <TouchableOpacity onPress={() => setEditMode(true)}>
                        <Text style={{ color: c.primary, fontSize: 15 }}>批量</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleCloseFavorites}><Text style={[styles.favClose, { color: c.textSecondary }]}>关闭</Text></TouchableOpacity>
                  </View>
                </>
              )}
            </View>
            <ScrollView style={styles.favList}>
              {loadingFavorites ? (
                <ActivityIndicator size="small" color={c.textSecondary} style={{ marginTop: 40 }} />
              ) : favoritePosts.length === 0 ? (
                <View style={styles.favEmpty}><Text style={{ color: c.textSecondary }}>还没有收藏内容</Text></View>
              ) : (
                favoritePosts.map((post, i) => {
                  const key = String(post._id || post.id || `fav_${i}`);
                  const checked = selectedFavorites.has(key);
                  return (
                    <TouchableOpacity key={key} style={[styles.favItem, { borderBottomColor: c.border }]} onPress={() => !editMode && handlePostPress(post)} activeOpacity={0.7}>
                      {editMode ? (
                        <TouchableOpacity style={styles.favCheckbox} onPress={() => toggleSelectFavorite(post, i)}>
                          <Text style={{ fontSize: 18, color: checked ? c.primary : c.textSecondary }}>{checked ? '☑' : '☐'}</Text>
                        </TouchableOpacity>
                      ) : null}
                      <View style={styles.favItemContent}>
                        <Text style={[styles.favItemText, { color: c.text }]} numberOfLines={2}>{post.text}</Text>
                        <View style={styles.favItemMeta}>
                          <Text style={[styles.favItemAuthor, { color: c.textSecondary }]}>★ {post.authorName}</Text>
                          {!editMode && (
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleUncollect(post); }}>
                              <Text style={[styles.favItemUncollect, { color: '#FF4757' }]}>取消收藏</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 情绪记忆弹窗 */}
      <Modal visible={showEmotionMemory} transparent animationType="fade" onRequestClose={() => setShowEmotionMemory(false)}>
        <View style={styles.emotionOverlay}>
          <View style={[styles.emotionCard, { backgroundColor: c.surface }]}>
            <View style={[styles.emotionHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.emotionTitle, { color: c.text }]}>心绪历程 🌿</Text>
              <TouchableOpacity onPress={() => setShowEmotionMemory(false)}><Text style={{ color: c.textSecondary }}>关闭</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.emotionList}>
              {loadingLogs ? (
                <ActivityIndicator size="small" color={c.textSecondary} style={{ marginTop: 40 }} />
              ) : emotionLogs.length === 0 ? (
                <View style={styles.emotionEmpty}>
                  <Text style={{ color: c.textSecondary }}>还没有倾诉记录</Text>
                </View>
              ) : (
                emotionLogs.map((log, i) => (
                  <View key={log._id || i} style={[styles.emotionItem, { borderBottomColor: c.border }]}>
                    <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                      {new Date(log.timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                    <View style={[styles.emotionKeywords, { marginTop: 8 }]}>
                      {(log.keywords || []).map((kw: string, ki: number) => (
                        <View key={ki} style={[styles.emotionTag, { backgroundColor: c.background }]}>
                          <Text style={{ color: c.text, fontSize: 12 }}>{kw}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 帖子详情弹窗 - 虚化背景 */}
      <Modal visible={showPostDetail} transparent animationType="fade" onRequestClose={handleClosePostDetail}>
        <View style={styles.postDetailOverlay}>
          <TouchableOpacity style={RNSS.absoluteFill} activeOpacity={1} onPress={handleClosePostDetail}>
            <BlurView intensity={80} tint={blurTint} style={RNSS.absoluteFill} />
          </TouchableOpacity>
          <View style={styles.postDetailCardWrap}>
            <View style={[styles.commentCard, { backgroundColor: c.surface }]}>
              <View style={[styles.commentCardHeader, { borderBottomColor: c.border }]}>
                <View style={{ width: 40 }} />
                <Text style={[styles.commentCardTitle, { color: c.text }]}>帖子详情</Text>
                <TouchableOpacity onPress={handleClosePostDetail}>
                  <Text style={{ color: c.textSecondary }}>关闭</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.commentScroll} contentContainerStyle={{ paddingBottom: 16 }}>
                <View style={[styles.commentPostHeader, { padding: 16 }]}>
                  <View style={styles.avatarWrap}><Text style={styles.avatarText}>🌱</Text></View>
                  <View style={styles.authorInfo}>
                    <Text style={[styles.authorName, { color: c.text }]}>{detailPost?.authorName || '匿名用户'}</Text>
                    <Text style={[styles.postMeta, { color: c.textSecondary }]}>{formatTime(detailPost?.createTime)}</Text>
                  </View>
                </View>
                <Text style={[styles.commentPostText, { color: c.text, paddingHorizontal: 16 }]}>{detailPost?.text || ''}</Text>
                <View style={[styles.commentDivider, { borderTopColor: c.border, marginTop: 16 }]}>
                  <Text style={[styles.commentDividerText, { color: c.textSecondary }]}>全部评论 ({detailComments.length})</Text>
                </View>
                {loadingDetailComments ? (
                  <ActivityIndicator size="small" color={c.textSecondary} style={{ marginTop: 20 }} />
                ) : detailComments.length === 0 ? (
                  <View style={styles.commentEmpty}><Text style={{ color: c.textSecondary }}>暂无评论</Text></View>
                ) : (
                  detailComments.map((item: any, idx: number) => (
                    <View key={item._id || idx} style={[styles.commentItem, { borderBottomColor: c.border }]}>
                      <View style={styles.commentAvatar}><Text style={{ fontSize: 13 }}>🌱</Text></View>
                      <View style={styles.commentContent}>
                        <Text style={[styles.commentAuthorName, { color: c.text }]}>{item.authorName}</Text>
                        <Text style={[styles.commentText, { color: c.textSecondary }]}>{item.text}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 44, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  userCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 20, padding: 16, borderRadius: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28 },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 17, fontWeight: '600' },
  userDesc: { fontSize: 13, marginTop: 4 },
  arrow: { fontSize: 20 },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, paddingVertical: 20, borderRadius: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 12, marginTop: 4 },
  menuSection: { marginHorizontal: 20, marginTop: 20, borderRadius: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuName: { flex: 1, fontSize: 15 },
  menuArrow: { fontSize: 18 },
  // 收藏弹窗
  favOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  favCard: { borderRadius: 20, padding: 0, marginHorizontal: 16, width: '90%', maxHeight: '70%', overflow: 'hidden' },
  favHeader: { padding: 20, borderBottomWidth: 0.5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  favTitle: { fontSize: 18, fontWeight: '600' },
  favClose: { fontSize: 15 },
  favList: { maxHeight: 400 },
  favEmpty: { alignItems: 'center', paddingVertical: 40 },
  favItem: { padding: 16, borderBottomWidth: 0.5, flexDirection: 'row', alignItems: 'center' },
  favItemText: { fontSize: 14, lineHeight: 20 },
  favItemMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  favItemAuthor: { fontSize: 12 },
  favItemUncollect: { fontSize: 12 },
  favCheckbox: { marginRight: 10 },
  favItemContent: { flex: 1 },
  // 情绪记忆弹窗
  emotionOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  emotionCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 0, marginHorizontal: 16, width: '90%', maxHeight: '70%', overflow: 'hidden' },
  emotionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  emotionTitle: { fontSize: 18, fontWeight: '600' },
  emotionList: { maxHeight: 400 },
  emotionEmpty: { alignItems: 'center', paddingVertical: 40 },
  emotionItem: { padding: 16, borderBottomWidth: 0.5 },
  emotionKeywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emotionTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  // 帖子详情弹窗
  postDetailOverlay: { flex: 1 },
  postDetailCardWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  commentCard: { borderRadius: 20, padding: 0, marginHorizontal: 16, width: '90%', maxHeight: '80%', overflow: 'hidden' },
  commentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  commentCardTitle: { fontSize: 17, fontWeight: '600' },
  commentScroll: { maxHeight: 500 },
  commentPostHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20 },
  authorInfo: { marginLeft: 10, flex: 1 },
  authorName: { fontSize: 15, fontWeight: '600' },
  postMeta: { fontSize: 12, marginTop: 2 },
  commentPostText: { fontSize: 16, lineHeight: 24, paddingVertical: 12 },
  commentDivider: { borderTopWidth: 0.5, paddingVertical: 12, paddingHorizontal: 16 },
  commentDividerText: { fontSize: 13 },
  commentEmpty: { alignItems: 'center', paddingVertical: 30 },
  commentItem: { flexDirection: 'row', padding: 16, paddingTop: 12, borderBottomWidth: 0.5 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  commentContent: { flex: 1 },
  commentAuthorName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  commentText: { fontSize: 14, lineHeight: 20 },
});