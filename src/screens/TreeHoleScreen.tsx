import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, FlatList, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { storageService, TreeHolePost } from '../services/StorageService';

export default function TreeHoleScreen({ navigation, colors: propsColors, goBack }: any) {
  // 默认主题色
  const defaultColors = { background: '#F5F5F0', surface: '#FFFFFF', text: '#333333', textSecondary: '#666666', border: '#E8E8E0', primary: '#27AE60', card: '#FFFFFF' };
  const colors = propsColors || defaultColors;
  
  // 动态样式
  const dynamicStyles = {
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      height: 44,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: { fontSize: 16, color: colors.primary },
    title: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
    intro: {
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    introText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' as const },
    postCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    postText: { fontSize: 15, lineHeight: 24, color: colors.text, marginBottom: 12 },
    postTime: { fontSize: 12, color: colors.textSecondary },
    likeCount: { fontSize: 12, color: colors.textSecondary },
    emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: colors.text, marginBottom: 8 },
    emptyDesc: { fontSize: 14, color: colors.textSecondary },
    inputArea: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 34,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      gap: 12,
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      maxHeight: 100,
      color: colors.text,
    },
    postButton: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
    postButtonDisabled: { backgroundColor: '#A8D5B5' },
    postButtonText: { fontSize: 15, fontWeight: '600' as const, color: '#FFF' },
    successCard: { backgroundColor: colors.card, paddingHorizontal: 32, paddingVertical: 24, borderRadius: 16, alignItems: 'center' as const },
    successText: { fontSize: 16, color: colors.text },
  };
  
  const [posts, setPosts] = useState<TreeHolePost[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 加载数据和草稿
  useEffect(() => { 
    loadPosts(); 
    loadDraft();
  }, []);

  // 加载草稿
  const loadDraft = async () => {
    const draft = await storageService.getTreeHoleDraft();
    if (draft) setInputText(draft.text);
  };

  // 保存草稿
  const saveDraft = async () => {
    if (inputText.trim()) {
      await storageService.saveTreeHoleDraft(inputText);
    }
  };

  // 离开时保存草稿
  useEffect(() => {
    return () => { saveDraft(); };
  }, [inputText]);

  const loadPosts = async () => {
    const data = await storageService.getTreeHolePosts();
    setPosts(data);
  };

  const handlePost = async () => {
    if (!inputText.trim() || isPosting) return;
    setIsPosting(true);
    try {
      await storageService.postToTreeHole(inputText.trim());
      setInputText('');
      storageService.clearTreeHoleDraft(); // 清空草稿
      setShowSuccess(true);
      loadPosts();
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('发布失败:', error);
    } finally {
      setIsPosting(false);
    }
  };

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

  const renderPost = ({ item }: { item: TreeHolePost }) => (
    <View style={dynamicStyles.postCard}>
      <Text style={dynamicStyles.postText}>{item.text}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={dynamicStyles.postTime}>{formatTime(item.timestamp)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 14 }}>❤️</Text>
          <Text style={dynamicStyles.likeCount}>{item.likes}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => goBack()}>
            <Text style={dynamicStyles.backButton}>‹ 返回</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.title}>🌲 树洞</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={dynamicStyles.intro}>
          <Text style={dynamicStyles.introText}>这里是匿名的树洞，把想说的话说出来，然后放手。</Text>
        </View>

        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🌲</Text>
              <Text style={dynamicStyles.emptyTitle}>树洞是空的</Text>
              <Text style={dynamicStyles.emptyDesc}>你是第一个开口的人</Text>
            </View>
          }
        />

        <View style={dynamicStyles.inputArea}>
          <TextInput
            style={dynamicStyles.textInput}
            placeholder="把想说的话告诉树洞..."
            placeholderTextColor={colors.textSecondary}
            multiline
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[dynamicStyles.postButton, (!inputText.trim() || isPosting) && dynamicStyles.postButtonDisabled]}
            onPress={handlePost}
            disabled={!inputText.trim() || isPosting}
          >
            <Text style={dynamicStyles.postButtonText}>{isPosting ? '发送中...' : '倾诉'}</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={dynamicStyles.successCard}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🌲</Text>
              <Text style={dynamicStyles.successText}>已经藏好了</Text>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
