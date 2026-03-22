import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, FlatList, KeyboardAvoidingView, Platform, Modal, ScrollView } from 'react-native';
import { storageService, TimeMachineEntry } from '../services/StorageService';

const moodOptions = [
  { id: 'happy', icon: '😊', label: '开心' },
  { id: 'peaceful', icon: '😌', label: '平静' },
  { id: 'grateful', icon: '🙏', label: '感恩' },
  { id: 'hopeful', icon: '🌟', label: '期待' },
  { id: 'melancholy', icon: '🌧️', label: '忧伤' },
  { id: 'anxious', icon: '😰', label: '焦虑' },
];

export default function TimeMachineScreen({ navigation, colors: propsColors, goBack }: any) {
  const defaultColors = { background: '#FFF8F0', surface: '#FFFFFF', text: '#333333', textSecondary: '#666666', border: '#F0E8E0', primary: '#E67E22', card: '#FFFFFF' };
  const colors = propsColors || defaultColors;

  const s = {
    container: { flex: 1, backgroundColor: colors.background },
    keyboardView: { flex: 1 },
    header: { height: 44, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { fontSize: 16, color: colors.primary },
    title: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
    intro: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    introText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' as const },
    listContent: { padding: 16, paddingBottom: 220 },
    entryCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    entryHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 8 },
    entryDate: { fontSize: 13, color: colors.textSecondary },
    entryTime: { fontSize: 13, color: colors.textSecondary },
    moodTag: { position: 'absolute' as const, top: 20, right: 20 },
    moodIcon: { fontSize: 24 },
    entryText: { fontSize: 15, lineHeight: 24, color: colors.text },
    emptyState: { alignItems: 'center' as const, paddingVertical: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: colors.text, marginBottom: 8 },
    emptyDesc: { fontSize: 14, color: colors.textSecondary },
    inputPanel: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34, borderTopWidth: 1, borderTopColor: colors.border },
    textInput: { backgroundColor: colors.background, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 80, maxHeight: 120, color: colors.text },
    moodSelector: { marginTop: 12, marginBottom: 12 },
    moodOption: { alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderRadius: 16, backgroundColor: colors.background },
    moodOptionSelected: { backgroundColor: colors.primary },
    moodOptionIcon: { fontSize: 20, marginBottom: 4 },
    moodOptionLabel: { fontSize: 12, color: colors.textSecondary },
    moodOptionLabelSelected: { color: '#FFF' },
    saveButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const },
    saveButtonDisabled: { backgroundColor: '#F0C9A0' },
    saveButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#FFF' },
    successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'center' as const },
    successCard: { backgroundColor: colors.card, paddingHorizontal: 32, paddingVertical: 24, borderRadius: 16, alignItems: 'center' as const },
    successIcon: { fontSize: 40, marginBottom: 12 },
    successText: { fontSize: 16, fontWeight: '600' as const, color: colors.text, marginBottom: 4 },
    successSubtext: { fontSize: 13, color: colors.textSecondary },
    detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' as const },
    detailCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' as const },
    detailHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 4 },
    detailDate: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
    closeButton: { fontSize: 20, color: colors.textSecondary, padding: 4 },
    detailTime: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
    detailMood: { marginBottom: 16 },
    detailMoodIcon: { fontSize: 40 },
    detailContent: { maxHeight: 300 },
    detailText: { fontSize: 15, lineHeight: 26, color: colors.text },
  };

  const [entries, setEntries] = useState<TimeMachineEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeMachineEntry | null>(null);

  // 加载数据和草稿
  useEffect(() => { loadEntries(); loadDraft(); }, []);
  useEffect(() => { return () => { saveDraft(); }; }, [inputText, selectedMood]);

  const loadDraft = async () => {
    const draft = await storageService.getTimeMachineDraft();
    if (draft) { setInputText(draft.text); setSelectedMood(draft.mood); }
  };

  const saveDraft = async () => {
    if (inputText.trim()) {
      await storageService.saveTimeMachineDraft(inputText, selectedMood);
    }
  };

  const loadEntries = async () => {
    const data = await storageService.getTimeMachineEntries();
    setEntries(data);
  };

  const handleAddEntry = async () => {
    if (!inputText.trim() || isPosting) return;
    setIsPosting(true);
    try {
      await storageService.addTimeMachineEntry({ text: inputText.trim(), mood: selectedMood || undefined, timestamp: Date.now() });
      setInputText('');
      setSelectedMood(null);
      setShowSuccess(true);
      loadEntries();
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) { console.error('保存失败:', error); } 
    finally { setIsPosting(false); }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getMoodIcon = (moodId: string) => moodOptions.find(m => m.id === moodId)?.icon || '📝';

  const renderEntry = ({ item }: { item: TimeMachineEntry }) => (
    <TouchableOpacity style={s.entryCard} onPress={() => setSelectedEntry(item)} activeOpacity={0.8}>
      <View style={s.entryHeader}>
        <Text style={s.entryDate}>{formatDate(item.timestamp)}</Text>
        <Text style={s.entryTime}>{formatTime(item.timestamp)}</Text>
      </View>
      {item.mood && <View style={s.moodTag}><Text style={s.moodIcon}>{getMoodIcon(item.mood)}</Text></View>}
      <Text style={s.entryText} numberOfLines={3}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardView}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => goBack()}><Text style={s.backButton}>‹ 返回</Text></TouchableOpacity>
          <Text style={s.title}>📮 时光机</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={s.intro}><Text style={s.introText}>记录当下的自己，留给未来的自己看。</Text></View>
        <FlatList data={entries} renderItem={renderEntry} keyExtractor={(item) => item.id} contentContainerStyle={s.listContent}
          ListEmptyComponent={<View style={s.emptyState}><Text style={s.emptyIcon}>📮</Text><Text style={s.emptyTitle}>时光机是空的</Text><Text style={s.emptyDesc}>记录第一个当下</Text></View>}
        />
        <View style={s.inputPanel}>
          <TextInput style={s.textInput} placeholder="记录此刻..." placeholderTextColor="#999" multiline value={inputText} onChangeText={setInputText} textAlignVertical="top" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.moodSelector}>
            {moodOptions.map((mood) => (
              <TouchableOpacity key={mood.id} style={[s.moodOption, selectedMood === mood.id && s.moodOptionSelected]} onPress={() => setSelectedMood(mood.id)}>
                <Text style={s.moodOptionIcon}>{mood.icon}</Text>
                <Text style={[s.moodOptionLabel, selectedMood === mood.id && s.moodOptionLabelSelected]}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={[s.saveButton, (!inputText.trim() || isPosting) && s.saveButtonDisabled]} onPress={handleAddEntry} disabled={!inputText.trim() || isPosting}>
            <Text style={s.saveButtonText}>{isPosting ? '保存中...' : '存入时光机'}</Text>
          </TouchableOpacity>
        </View>
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={s.successOverlay}><View style={s.successCard}><Text style={s.successIcon}>📮</Text><Text style={s.successText}>已存入时光机</Text><Text style={s.successSubtext}>未来某天再来打开</Text></View></View>
        </Modal>
        <Modal visible={!!selectedEntry} transparent animationType="slide" onRequestClose={() => setSelectedEntry(null)}>
          <View style={s.detailOverlay}>
            <View style={s.detailCard}>
              {selectedEntry && (<>
                <View style={s.detailHeader}><Text style={s.detailDate}>{formatDate(selectedEntry.timestamp)}</Text><TouchableOpacity onPress={() => setSelectedEntry(null)}><Text style={s.closeButton}>✕</Text></TouchableOpacity></View>
                <Text style={s.detailTime}>{formatTime(selectedEntry.timestamp)}</Text>
                {selectedEntry.mood && <View style={s.detailMood}><Text style={s.detailMoodIcon}>{getMoodIcon(selectedEntry.mood)}</Text></View>}
                <ScrollView style={s.detailContent}><Text style={s.detailText}>{selectedEntry.text}</Text></ScrollView>
              </>)}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
