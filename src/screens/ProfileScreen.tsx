import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { getEmotionLogs } from '../services/CloudBaseService';

interface ProfileScreenProps {
  navigation: any;
  colors: any;
  userId?: string | null;
  userInfo?: any;
  onUserCardPress?: () => void;
}

const menuItems = [
  { id: 'emotion', icon: '🌿', name: '情绪记忆', arrow: '›' },
  { id: 'records', icon: '📝', name: '我的记录', arrow: '›' },
  { id: 'favorites', icon: '❤️', name: '收藏', arrow: '›' },
  { id: 'settings', icon: '⚙️', name: '设置', arrow: '›' },
  { id: 'help', icon: '❓', name: '帮助与反馈', arrow: '›' },
  { id: 'about', icon: 'ℹ️', name: '关于心芽', arrow: '›' },
];

export default function ProfileScreen({ navigation, colors, userId, userInfo, onUserCardPress }: ProfileScreenProps) {
  const c = colors || { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#999999', border: '#F0F0F0' };
  
  // 用户名处理
  const displayName = userInfo?.nickname || (userId ? `用户${userId.slice(0, 6)}` : '新用户');
  const displayDesc = userId ? (userInfo?.phone || '已登录') : '点击登录';
  
  // 统计数据
  const stats = userInfo?.stats || { confessionCount: 0, treeholeCount: 0, continuousDays: 0 };

  // 情绪记忆弹窗
  const [showEmotionMemory, setShowEmotionMemory] = useState(false);
  const [emotionLogs, setEmotionLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleMenuPress = (itemId: string) => {
    if (itemId === 'emotion') {
      openEmotionMemory();
    }
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>我的</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* 用户卡片 - 可点击登录 */}
        <TouchableOpacity 
          style={[styles.userCard, { backgroundColor: c.surface }]} 
          onPress={onUserCardPress}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🌱</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: c.text }]}>{displayName}</Text>
            <Text style={[styles.userDesc, { color: c.textSecondary }]}>{displayDesc}</Text>
          </View>
          <Text style={[styles.arrow, { color: c.textSecondary }]}>›</Text>
        </TouchableOpacity>

        {/* 统计数据 */}
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

        {/* 菜单列表 */}
        <View style={[styles.menuSection, { backgroundColor: c.surface }]}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.menuItem, { borderBottomColor: c.border }]}
              onPress={() => handleMenuPress(item.id)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuName, { color: c.text }]}>{item.name}</Text>
              <Text style={[styles.menuArrow, { color: c.textSecondary }]}>{item.arrow}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 情绪记忆弹窗 */}
      <Modal visible={showEmotionMemory} transparent animationType="fade" onRequestClose={() => setShowEmotionMemory(false)}>
        <View style={styles.emotionOverlay}>
          <View style={[styles.emotionCard, { backgroundColor: c.surface }]}>
            <View style={styles.emotionHeader}>
              <Text style={[styles.emotionTitle, { color: c.text }]}>情绪记忆 🌿</Text>
              <TouchableOpacity onPress={() => setShowEmotionMemory(false)}>
                <Text style={[styles.emotionClose, { color: c.textSecondary }]}>关闭</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.emotionList}>
              {loadingLogs ? (
                <ActivityIndicator size="small" color={c.textSecondary} style={{ marginTop: 40 }} />
              ) : emotionLogs.length === 0 ? (
                <View style={styles.emotionEmpty}>
                  <Text style={[styles.emotionEmptyText, { color: c.textSecondary }]}>还没有倾诉记录</Text>
                  <Text style={[styles.emotionEmptySub, { color: c.textSecondary }]}>完成倾诉后，这里会出现你的情绪轨迹</Text>
                </View>
              ) : (
                emotionLogs.map((log, index) => (
                  <View key={log._id || index} style={[styles.emotionItem, { borderBottomColor: c.border }]}>
                    <Text style={[styles.emotionDate, { color: c.textSecondary }]}>
                      {new Date(log.timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                    <View style={styles.emotionKeywords}>
                      {log.keywords.map((kw: string, i: number) => (
                        <View key={i} style={[styles.emotionTag, { backgroundColor: c.background }]}>
                          <Text style={[styles.emotionTagText, { color: c.text }]}>{kw}</Text>
                        </View>
                      ))}
                    </View>
                    {log.textExcerpt && (
                      <Text style={[styles.emotionExcerpt, { color: c.textSecondary }]} numberOfLines={1}>
                        {log.textExcerpt}
                      </Text>
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
