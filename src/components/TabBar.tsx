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

interface TabBarProps {
  navigation: any;
  currentRoute: string;
  onCenterPress: () => void;
}

interface TabBarProps {
  navigation: any;
  currentRoute: string;
  onCenterPress: () => void;
  colors?: any;
}

export default function TabBar({ navigation, currentRoute, onCenterPress, colors }: TabBarProps) {
  // 默认主题色
  const defaultColors = {
    surface: '#FFFFFF',
    border: '#F0F0F0',
    textSecondary: '#999999',
    primary: '#4A90E2',
  };
  const themeColors = colors || defaultColors;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
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
            <Text style={[styles.tabIcon, isActive && styles.tabIconActive, { color: isActive ? themeColors.primary : themeColors.textSecondary }]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, { color: isActive ? themeColors.primary : themeColors.textSecondary }]}>
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
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    height: 47,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabIconActive: {
  },
  tabLabel: {
    fontSize: 11,
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
