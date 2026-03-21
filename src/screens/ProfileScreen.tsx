import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';

const menuItems = [
  { id: 'records', icon: '📝', name: '我的记录', arrow: '›' },
  { id: 'favorites', icon: '❤️', name: '收藏', arrow: '›' },
  { id: 'settings', icon: '⚙️', name: '设置', arrow: '›' },
  { id: 'help', icon: '❓', name: '帮助与反馈', arrow: '›' },
  { id: 'about', icon: 'ℹ️', name: '关于心芽', arrow: '›' },
];

export default function ProfileScreen({ navigation, colors }: any) {
  const c = colors || { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#999999', border: '#F0F0F0' };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>我的</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={[styles.userCard, { backgroundColor: c.surface }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🌱</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: c.text }]}>新用户</Text>
            <Text style={[styles.userDesc, { color: c.textSecondary }]}>点击登录</Text>
          </View>
          <Text style={[styles.arrow, { color: c.textSecondary }]}>›</Text>
        </View>

        <View style={[styles.statsRow, { backgroundColor: c.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: c.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>倾诉次数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: c.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>收藏</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: c.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>连续天数</Text>
          </View>
        </View>

        <View style={[styles.menuSection, { backgroundColor: c.surface }]}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.menuItem, { borderBottomColor: c.border }]}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuName, { color: c.text }]}>{item.name}</Text>
              <Text style={[styles.menuArrow, { color: c.textSecondary }]}>{item.arrow}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
});
