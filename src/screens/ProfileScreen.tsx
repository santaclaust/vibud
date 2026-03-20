import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';

const menuItems = [
  { id: 'records', icon: '📝', name: '我的记录', arrow: '›' },
  { id: 'favorites', icon: '❤️', name: '收藏', arrow: '›' },
  { id: 'settings', icon: '⚙️', name: '设置', arrow: '›' },
  { id: 'help', icon: '❓', name: '帮助与反馈', arrow: '›' },
  { id: 'about', icon: 'ℹ️', name: '关于心芽', arrow: '›' },
];

export default function ProfileScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>我的</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* 用户信息卡片 */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🌱</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>新用户</Text>
            <Text style={styles.userDesc}>点击登录</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>

        {/* 统计 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>倾诉次数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>收藏</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>连续天数</Text>
          </View>
        </View>

        {/* 菜单列表 */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuName}>{item.name}</Text>
              <Text style={styles.menuArrow}>{item.arrow}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  userDesc: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  arrow: {
    fontSize: 20,
    color: '#CCC',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 20,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuName: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  menuArrow: {
    fontSize: 18,
    color: '#CCC',
  },
});
