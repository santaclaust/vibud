import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function MessageScreen({ navigation, colors }: any) {
  const c = colors || { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#999999', border: '#F0F0F0' };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>消息</Text>
      </View>
      
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={[styles.emptyText, { color: c.text }]}>暂无新消息</Text>
        <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>倾诉后你会收到回复通知</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 14 },
});
