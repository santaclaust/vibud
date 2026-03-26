import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { getEmotionLogs, getCommunityPosts, toggleCollect, getFavoritePosts, batchUncollect } from '../services/CloudBaseService';

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

export default function ProfileScreen({ navigation, colors, userId, userInfo, onUserCardPress }: ProfileScreenProps) {
  const c = colors || { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#999999', border: '#F0F0F0' };

  const displayName = userInfo?.nickname || (userId ? `用户${userId.slice(0, 6)}` : '新用户');
  const displayDesc = userId ? (userInfo?.phone || '已登录') : '点击登录';
  const stats = userInfo?.stats || { confessionCount: 0, treeholeCount: 0, continuousDays: 0 };

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
      // 过滤时用相同 key 逻辑
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
    if (!userId) return;
    const docId = post._id || post.id;
    if (!docId) return;
    try {
      await toggleCollect(docId, userId);
      setFavoritePosts(prev => prev.filter(p => (p._id || p.id) !== docId));
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
                      <Text style={{ color: selectedFavorites.size > 0 ? '#FF4757' : '#CCC', fontSize: 15 }}>取消{selectedFavorites.size > 0 ? `(${selectedFavorites.size})` : ''}</Text>
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
                        <Text style={{ color: c.primary, fontSize: 15 }}>编辑</Text>
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
                    <View key={key} style={[styles.favItem, { borderBottomColor: c.border }]}>
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
                            <TouchableOpacity onPress={() => { if (userId) toggleCollect(post._id, userId); setFavoritePosts(prev => prev.filter(p => p._id !== post._id)); }}>
                              <Text style={[styles.favItemUncollect, { color: '#FF4757' }]}>取消收藏</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
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
            <View style={styles.emotionHeader}>
              <Text style={[styles.emotionTitle, { color: c.text }]}>心绪历程 🌿</Text>
              <TouchableOpacity onPress={() => setShowEmotionMemory(false)}><Text style={[styles.emotionClose, { color: c.textSecondary }]}>关闭</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.emotionList}>
              {loadingLogs ? (
                <ActivityIndicator size="small" color={c.textSecondary} style={{ marginTop: 40 }} />
              ) : emotionLogs.length === 0 ? (
                <View style={styles.emotionEmpty}>
                  <Text style={[styles.emotionEmptyText, { color: c.textSecondary }]}>还没有倾诉记录</Text>
                  <Text style={[styles.emotionEmptySub, { color: c.textSecondary }]}>完成倾诉后，这里会出现你的心绪轨迹</Text>
                </View>
              ) : (
                emotionLogs.map((log, i) => (
                  <View key={log._id || i} style={[styles.emotionItem, { borderBottomColor: c.border }]}>
                    <Text style={[styles.emotionDate, { color: c.textSecondary }]}>
                      {new Date(log.timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                    <View style={styles.emotionKeywords}>
                      {(log.keywords || []).map((kw: string, ki: number) => (
                        <View key={ki} style={[styles.emotionTag, { backgroundColor: c.background }]}>
                          <Text style={[styles.emotionTagText, { color: c.text }]}>{kw}</Text>
                        </View>
                      ))}
                    </View>
                    {log.textExcerpt && (
                      <Text style={[styles.emotionExcerpt, { color: c.textSecondary }]} numberOfLines={1}>{log.textExcerpt}</Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
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
  favItem: { padding: 16, borderBottomWidth: 0.5 },
  favItemText: { fontSize: 14, lineHeight: 20 },
  favItemMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  favItemAuthor: { fontSize: 12 },
  favItemUncollect: { fontSize: 12 },
  favCheckbox: { marginRight: 10 },
  favItemContent: { flex: 1 },
  // 情绪记忆弹窗
  emotionOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  emotionCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, marginHorizontal: 16, width: '90%', maxHeight: '70%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  emotionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  emotionTitle: { fontSize: 18, fontWeight: '600' },
  emotionClose: { fontSize: 15 },
  emotionList: { maxHeight: 400 },
  emotionEmpty: { alignItems: 'center', paddingVertical: 40 },
  emotionEmptyText: { fontSize: 15 },
  emotionEmptySub: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  emotionItem: { paddingVertical: 14, borderBottomWidth: 1 },
  emotionDate: { fontSize: 13, marginBottom: 8 },
  emotionKeywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  emotionTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  emotionTagText: { fontSize: 13, fontWeight: '500' },
  emotionExcerpt: { fontSize: 13, marginTop: 4 },
});
