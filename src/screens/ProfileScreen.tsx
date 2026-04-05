import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet as RNSS, Alert, FlatList, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { getEmotionLogs, getCommunityPosts, toggleCollect, getFavoritePosts, batchUncollect, getComments, getPendingReports, processReport, isSuperAdmin, deletePostByAdmin, hardDeletePost, getPostById } from '../services/CloudBaseService';
import { analyticsService, getMonitoringDashboard } from '../services/AnalyticsService';

interface ProfileScreenProps {
  navigation: any;
  colors: any;
  userId?: string | null;
  userInfo?: any;
  onUserCardPress?: () => void;
  onLogout?: () => void;
  onCustomLogin?: (username: string) => void;
}

const menuItems = [
  { id: 'emotion', icon: '🌿', name: '心绪历程', arrow: '›' },
  { id: 'records', icon: '📝', name: '我的记录', arrow: '›' },
  { id: 'favorites', icon: '★', name: '收藏', arrow: '›' },
  { id: 'switchUser', icon: '🔄', name: '切换用户(测试)', arrow: '›' },
  { id: 'temperament', icon: '🌱', name: '领取种子', arrow: '›' },
  { id: 'reports', icon: '🚩', name: '举报管理', arrow: '›', adminOnly: true },
  { id: 'adminStats', icon: '📊', name: 'AI效能监控', arrow: '›', adminOnly: true },
  { id: 'settings', icon: '⚙️', name: '设置', arrow: '›' },
  { id: 'help', icon: '❓', name: '帮助与反馈', arrow: '›' },
  { id: 'about', icon: 'ℹ️', name: '关于心芽', arrow: '›' },
];

export default function ProfileScreen({ navigation, colors: c, userId, userInfo, onUserCardPress, onLogout, onCustomLogin }: ProfileScreenProps) {
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

  // 🆕 切换用户弹窗
  const [showSwitchUser, setShowSwitchUser] = useState(false);
  const [switchUsername, setSwitchUsername] = useState('');

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
    else if (itemId === 'reports') { openReports(); }
    else if (itemId === 'switchUser') { setShowSwitchUser(true); }
    else if (itemId === 'temperament') { 
      // 通过 navigation.navigate 切换到测试页面
      const nav = navigation?.navigate;
      if (nav) {
        nav('TemperamentTest');
      } else {
        // 如果没有 navigation，通过全局事件或直接修改
        console.log('跳转气质测试');
      }
    }
    else if (itemId === 'adminStats') { loadAnalytics(); }
  };

  // 加载AI效能数据
  const loadAnalytics = async () => {
    setShowAdminStats(true);
    setLoadingAnalytics(true);
    try {
      const uid = userId || 'guest';
      const data = await getMonitoringDashboard(uid);
      setAnalyticsData(data);
    } catch (err) {
      console.error('加载AI效能数据失败:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // AI效能监控弹窗状态
  const [showAdminStats, setShowAdminStats] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const handleSwitchUser = () => {
    if (!switchUsername.trim()) {
      Alert.alert('请输入用户名');
      return;
    }
    onCustomLogin?.(switchUsername.trim());
    setShowSwitchUser(false);
    setSwitchUsername('');
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

  // 🆕 举报管理
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [reportPosts, setReportPosts] = useState<Record<string, any>>({});
  const [loadingReports, setLoadingReports] = useState(false);

  const openReports = async () => {
    if (!isSuperAdmin(userId || '')) {
      Alert.alert('权限不足', '只有超级管理员可以访问');
      return;
    }
    setShowReports(true);
    setLoadingReports(true);
    try {
      const data = await getPendingReports();
      setReports(data);
      
      // 🆕 获取每个举报对应的帖子内容
      const postMap: Record<string, any> = {};
      await Promise.all(
        data.map(async (report: any) => {
          if (report.type === 'post' && report.targetId) {
            const post = await getPostById(report.targetId);
            if (post) {
              postMap[report._id] = post;
            }
          }
        })
      );
      setReportPosts(postMap);
    } catch (err) {
      console.error('获取举报列表失败:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleProcessReport = async (report: any, action: 'approve' | 'reject') => {
    try {
      const result = await processReport(report._id, userId || '', action);
      if (result.success) {
        Alert.alert('处理成功', action === 'approve' ? '已删除内容' : '已驳回举报');
        // 刷新列表
        const data = await getPendingReports();
        setReports(data);
      } else {
        Alert.alert('处理失败', result.message);
      }
    } catch (err) {
      Alert.alert('操作失败');
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert('确认删除', '确定要彻底删除这条帖子吗？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '彻底删除',
        style: 'destructive',
        onPress: async () => {
          const result = await hardDeletePost(postId, userId || '');
          if (result.success) {
            Alert.alert('删除成功');
            // 刷新列表
            const data = await getPendingReports();
            setReports(data);
          } else {
            Alert.alert('删除失败', result.message);
          }
        },
      },
    ]);
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
          {menuItems.filter(item => !item.adminOnly || isSuperAdmin(userId || '')).map(item => (
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

      {/* 🆕 举报管理弹窗 */}
      <Modal visible={showReports} animationType="slide" onRequestClose={() => setShowReports(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
          <View style={[styles.header, { backgroundColor: c.surface }]}>
            <TouchableOpacity onPress={() => setShowReports(false)}>
              <Text style={{ color: c.primary, fontSize: 16 }}>‹ 返回</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: c.text }]}>🚩 举报管理</Text>
            <View style={{ width: 50 }} />
          </View>
          {loadingReports ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={c.primary} />
            </View>
          ) : reports.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: c.textSecondary, fontSize: 16 }}>暂无待处理的举报</Text>
            </View>
          ) : (
            <FlatList
              data={reports}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const postContent = reportPosts[item._id];
                return (
                  <View style={[styles.postCard, { backgroundColor: c.surface, marginBottom: 12, padding: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                        {item.type === 'post' ? '帖子举报' : '评论举报'} | {new Date(item.createTime).toLocaleString('zh-CN')}
                      </Text>
                      <Text style={{ color: '#FF6B6B', fontSize: 13 }}>{item.reason}</Text>
                    </View>
                    {postContent ? (
                      <View style={{ backgroundColor: c.background, padding: 10, borderRadius: 8, marginBottom: 8 }}>
                        <Text style={{ color: c.text, fontSize: 14 }} numberOfLines={4}>{postContent.text}</Text>
                        <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 6 }}>作者: {postContent.authorName} | 分类: {postContent.category}</Text>
                      </View>
                    ) : (
                      <Text style={{ color: c.textSecondary, fontSize: 14, marginBottom: 8 }}>举报内容: {item.detail || '(无详情)'}</Text>
                    )}
                    <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 12 }}>举报人ID: {item.reporterId} | 目标ID: {item.targetId}</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity style={{ flex: 1, backgroundColor: '#FF4444', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }} onPress={() => handleProcessReport(item, 'approve')}>
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>批准(删除)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flex: 1, backgroundColor: c.background, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: c.border }} onPress={() => handleProcessReport(item, 'reject')}>
                        <Text style={{ color: c.text }}>驳回</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* 🆕 切换用户弹窗 */}
      <Modal visible={showSwitchUser} transparent animationType="fade" onRequestClose={() => setShowSwitchUser(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity activeOpacity={1} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setShowSwitchUser(false)} />
          <View style={[styles.favCard, { backgroundColor: c.surface, padding: 20, width: '85%' }]}>
            <Text style={[styles.favTitle, { color: c.text, marginBottom: 16, textAlign: 'center' }]}>🔄 切换用户 (测试)</Text>
            <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 16 }}>
              输入用户名即可切换身份，用于测试不同用户行为
            </Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: c.background, color: c.text, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 }]}
              placeholder="输入用户名..."
              placeholderTextColor={c.textSecondary}
              value={switchUsername}
              onChangeText={setSwitchUsername}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20, backgroundColor: c.background, borderWidth: 1, borderColor: c.border }}
                onPress={() => setShowSwitchUser(false)}
              >
                <Text style={{ color: c.text, fontSize: 15 }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20, backgroundColor: c.primary }}
                onPress={handleSwitchUser}
              >
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>切换</Text>
              </TouchableOpacity>
            </View>
            {/* 快捷测试按钮 */}
            <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 24, textAlign: 'center' }}>快速测试:</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.background, borderRadius: 16, borderWidth: 1, borderColor: c.border }} onPress={() => { onCustomLogin?.('santaclaust'); setShowSwitchUser(false); }}>
                <Text style={{ color: c.text, fontSize: 13 }}>🔧 超级管理员</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.background, borderRadius: 16, borderWidth: 1, borderColor: c.border }} onPress={() => { onCustomLogin?.('testuser'); setShowSwitchUser(false); }}>
                <Text style={{ color: c.text, fontSize: 13 }}>👤 普通用户</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI效能监控弹窗 */}
      <Modal visible={showAdminStats} animationType="slide" onRequestClose={() => setShowAdminStats(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <TouchableOpacity onPress={() => setShowAdminStats(false)}>
              <Text style={{ color: c.primary, fontSize: 16 }}>‹ 返回</Text>
            </TouchableOpacity>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>AI效能监控</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {loadingAnalytics ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={{ color: c.textSecondary, marginTop: 12 }}>加载中...</Text>
              </View>
            ) : analyticsData ? (
              <>
                {/* AI回复质量 */}
                <View style={{ backgroundColor: c.surface, padding: 16, marginBottom: 16, borderRadius: 12 }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>📊 AI回复质量</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#4CAF50', fontSize: 28, fontWeight: 'bold' }}>{analyticsData.avgRating.toFixed(1)}</Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12 }}>综合评分</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#2196F3', fontSize: 28, fontWeight: 'bold' }}>{analyticsData.aiPositiveRate}%</Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12 }}>好评率</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#FF9800', fontSize: 28, fontWeight: 'bold' }}>{analyticsData.totalFeedbacks}</Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12 }}>反馈总数</Text>
                    </View>
                  </View>
                </View>

                {/* 画像填充率 */}
                <View style={{ backgroundColor: c.surface, padding: 16, marginBottom: 16, borderRadius: 12 }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>👤 画像填充率</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
                    <View style={{ flex: 1, height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ width: `${analyticsData.profileCompletion}%`, height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 }} />
                    </View>
                    <Text style={{ color: c.text, fontSize: 18, fontWeight: '600', marginLeft: 12 }}>{analyticsData.profileCompletion}%</Text>
                  </View>
                </View>

                {/* 对话统计 */}
                <View style={{ backgroundColor: c.surface, padding: 16, marginBottom: 16, borderRadius: 12 }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>💬 对话统计</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#9C27B0', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.totalRounds}</Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12 }}>对话轮次</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#00BCD4', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.trends.profileTrend.length}</Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12 }}>画像记录</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#FF5722', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.trends.qualityTrend.length}</Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12 }}>质量批次</Text>
                    </View>
                  </View>
                </View>

                {/* 🆕 社区运营数据 */}
                {analyticsData.community && (
                  <>
                    {/* 帖子统计 */}
                    <View style={{ backgroundColor: c.surface, padding: 16, marginBottom: 16, borderRadius: 12 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>📝 帖子情况</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#2196F3', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.posts.total}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>总帖子</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#4CAF50', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.posts.today}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>今日新增</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#FF9800', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.posts.hot}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>热门帖子</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#9C27B0', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.posts.recommend}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>推荐帖子</Text>
                        </View>
                      </View>
                    </View>

                    {/* 互动统计 */}
                    <View style={{ backgroundColor: c.surface, padding: 16, marginBottom: 16, borderRadius: 12 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>❤️ 点赞/收藏/评论</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#E91E63', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.interactions.totalWarmths}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>暖心总数</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#FF9800', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.interactions.totalCollects}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>收藏总数</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#2196F3', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.interactions.totalComments}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>评论总数</Text>
                        </View>
                      </View>
                    </View>

                    {/* 举报统计 */}
                    <View style={{ backgroundColor: c.surface, padding: 16, marginBottom: 16, borderRadius: 12 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>🚩 举报情况</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#FF5722', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.reports.pending}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>待处理</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#4CAF50', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.reports.processed}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>已处理</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#9E9E9E', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.reports.rejected}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>已驳回</Text>
                        </View>
                      </View>
                    </View>

                    {/* 树洞统计 */}
                    <View style={{ backgroundColor: c.surface, padding: 16, borderRadius: 12 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>🌲 树洞情况</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#795548', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.treehole.total}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>总数量</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#4CAF50', fontSize: 24, fontWeight: 'bold' }}>{analyticsData.community.treehole.today}</Text>
                          <Text style={{ color: c.textSecondary, fontSize: 12 }}>今日新增</Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </>
            ) : (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Text style={{ color: c.textSecondary }}>暂无数据</Text>
                <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 8 }}>开始对话后将自动收集数据</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
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
