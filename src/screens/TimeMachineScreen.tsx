import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, FlatList, KeyboardAvoidingView, Platform, Modal, Image, ScrollView } from 'react-native';
import { storageService, TimeMachineEntry } from '../services/StorageService';

const moodOptions = [
  { id: 'happy', icon: '😊', label: '开心' },
  { id: 'peaceful', icon: '😌', label: '平静' },
  { id: 'grateful', icon: '🙏', label: '感恩' },
  { id: 'hopeful', icon: '🌟', label: '期待' },
  { id: 'melancholy', icon: '🌧️', label: '忧伤' },
  { id: 'anxious', icon: '😰', label: '焦虑' },
];

export default function TimeMachineScreen({ navigation }: any) {
  const [entries, setEntries] = useState<TimeMachineEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeMachineEntry | null>(null);

  // 加载时光记录
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const data = await storageService.getTimeMachineEntries();
    setEntries(data);
  };

  // 添加记录
  const handleAddEntry = async () => {
    if (!inputText.trim() || isPosting) return;

    setIsPosting(true);
    try {
      await storageService.addTimeMachineEntry({
        text: inputText.trim(),
        mood: selectedMood || undefined,
        timestamp: Date.now(),
      });
      setInputText('');
      setSelectedMood(null);
      setShowSuccess(true);
      loadEntries();
      
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsPosting(false);
    }
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    return date.toLocaleDateString('zh-CN', options);
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 获取心情图标
  const getMoodIcon = (moodId: string) => {
    const mood = moodOptions.find(m => m.id === moodId);
    return mood?.icon || '📝';
  };

  // 渲染记录卡片
  const renderEntry = ({ item }: { item: TimeMachineEntry }) => (
    <TouchableOpacity 
      style={styles.entryCard}
      onPress={() => setSelectedEntry(item)}
      activeOpacity={0.8}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formatDate(item.timestamp)}</Text>
        <Text style={styles.entryTime}>{formatTime(item.timestamp)}</Text>
      </View>
      {item.mood && (
        <View style={styles.moodTag}>
          <Text style={styles.moodIcon}>{getMoodIcon(item.mood)}</Text>
        </View>
      )}
      <Text style={styles.entryText} numberOfLines={3}>{item.text}</Text>
    </TouchableOpacity>
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
          <Text style={styles.title}>📮 时光机</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* 说明 */}
        <View style={styles.intro}>
          <Text style={styles.introText}>
            记录当下的自己，留给未来的自己看。
          </Text>
        </View>

        {/* 记录列表 */}
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📮</Text>
              <Text style={styles.emptyTitle}>时光机是空的</Text>
              <Text style={styles.emptyDesc}>记录第一个当下</Text>
            </View>
          }
        />

        {/* 添加记录面板 */}
        <View style={styles.inputPanel}>
          <TextInput
            style={styles.textInput}
            placeholder="记录此刻..."
            placeholderTextColor="#999"
            multiline
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
          />
          
          {/* 心情选择 */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.moodSelector}
          >
            {moodOptions.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodOption,
                  selectedMood === mood.id && styles.moodOptionSelected
                ]}
                onPress={() => setSelectedMood(mood.id)}
              >
                <Text style={styles.moodOptionIcon}>{mood.icon}</Text>
                <Text style={[
                  styles.moodOptionLabel,
                  selectedMood === mood.id && styles.moodOptionLabelSelected
                ]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity 
            style={[styles.saveButton, (!inputText.trim() || isPosting) && styles.saveButtonDisabled]}
            onPress={handleAddEntry}
            disabled={!inputText.trim() || isPosting}
          >
            <Text style={styles.saveButtonText}>
              {isPosting ? '保存中...' : '存入时光机'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 成功提示 */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.successOverlay}>
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>📮</Text>
              <Text style={styles.successText}>已存入时光机</Text>
              <Text style={styles.successSubtext}>未来某天再来打开</Text>
            </View>
          </View>
        </Modal>

        {/* 详情弹窗 */}
        <Modal 
          visible={!!selectedEntry} 
          transparent 
          animationType="slide"
          onRequestClose={() => setSelectedEntry(null)}
        >
          <View style={styles.detailOverlay}>
            <View style={styles.detailCard}>
              {selectedEntry && (
                <>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailDate}>{formatDate(selectedEntry.timestamp)}</Text>
                    <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                      <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.detailTime}>{formatTime(selectedEntry.timestamp)}</Text>
                  {selectedEntry.mood && (
                    <View style={styles.detailMood}>
                      <Text style={styles.detailMoodIcon}>{getMoodIcon(selectedEntry.mood)}</Text>
                    </View>
                  )}
                  <ScrollView style={styles.detailContent}>
                    <Text style={styles.detailText}>{selectedEntry.text}</Text>
                  </ScrollView>
                </>
              )}
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
    backgroundColor: '#FFF8F0',
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
    borderBottomColor: '#F0E8E0',
  },
  backButton: {
    fontSize: 16,
    color: '#E67E22',
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
    borderBottomColor: '#F0E8E0',
  },
  introText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 220,
  },
  entryCard: {
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
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 13,
    color: '#999',
  },
  entryTime: {
    fontSize: 13,
    color: '#999',
  },
  moodTag: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  moodIcon: {
    fontSize: 24,
  },
  entryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
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
  inputPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
  },
  textInput: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    maxHeight: 120,
    color: '#333',
  },
  moodSelector: {
    marginTop: 12,
    marginBottom: 12,
  },
  moodOption: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#FFF8F0',
  },
  moodOptionSelected: {
    backgroundColor: '#E67E22',
  },
  moodOptionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  moodOptionLabel: {
    fontSize: 12,
    color: '#666',
  },
  moodOptionLabelSelected: {
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: '#E67E22',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#F0C9A0',
  },
  saveButtonText: {
    fontSize: 16,
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 13,
    color: '#999',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 20,
    color: '#999',
    padding: 4,
  },
  detailTime: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  detailMood: {
    marginBottom: 16,
  },
  detailMoodIcon: {
    fontSize: 40,
  },
  detailContent: {
    maxHeight: 300,
  },
  detailText: {
    fontSize: 15,
    lineHeight: 26,
    color: '#333',
  },
});
