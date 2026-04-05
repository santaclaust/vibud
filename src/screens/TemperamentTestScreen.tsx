/**
 * 心芽·情绪植物气质测试
 * 60题，逐题作答，显示进度 + 详细植物分析
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  StatusBar,
  Dimensions,
  Image
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../hooks/useTheme';
import { TEMPERAMENT_TEST, calculateResult } from '../data/temperamentTest';
import { storageService } from '../services/StorageService';
import { getUserEmotionProfile, createUserEmotionProfile, updateUserEmotionProfile } from '../services/CloudBaseService';

interface Props {
  onComplete?: (result: any) => void;
  onClose?: () => void;
}

const PLANT_DESCRIPTIONS: Record<string, any> = {
  '银杏': { emoji: '🌳', description: '坚韧而沉静的古老树种，象征着智慧与长寿', personality: ['沉稳内敛', '思考深远', '情绪稳定', '抗压能力强'], advice: ['适合有节奏的持续成长', '需要情绪出口时主动倾诉', '发挥稳健优势'], growth: '慢生长但根基深厚，后劲型发展' },
  '松柏': { emoji: '🌲', description: '四季常青的象征，代表坚韧不拔的精神', personality: ['意志坚定', '不易动摇', '独立自强', '原则性强'], advice: ['学会灵活变通', '适当放松要求', '接纳他人意见'], growth: '在艰难环境中更显价值' },
  '向日葵': { emoji: '🌻', description: '追随阳光的代表，象征乐观与活力', personality: ['阳光积极', '热情外向', '善于社交', '充满能量'], advice: ['学会独处', '沉淀思考', '避免过度活跃'], growth: '在阳光下绽放光彩' },
};

function getPlantDescription(plantName: string) {
  return PLANT_DESCRIPTIONS[plantName] || { emoji: '🌱', description: '独特的植物类型', personality: ['独特个性'], advice: ['继续了解自己'], growth: '待发掘' };
}

export default function TemperamentTestScreen({ onComplete, onClose }: Props) {
  const { colors: themeColors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(60).fill(undefined));
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [existingResult, setExistingResult] = useState<any>(null);
  const [showUnansweredAlert, setShowUnansweredAlert] = useState(false);
  const [showSeedDetail, setShowSeedDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const saved = await storageService.getTemperamentResult();
        if (saved) {
          setExistingResult(saved);
          setShowResult(true);
          setResult(saved);
        }
      } catch (e) {
        console.log('加载已有结果失败', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadExisting();
  }, []);

  const hasExistingSeed = !!existingResult;
  const colors = useMemo(() => ({
    background: themeColors.background,
    surface: themeColors.surface,
    text: themeColors.text,
    textSecondary: themeColors.textSecondary,
    border: themeColors.border,
    primary: themeColors.primary,
    primaryLight: themeColors.primary + '20',
  }), [themeColors]);
  
  // 获取植物描述（用于弹窗）
  const plantDesc = result ? getPlantDescription(result.plant) : getPlantDescription('银杏');

  const selectAnswer = (value: number) => {
    if (hasExistingSeed || isLoading) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = value;
    setAnswers(newAnswers);
    if (currentIndex < 59) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const finalResult = calculateResult(newAnswers);
      handleComplete(finalResult);
    }
  };

  const handleComplete = async (finalResult: any) => {
    // 保存到本地
    await storageService.saveTemperamentResult(finalResult);
    
    // 保存到 CloudBase user_profiles
    try {
      const userId = storageService.getUserId() || 'guest';
      let profile = await getUserEmotionProfile(userId);
      if (!profile) {
        profile = await createUserEmotionProfile(userId);
      }
      // 更新专属植物宠物特性
      await updateUserEmotionProfile(userId, {
        plantPet: {
          plant: finalResult.plant,
          primaryType: finalResult.primaryType,
          secondaryType: finalResult.secondaryType,
          resultType: finalResult.resultType,
          scores: finalResult.scores,
          completionRate: finalResult.completionRate,
          bonusPercent: finalResult.bonusPercent,
          baseScore: finalResult.baseScore,
          finalScore: finalResult.finalScore,
          savedAt: Date.now(),
        }
      });
    } catch (e) {
      console.log('保存到CloudBase失败', e);
    }
    
    setResult(finalResult);
    setExistingResult(finalResult);
    setShowSeedDetail(true);
    onComplete?.(finalResult);
  };

  const submitWithCurrentAnswers = async () => {
    const answeredCount = answers.filter(a => a !== undefined).length;
    if (answeredCount === 0) {
      onClose?.();
      return;
    }
    const finalResult = calculateResult(answers);
    await handleComplete(finalResult);
  };

  const goBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const jumpTo = (index: number) => {
    if (index >= 0 && index < 60) setCurrentIndex(index);
  };

  const handleFinalAction = () => {
    const unanswered = answers.filter(a => a === undefined).length;
    if (unanswered > 0) {
      setShowUnansweredAlert(true);
      return;
    }
    const finalResult = calculateResult(answers);
    handleComplete(finalResult);
  };

  const closeAlert = () => setShowUnansweredAlert(false);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载中...</Text>
        </View>
      </View>
    );
  }

  // 已领取种子
  if (hasExistingSeed) {
    const plantDesc = getPlantDescription(existingResult.plant);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.alreadySection, { backgroundColor: colors.surface }]}>
          <Image 
            source={require('../../assets/seed.png')} 
            style={styles.alreadyEmoji} 
          />
          <Text style={[styles.alreadyTitle, { color: colors.text }]}>您已领取种子</Text>
          <Text style={[styles.alreadyPlant, { color: colors.primary }]}>{existingResult.plant}</Text>
          <Text style={[styles.alreadyDesc, { color: colors.textSecondary }]}>{plantDesc.description}</Text>
          <TouchableOpacity style={[styles.alreadyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowSeedDetail(true)}>
            <Text style={styles.alreadyBtnText}>查看种子特性</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.alreadyBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.alreadyBtnText, { color: colors.text }]}>关闭</Text>
          </TouchableOpacity>
        </View>
        
        {showSeedDetail && (
          <View style={[styles.seedModalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[styles.seedModalBox, { backgroundColor: colors.surface }]}>
              <TouchableOpacity style={styles.seedModalClose} onPress={() => setShowSeedDetail(false)}>
                <Text style={[styles.seedModalCloseText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
              <View style={styles.seedModalContent}>
                <ScrollView style={styles.seedModalScroll} showsVerticalScrollIndicator={true}>
                  <Image source={require('../../assets/seed.png')} style={styles.seedModalEmoji} />
                  <Text style={[styles.seedModalTitle, { color: colors.text }]}>{existingResult.plant}</Text>
                  <Text style={[styles.seedModalSubtitle, { color: colors.primary }]}>{existingResult.resultType}</Text>
                  
                  <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                    <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>🌱 种子信息</Text>
                    <Text style={[styles.seedModalText, { color: colors.text }]}>植物: {existingResult.plant}</Text>
                    <Text style={[styles.seedModalText, { color: colors.text }]}>主气质: {existingResult.primaryType}</Text>
                    <Text style={[styles.seedModalText, { color: colors.text }]}>副气质: {existingResult.secondaryType}</Text>
                    <Text style={[styles.seedModalText, { color: colors.text }]}>类型: {existingResult.resultType}</Text>
                  </View>
                  
                  <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                    <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>📊 分数数据</Text>
                    <Text style={[styles.seedModalText, { color: colors.text }]}>基础分: {existingResult.baseScore}</Text>
                    {existingResult.bonusPercent > 0 && <Text style={[styles.seedModalText, { color: colors.text }]}>加成: +{existingResult.bonusPercent}%</Text>}
                    <Text style={[styles.seedModalText, { color: colors.text }]}>最终总分: {existingResult.finalScore}</Text>
                    <Text style={[styles.seedModalText, { color: colors.text }]}>完成度: {existingResult.completionRate}%</Text>
                  </View>
                  
                  <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                    <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>📈 气质维度</Text>
                    {Object.entries(existingResult.scores).map(([key, value]: [string, any]) => (
                      <View key={key} style={styles.seedModalScoreRow}>
                        <Text style={[styles.seedModalScoreLabel, { color: colors.text }]}>
                          {key === 'bile' ? '胆汁质' : key === 'blood' ? '多血质' : key === 'slime' ? '粘液质' : '抑郁质'}
                        </Text>
                        <View style={[styles.seedModalScoreTrack, { backgroundColor: colors.border }]}>
                          <View style={[styles.seedModalScoreFill, { width: `${Math.min(100, (value / 60) * 100)}%`, backgroundColor: colors.primary }]} />
                        </View>
                        <Text style={[styles.seedModalScoreValue, { color: colors.primary }]}>{value}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                    <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>🌿 性格特点</Text>
                    <Text style={[styles.seedModalDesc, { color: colors.text }]}>{plantDesc.description}</Text>
                    <View style={styles.tagContainer}>
                      {plantDesc.personality?.map((trait: string, i: number) => (
                        <View key={i} style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.tagText, { color: colors.primary }]}>{trait}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  
                  <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                    <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>💡 发展建议</Text>
                    {plantDesc.advice?.map((advice: string, i: number) => (
                      <View key={i} style={styles.adviceItem}>
                        <Text style={[styles.adviceBullet, { color: colors.primary }]}>•</Text>
                        <Text style={[styles.adviceText, { color: colors.text }]}>{advice}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                    <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>🌱 成长特点</Text>
                    <Text style={[styles.seedModalDesc, { color: colors.text }]}>{plantDesc.growth}</Text>
                  </View>
                </ScrollView>
                
                <TouchableOpacity style={[styles.seedModalBtn, { backgroundColor: colors.primary }]} onPress={() => setShowSeedDetail(false)}>
                  <Text style={styles.seedModalBtnText}>关闭</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  // 答题中
  const answeredCount = answers.filter(a => a !== undefined).length;
  const completionPercent = Math.round((answeredCount / 60) * 100);
  const question = TEMPERAMENT_TEST.questions[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surface }]} onPress={onClose}>
          <Text style={[styles.closeBtnText, { color: colors.text }]}>✕ 关闭</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🌱 领取种子</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${((currentIndex + 1) / 60) * 100}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>{currentIndex + 1} / 60</Text>
      </View>
      <View style={styles.questionContainer}>
        <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
      </View>
      <View style={styles.optionsContainer}>
        {TEMPERAMENT_TEST.options.map((option, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.optionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => selectAnswer(option.value)}
          >
            <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.navContainer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.surface }]} onPress={goBack} disabled={currentIndex === 0}>
          <Text style={[styles.navBtnText, { color: currentIndex === 0 ? colors.textSecondary : colors.text }]}>上一题</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.primary }]} onPress={handleFinalAction}>
          <Text style={styles.navBtnText}>{currentIndex < 59 ? '下一题' : '🌱 领取种子'}</Text>
        </TouchableOpacity>
      </View>
      {showUnansweredAlert && (
        <View style={[styles.alertOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.alertBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.alertTitle, { color: colors.text }]}>⚠️ 还有题目未答</Text>
            <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>您还有 {answers.filter(a => a === undefined).length} 道题未作答</Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity style={[styles.alertBtn, { backgroundColor: colors.border }]} onPress={closeAlert}>
                <Text style={[styles.alertBtnText, { color: colors.text }]}>继续答题</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertBtn, { backgroundColor: colors.primary }]} onPress={() => { closeAlert(); submitWithCurrentAnswers(); }}>
                <Text style={styles.alertBtnText}>提交现有答案</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      {/* 种子详情弹窗 - 领取后显示 */}
      {showSeedDetail && result && (
        <View style={[styles.seedModalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.seedModalBox, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.seedModalClose} onPress={() => { setShowSeedDetail(false); onClose?.(); }}>
              <Text style={[styles.seedModalCloseText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
            <View style={styles.seedModalContent}>
              <ScrollView style={styles.seedModalScroll} showsVerticalScrollIndicator={true}>
                <Image source={require('../../assets/seed.png')} style={styles.seedModalEmoji} />
                <Text style={[styles.seedModalTitle, { color: colors.text }]}>{result.plant}</Text>
                <Text style={[styles.seedModalSubtitle, { color: colors.primary }]}>{result.resultType}</Text>
                
                <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                  <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>🌱 种子信息</Text>
                  <Text style={[styles.seedModalText, { color: colors.text }]}>植物: {result.plant}</Text>
                  <Text style={[styles.seedModalText, { color: colors.text }]}>主气质: {result.primaryType}</Text>
                  <Text style={[styles.seedModalText, { color: colors.text }]}>副气质: {result.secondaryType}</Text>
                  <Text style={[styles.seedModalText, { color: colors.text }]}>类型: {result.resultType}</Text>
                </View>
                
                <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                  <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>📊 分数数据</Text>
                  <Text style={[styles.seedModalText, { color: colors.text }]}>基础分: {result.baseScore}</Text>
                  {result.bonusPercent > 0 && <Text style={[styles.seedModalText, { color: colors.text }]}>加成: +{result.bonusPercent}%</Text>}
                  <Text style={[styles.seedModalText, { color: colors.text }]}>最终总分: {result.finalScore}</Text>
                  <Text style={[styles.seedModalText, { color: colors.text }]}>完成度: {result.completionRate}%</Text>
                </View>
                
                <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                  <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>📈 气质维度</Text>
                  {Object.entries(result.scores).map(([key, value]: [string, any]) => (
                    <View key={key} style={styles.seedModalScoreRow}>
                      <Text style={[styles.seedModalScoreLabel, { color: colors.text }]}>
                        {key === 'bile' ? '胆汁质' : key === 'blood' ? '多血质' : key === 'slime' ? '粘液质' : '抑郁质'}
                      </Text>
                      <View style={[styles.seedModalScoreTrack, { backgroundColor: colors.border }]}>
                        <View style={[styles.seedModalScoreFill, { width: `${Math.min(100, (value / 60) * 100)}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[styles.seedModalScoreValue, { color: colors.primary }]}>{value}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                  <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>🌿 性格特点</Text>
                  <Text style={[styles.seedModalDesc, { color: colors.text }]}>{plantDesc.description}</Text>
                  <View style={styles.tagContainer}>
                    {plantDesc.personality?.map((trait: string, i: number) => (
                      <View key={i} style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.tagText, { color: colors.primary }]}>{trait}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                  <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>💡 发展建议</Text>
                  {plantDesc.advice?.map((advice: string, i: number) => (
                    <View key={i} style={styles.adviceItem}>
                      <Text style={[styles.adviceBullet, { color: colors.primary }]}>•</Text>
                      <Text style={[styles.adviceText, { color: colors.text }]}>{advice}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={[styles.seedModalSection, { borderColor: colors.border }]}>
                  <Text style={[styles.seedModalLabel, { color: colors.textSecondary }]}>🌱 成长特点</Text>
                  <Text style={[styles.seedModalDesc, { color: colors.text }]}>{plantDesc.growth}</Text>
                </View>
              </ScrollView>
              
              <TouchableOpacity style={[styles.seedModalBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowSeedDetail(false); onClose?.(); }}>
                <Text style={styles.seedModalBtnText}>🌱 确认并关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  closeBtnText: { fontSize: 14 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 14, minWidth: 45 },
  questionContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  questionText: { fontSize: 20, lineHeight: 32, textAlign: 'center' },
  optionsContainer: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  optionBtn: { padding: 16, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  optionLabel: { fontSize: 16 },
  navContainer: { flexDirection: 'row', padding: 16, gap: 12, paddingBottom: 32, borderTopWidth: 1 },
  navBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  navBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  alreadySection: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  alreadyEmoji: { width: 60, height: 60, marginBottom: 16 },
  alreadyTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  alreadyPlant: { fontSize: 28, fontWeight: '600', marginBottom: 8 },
  alreadyDesc: { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  alreadyBtn: { width: '80%', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  alreadyBtnContent: { flexDirection: 'row', alignItems: 'center' },
  alreadyBtnIcon: { width: 24, height: 24, marginRight: 8 },
  alreadyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  alertOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  alertBox: { width: '85%', padding: 24, borderRadius: 16, marginHorizontal: 20 },
  alertTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  alertMessage: { fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  alertButtons: { flexDirection: 'row', gap: 12 },
  alertBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  alertBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  seedModalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  seedModalBox: { width: '90%', maxHeight: '80%', borderRadius: 20, overflow: 'hidden' },
  seedModalClose: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  seedModalCloseText: { fontSize: 18 },
  seedModalContent: { padding: 24, alignItems: 'center' },
  seedModalScroll: { width: '100%', maxHeight: Dimensions.get('window').height * 0.6 },
  seedModalEmoji: { width: 40, height: 40, marginBottom: 12 },
  seedModalTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  seedModalSubtitle: { fontSize: 16, marginBottom: 20 },
  seedModalSection: { width: '100%', padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  seedModalLabel: { fontSize: 12, marginBottom: 8 },
  seedModalText: { fontSize: 14, marginBottom: 4 },
  seedModalDesc: { fontSize: 14, lineHeight: 22 },
  seedModalScoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  seedModalScoreLabel: { width: 60, fontSize: 13 },
  seedModalScoreTrack: { flex: 1, height: 6, borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  seedModalScoreFill: { height: '100%', borderRadius: 3 },
  seedModalScoreValue: { width: 30, fontSize: 12, textAlign: 'right' },
  seedModalBtn: { width: '100%', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  seedModalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  
  // Tags and advice
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  tagText: { fontSize: 13 },
  adviceItem: { flexDirection: 'row', marginBottom: 6 },
  adviceBullet: { marginRight: 8, fontSize: 14 },
  adviceText: { flex: 1, fontSize: 14 },
});
