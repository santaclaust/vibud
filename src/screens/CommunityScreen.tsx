import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';

const communityPosts = [
  { id: 1, category: '内观', text: '今天突然意识到，我一直在替别人的人生负责...', likes: 12, comments: 3 },
  { id: 2, category: '感悟', text: '对自己说了一声辛苦了，十年了第一次', likes: 28, comments: 5 },
  { id: 3, category: '陪伴', text: '谢谢陌生人的陪伴，让我熬过那个晚上', likes: 45, comments: 8 },
  { id: 4, category: '远眺', text: '十年后回头看，这些都是小事', likes: 19, comments: 2 },
  { id: 5, category: '隐喻', text: '我们都是星星，会发光也会暗淡', likes: 33, comments: 6 },
];

export default function CommunityScreen({ navigation, colors }: any) {
  const c = colors || { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#999999', border: '#F0F0F0', primary: '#4A90E2' };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>社群</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.categoryRow}>
          <TouchableOpacity style={[styles.categoryTag, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.categoryTagText, { color: c.textSecondary }]}>全部</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.categoryTag, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.categoryTagText, { color: c.textSecondary }]}>内观</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.categoryTag, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.categoryTagText, { color: c.textSecondary }]}>感悟</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.categoryTag, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.categoryTagText, { color: c.textSecondary }]}>陪伴</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.categoryTag, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.categoryTagText, { color: c.textSecondary }]}>远眺</Text>
          </TouchableOpacity>
        </View>

        {communityPosts.map((post) => (
          <TouchableOpacity key={post.id} style={[styles.postCard, { backgroundColor: c.surface }]}>
            <View style={styles.postHeader}>
              <Text style={[styles.postCategory, { color: c.primary }]}>{post.category}</Text>
            </View>
            <Text style={[styles.postText, { color: c.text }]}>{post.text}</Text>
            <View style={styles.postFooter}>
              <Text style={[styles.postStats, { color: c.textSecondary }]}>❤️ {post.likes}</Text>
              <Text style={[styles.postStats, { color: c.textSecondary }]}>💬 {post.comments}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 44, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  categoryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  categoryTag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  categoryTagText: { fontSize: 13 },
  postCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12 },
  postHeader: { marginBottom: 8 },
  postCategory: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  postText: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  postFooter: { flexDirection: 'row', gap: 16 },
  postStats: { fontSize: 13 },
});
