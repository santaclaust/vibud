import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

interface ModeOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const modeOptions: ModeOption[] = [
  { id: 'heal', name: '治愈模式', icon: '💚', description: 'AI陪伴，温暖倾听' },
  { id: 'treehole', name: '树洞模式', icon: '🌲', description: '匿名倾诉，不回复' },
  { id: 'consult', name: '心理咨询', icon: '📞', description: '专业引导，深度对话' },
  { id: 'record', name: '时光记录', icon: '📮', description: '记录当下，写给未来' },
  { id: 'draw', name: '治愈取签', icon: '🎴', description: '抽取签语，化解情绪' },
];

export default function ConfessionScreen({ navigation }: any) {
  const [text, setText] = useState('');
  const [selectedMode, setSelectedMode] = useState('heal');
  const [isModeSelectorVisible, setModeSelectorVisible] = useState(false);

  const handleSend = () => {
    if (text.trim()) {
      // TODO: 调用AI接口
      console.log('发送倾诉:', text, '模式:', selectedMode);
    }
  };

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
          <Text style={styles.title}>倾诉</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* 模式选择器 */}
        <TouchableOpacity 
          style={styles.modeSelector}
          onPress={() => setModeSelectorVisible(!isModeSelectorVisible)}
        >
          <Text style={styles.modeSelectorText}>
            {modeOptions.find(m => m.id === selectedMode)?.icon} {modeOptions.find(m => m.id === selectedMode)?.name}
          </Text>
          <Text style={styles.chevron}>{isModeSelectorVisible ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* 模式选项 */}
        {isModeSelectorVisible && (
          <View style={styles.modeOptions}>
            {modeOptions.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeOption,
                  selectedMode === mode.id && styles.modeOptionSelected
                ]}
                onPress={() => {
                  setSelectedMode(mode.id);
                  setModeSelectorVisible(false);
                }}
              >
                <Text style={styles.modeOptionIcon}>{mode.icon}</Text>
                <View style={styles.modeOptionText}>
                  <Text style={styles.modeOptionName}>{mode.name}</Text>
                  <Text style={styles.modeOptionDesc}>{mode.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 输入区域 */}
        <ScrollView style={styles.inputArea} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.textInput}
            placeholder="在这里写下你的心情..."
            placeholderTextColor="#999"
            multiline
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />
        </ScrollView>

        {/* 底部操作栏 */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.voiceButton}>
            <Text style={styles.voiceIcon}>🎤</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Text style={styles.sendButtonText}>倾诉</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    fontSize: 16,
    color: '#4A90E2',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modeSelectorText: {
    fontSize: 15,
    color: '#333',
  },
  chevron: {
    fontSize: 12,
    color: '#999',
  },
  modeOptions: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modeOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  modeOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  modeOptionText: {
    flex: 1,
  },
  modeOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  modeOptionDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  inputArea: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 150,
    color: '#333',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceIcon: {
    fontSize: 20,
  },
  sendButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#B0D4F1',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
