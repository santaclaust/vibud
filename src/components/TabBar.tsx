import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface TabItem {
  name: string;
  icon: string;
  label: string;
  isCenter?: boolean;
}

const tabs: TabItem[] = [
  { name: 'Home', icon: '🏠', label: '首页' },
  { name: 'Community', icon: '🌲', label: '社群' },
  { name: 'Confession', icon: '💬', label: '倾诉', isCenter: true },
  { name: 'Message', icon: '💌', label: '消息' },
  { name: 'Profile', icon: '👤', label: '我的' },
];

export default function TabBar({ navigation, currentRoute, onCenterPress, showMenu }: any) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentRoute === tab.name;
        const isCenter = tab.isCenter;

        if (isCenter) {
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.centerButton}
              onPress={onCenterPress}
            >
              <View style={styles.centerButtonInner}>
                <Text style={styles.centerIcon}>{tab.icon}</Text>
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 55,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabIconActive: {
    // 可以添加激活态样式
  },
  tabLabel: {
    fontSize: 11,
    color: '#999',
  },
  tabLabelActive: {
    color: '#4A90E2',
  },
  centerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonInner: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  centerIcon: {
    fontSize: 20,
  },
});
