import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, FlatList, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { storageService, TreeHolePost } from '../services/StorageService';

export default function TreeHoleScreen({ navigation }: any) {
  const [posts, setPosts] = useState<TreeHolePost[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 加载树洞数据
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const data = await storageService.getTreeHolePosts();
    setPosts(data);
  };

  // 发布到树洞
  const handlePost = async () => {
    if (!inputText.trim() || isPosting) return;

    setIsPosting(true);
    try {
      await storageService.postToTreeHole(inputText.trim());
      setInputText('');
      setShowSuccess(true);
      loadPosts();
      
      // 2秒后隐藏成功提示
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('发布失败:', error);
    } finally {
      setIsPosting(false);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 渲染单个帖子
  const renderPost = ({ item }: { item: TreeHolePost }) => (
    <View style={styles.postCard}>
      <Text style={styles.postText}>{item.text}</Text>
      <View style={styles.postFooter}>
        <Text style={styles.postTime}>{formatTime(item.timestamp)}</Text>
        <View style={styles.postActions}>
          <Text style={styles.likeIcon}>❤️</Text>
          <Text style={styles.likeCount}>{item.likes}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* 顶部导航 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹ 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🌲 树洞</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* 树洞说明 */}
        <View style={styles.intro}>
          <Text style={styles.introText}>
            这里是匿名的树洞，把想说的话说出来，然后放手。
          </Text>
        </View>

        {/* 帖子列表 */}
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🌲</Text>
              <Text style={styles.emptyTitle}>树洞是空的</Text>
              <Text style={styles.emptyDesc}>你是第一个开口的人</Text>
            </View>
          }
        />

        {/* 输入区域 */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="把想说的话告诉树洞..."
            placeholderTextColor="#999"
            multiline
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
          />
          <TouchableOpacity 
            style={[styles.postButton, (!inputText.trim() || isPosting) && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={!inputText.trim() || isPosting}
          >
            <Text style={styles.postButtonText}>
              {isPosting ? '发送中...' : '倾诉'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 成功提示 */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.successOverlay}>
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>🌲</Text>
              <Text style={styles.successText}>已经藏好了</Text>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E0',
  },
  backButton: {
    fontSize: 16,
    color: '#27AE60',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  intro: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E0',
  },
  introText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeIcon: {
    fontSize: 14,
  },
  likeCount: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#999',
  },
  inputArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E0',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    color: '#333',
  },
  postButton: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: '#A8D5B5',
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#333',
  },
});
