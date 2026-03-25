import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { getUserMessages, markMessageRead } from '../services/CloudBaseService';

export default function MessageScreen({ navigation, colors, userId }: any) {
  const c = colors || { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#999999', border: '#F0F0F0' };
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const uid = userId || 'guest';
      const msgs = await getUserMessages(uid);
      setMessages(msgs);
    } catch (err) {
      console.error('获取消息失败:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMessages();
    // 每30秒自动刷新
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  const handleMessagePress = async (msg: any) => {
    if (!msg.read) {
      try {
        await markMessageRead(msg._id);
        setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, read: true } : m));
      } catch (err) {
        console.error('标记已读失败:', err);
      }
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'daily_quote': return '🌅';
      case 'reminder': return '⏰';
      case 'system': return '🔔';
      case 'achievement': return '🏆';
      default: return '💬';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.messageItem, { backgroundColor: c.surface, borderBottomColor: c.border }]}
      onPress={() => handleMessagePress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, !item.read && { backgroundColor: '#E8F0FE' }]}>
        <Text style={styles.iconText}>{getMessageIcon(item.type)}</Text>
      </View>
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.messageTitle, { color: c.text }, !item.read && styles.titleUnread]}>{item.title || '新消息'}</Text>
          <Text style={[styles.messageTime, { color: c.textSecondary }]}>{formatTime(item.timestamp)}</Text>
        </View>
        <Text style={[styles.messageText, { color: c.textSecondary }]} numberOfLines={2}>
          {item.content}
        </Text>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>消息</Text>
        {messages.filter(m => !m.read).length > 0 && (
          <Text style={[styles.badge, { color: c.textSecondary }]}>
            {messages.filter(m => !m.read).length}条未读
          </Text>
        )}
      </View>
      
      {messages.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={[styles.emptyText, { color: c.text }]}>暂无新消息</Text>
          <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>每日签语和系统通知会在这里显示</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item._id || item.id || String(item.timestamp)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.textSecondary} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 44, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row' },
  title: { fontSize: 18, fontWeight: '600' },
  badge: { position: 'absolute', right: 16, fontSize: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 14 },
  messageItem: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  iconText: { fontSize: 22 },
  messageContent: { flex: 1, marginLeft: 12 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  messageTitle: { fontSize: 15, fontWeight: '500' },
  titleUnread: { fontWeight: '600' },
  messageTime: { fontSize: 12 },
  messageText: { fontSize: 14, lineHeight: 20 },
  unreadDot: { position: 'absolute', right: 0, top: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A90E2' },
});
