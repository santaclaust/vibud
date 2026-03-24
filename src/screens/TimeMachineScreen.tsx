import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, FlatList, KeyboardAvoidingView, Platform, Modal, ScrollView, Alert, Animated, Easing } from 'react-native';
import { storageService, TimeMachineEntry } from '../services/StorageService';
import notificationService from '../services/NotificationService';

const moodOptions = [
  { id: 'happy', icon: '😊', label: '开心' },
  { id: 'peaceful', icon: '😌', label: '平静' },
  { id: 'grateful', icon: '🙏', label: '感恩' },
  { id: 'hopeful', icon: '🌟', label: '期待' },
  { id: 'melancholy', icon: '🌧️', label: '忧伤' },
  { id: 'anxious', icon: '😰', label: '焦虑' },
];

// 提醒选项
const reminderOptions = [
  { id: 'none', label: '不提醒', days: 0 },
  { id: '7days', label: '7天后', days: 7 },
  { id: '30days', label: '30天后', days: 30 },
  { id: '90days', label: '90天后', days: 90 },
  { id: '1year', label: '1年后', days: 365 },
  { id: '2years', label: '2年后', days: 730 },
  { id: '3years', label: '3年后', days: 1095 },
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
    listContent: { padding: 16, paddingBottom: 280 },
    entryCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    lockedCard: { backgroundColor: '#F5F5F5', opacity: 0.8 },
    unlockingCard: { backgroundColor: '#FFF8E1', borderWidth: 2, borderColor: '#FFD700' },
    entryHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 8 },
    entryDate: { fontSize: 13, color: colors.textSecondary },
    entryTime: { fontSize: 13, color: colors.textSecondary },
    reminderBadge: { position: 'absolute' as const, top: 20, right: 20, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    reminderIcon: { fontSize: 12, marginRight: 4 },
    reminderText: { fontSize: 11, color: colors.primary },
    moodTag: { position: 'absolute' as const, top: 20, left: 20 },
    moodIcon: { fontSize: 24 },
    entryText: { fontSize: 15, lineHeight: 24, color: colors.text },
    // 锁定状态样式
    lockedContent: { alignItems: 'center' as const, paddingVertical: 20 },
    lockedIcon: { fontSize: 32, marginBottom: 8 },
    lockShackle: { position: 'absolute' as const, top: 0, left: 0, right: 0, alignItems: 'center' as const },
    lockedText: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
    lockedDays: { fontSize: 24, fontWeight: '700' as const, color: colors.primary },
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
    reminderSection: { marginBottom: 12 },
    reminderLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
    reminderOptions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
    reminderOption: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    reminderOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    reminderOptionText: { fontSize: 12, color: colors.textSecondary },
    reminderOptionTextSelected: { color: '#FFF' },
    saveButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const },
    saveButtonDisabled: { backgroundColor: '#F0C9A0' },
    saveButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#FFF' },
    successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'center' as const },
    successCard: { backgroundColor: colors.card, paddingHorizontal: 32, paddingVertical: 24, borderRadius: 16, alignItems: 'center' as const },
    successIcon: { fontSize: 40, marginBottom: 12 },
    successText: { fontSize: 16, fontWeight: '600' as const, color: colors.text, marginBottom: 4 },
    successSubtext: { fontSize: 13, color: colors.textSecondary },
    detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'stretch' as const, paddingHorizontal: 0 },
    detailCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, marginHorizontal: 16, maxHeight: '70%' as const, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    detailHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 4 },
    detailDate: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
    closeButton: { marginTop: 20, backgroundColor: colors.background, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const },
    closeButtonText: { fontSize: 16, color: colors.primary, fontWeight: '600' as const },
    detailTime: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
    detailMood: { marginBottom: 16 },
    detailMoodIcon: { fontSize: 40 },
    detailContent: { maxHeight: 300 },
    detailText: { fontSize: 15, lineHeight: 26, color: colors.text },
  };

  const [entries, setEntries] = useState<TimeMachineEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<string>('none');
  const [isPosting, setIsPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeMachineEntry | null>(null);
  
  // 解锁动画相关
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current; // 震动
  const crackAnim = useRef(new Animated.Value(0)).current; // 裂纹
  const glowAnim = useRef(new Animated.Value(0)).current; // 金光
  const explosionAnim = useRef(new Animated.Value(0)).current; // 爆炸
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // 检查是否有今日到期和明日到期的条目
  useEffect(() => {
    checkAndNotify();
  }, [entries]);

  // 检查并发送通知
  const checkAndNotify = async () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (const entry of entries) {
      if (entry.unlockAt) {
        const daysLeft = Math.ceil((entry.unlockAt - now) / oneDay);
        
        // 到期当天提醒
        if (daysLeft === 0 && entry.unlockAt <= now) {
          await notificationService.notifyTimeMachineReminder(entry.text, 0);
        }
        // 前一天提醒
        else if (daysLeft === 1) {
          await notificationService.notifyTimeMachineReminder(entry.text, 1);
        }
      }
    }
  };

  // 播放解锁动画
  const playUnlockAnimation = (entryId: string, callback: () => void) => {
    setUnlockingId(entryId);
    
    // 重置动画值
    scaleAnim.setValue(1);
    shakeAnim.setValue(0);
    crackAnim.setValue(0);
    glowAnim.setValue(0);
    explosionAnim.setValue(0);
    opacityAnim.setValue(1);
    
    // 震动动画（循环）
    const startShake = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]),
        { iterations: 10 }
      ).start();
    };
    
    // 动画序列
    Animated.sequence([
      // 1. 锁变大到2倍 (1.5秒)
      Animated.timing(scaleAnim, {
        toValue: 2,
        duration: 1500,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      // 2. 开始震动 + 裂纹出现 (1.5秒)
      Animated.parallel([
        // 震动
        Animated.sequence([
          Animated.delay(300),
          Animated.loop(
            Animated.sequence([
              Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
            ]),
            { iterations: 12 }
          ),
        ]),
        // 裂纹
        Animated.timing(crackAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),
      // 3. 锁爆炸消失 + 金光绽放 (1.5秒)
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      setUnlockingId(null);
      callback();
    });
  };

  // 处理点击解锁
  const handleUnlock = (item: TimeMachineEntry) => {
    if (!isUnlocked(item)) {
      playUnlockAnimation(item.id, () => {
        setSelectedEntry(item);
      });
    } else {
      setSelectedEntry(item);
    }
  };

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
      const reminder = reminderOptions.find(r => r.id === selectedReminder);
      const daysToUnlock = reminder?.days || 0;
      const unlockAt = daysToUnlock > 0 ? Date.now() + (daysToUnlock * 24 * 60 * 60 * 1000) : undefined;
      
      await storageService.addTimeMachineEntry({ 
        text: inputText.trim(), 
        mood: selectedMood || undefined, 
        timestamp: Date.now(),
        unlockAt: unlockAt
      });

      if (daysToUnlock > 0) {
        await notificationService.scheduleTimeMachineNotification(
          inputText.trim(),
          Date.now(),
          daysToUnlock
        );
      }

      setInputText('');
      setSelectedMood(null);
      setSelectedReminder('none');
      setShowSuccess(true);
      loadEntries();
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (error) { 
      console.error('保存失败:', error); 
    } 
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

  const getDaysRemaining = (unlockAt: number): number => {
    const now = Date.now();
    const diff = unlockAt - now;
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  };

  const isUnlocked = (item: TimeMachineEntry): boolean => {
    if (!item.unlockAt) return true;
    return Date.now() >= item.unlockAt;
  };

  // 动画样式 - 锁（缩放 + 震动）
  const animatedLockStyle = {
    transform: [
      { scale: scaleAnim },
      { translateX: shakeAnim.interpolate({
          inputRange: [-3, 0, 3],
          outputRange: [-3, 0, 3]
        })
      },
    ],
    opacity: opacityAnim,
  };

  // 裂纹样式
  const crackStyle = {
    opacity: crackAnim,
  };

  // 金光样式 - 多个光环四散
  const glowStyle1 = {
    opacity: glowAnim,
    transform: [
      { scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 3]
        })
      },
    ],
  };
  const glowStyle2 = {
    opacity: glowAnim,
    transform: [
      { scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 4]
        })
      },
      { rotate: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg']
        })
      },
    ],
  };
  const glowStyle3 = {
    opacity: glowAnim,
    transform: [
      { scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 3.5]
        })
      },
      { rotate: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-45deg']
        })
      },
    ],
  };

  const animatedGlowStyle = {
    opacity: glowAnim,
  };

  const renderEntry = ({ item }: { item: TimeMachineEntry }) => {
    const unlocked = isUnlocked(item);
    const daysLeft = item.unlockAt ? getDaysRemaining(item.unlockAt) : 0;
    const isUnlocking = unlockingId === item.id;
    
    return (
      <Animated.View style={[
        s.entryCard, 
        !unlocked && !isUnlocking && s.lockedCard,
        isUnlocking && s.unlockingCard,
      ]}>
        <TouchableOpacity 
          onPress={() => unlocked ? setSelectedEntry(item) : handleUnlock(item)} 
          activeOpacity={unlocked ? 0.8 : 1}
          style={{ flex: 1 }}
        >
          <View style={s.entryHeader}>
            <Text style={s.entryDate}>{formatDate(item.timestamp)}</Text>
            <Text style={s.entryTime}>{formatTime(item.timestamp)}</Text>
          </View>
          
          {item.mood && <View style={s.moodTag}><Text style={s.moodIcon}>{getMoodIcon(item.mood)}</Text></View>}
          
          {unlocked ? (
            <Text style={s.entryText} numberOfLines={3}>{item.text}</Text>
          ) : (
            <View style={s.lockedContent}>
              {isUnlocking ? (
                <>
                  {/* 金光绽放效果 */}
                  <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }, glowStyle1]}>
                    <View style={{ width: 250, height: 250, borderRadius: 125, backgroundColor: '#FFD700', opacity: 0.7 }} />
                  </Animated.View>
                  <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }, glowStyle2]}>
                    <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: '#FFEC8B', opacity: 0.6 }} />
                  </Animated.View>
                  <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }, glowStyle3]}>
                    <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFFACD', opacity: 0.5 }} />
                  </Animated.View>
                  {/* 锁 + 裂纹 */}
                  <Animated.View style={[s.lockedIcon, animatedLockStyle]}>
                    <Text style={{ fontSize: 64 }}>🔒</Text>
                    {/* 裂纹 */}
                    <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }, crackStyle]}>
                      <Text style={{ fontSize: 64, color: '#FF4444', textShadowColor: '#FF0000', textShadowRadius: 3 }}>⚡</Text>
                    </Animated.View>
                  </Animated.View>
                </>
              ) : (
                <>
                  <Text style={s.lockedIcon}>🔒</Text>
                  <Text style={s.lockedText}>距离开启还有</Text>
                  <Text style={s.lockedDays}>{daysLeft} 天</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

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

          <View style={s.reminderSection}>
            <Text style={s.reminderLabel}>提醒我：</Text>
            <View style={s.reminderOptions}>
              {reminderOptions.map((option) => (
                <TouchableOpacity 
                  key={option.id} 
                  style={[s.reminderOption, selectedReminder === option.id && s.reminderOptionSelected]}
                  onPress={() => setSelectedReminder(option.id)}
                >
                  <Text style={[s.reminderOptionText, selectedReminder === option.id && s.reminderOptionTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={[s.saveButton, (!inputText.trim() || isPosting) && s.saveButtonDisabled]} onPress={handleAddEntry} disabled={!inputText.trim() || isPosting}>
            <Text style={s.saveButtonText}>{isPosting ? '保存中...' : '存入时光机'}</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={s.successOverlay}>
            <View style={s.successCard}>
              <Text style={s.successIcon}>📮</Text>
              <Text style={s.successText}>已存入时光机</Text>
              <Text style={s.successSubtext}>
                {selectedReminder !== 'none' 
                  ? `${reminderOptions.find(r => r.id === selectedReminder)?.label}会收到提醒`
                  : '未来某天再来打开'
                }
              </Text>
            </View>
          </View>
        </Modal>

        <Modal visible={!!selectedEntry} transparent animationType="fade" onRequestClose={() => setSelectedEntry(null)}>
          <View style={s.detailOverlay}>
            <View style={s.detailCard}>
              {selectedEntry && (<>
                <View style={s.detailHeader}>
                  <Text style={s.detailDate}>{formatDate(selectedEntry.timestamp)}</Text>
                  <View style={{ width: 28 }} />
                </View>
                <Text style={s.detailTime}>{formatTime(selectedEntry.timestamp)}</Text>
                {selectedEntry.mood && <View style={s.detailMood}><Text style={s.detailMoodIcon}>{getMoodIcon(selectedEntry.mood)}</Text></View>}
                <ScrollView style={s.detailContent}><Text style={s.detailText}>{selectedEntry.text}</Text></ScrollView>
                <TouchableOpacity style={s.closeButton} onPress={() => setSelectedEntry(null)}>
                  <Text style={s.closeButtonText}>关闭</Text>
                </TouchableOpacity>
              </>)}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
