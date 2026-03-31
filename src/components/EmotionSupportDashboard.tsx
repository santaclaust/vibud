import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import useEmotionSupport from '../hooks/useEmotionSupport';

/**
 * AI情绪疏导效能评估仪表板
 * 实时监控和展示AI回答效能指标
 */
const EmotionSupportDashboard = () => {
  const [showReport, setShowReport] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(0);
  
  const {
    isInitialized,
    isLoading,
    error,
    conversationHistory,
    startNewConversation,
    generateResponse,
    endConversation,
    getPerformanceScore,
    generateReport
  } = useEmotionSupport({
    satisfactionSurveyRate: 0.1,
    targetSatisfaction: 4.2,
    targetNaturalness: 4.5,
    targetDuration: 8,
    targetRepeatRate: 0.35
  });

  useEffect(() => {
    if (isInitialized) {
      // 开始新对话用于演示
      startNewConversation();
    }
  }, [isInitialized, startNewConversation]);

  const handleEndConversation = async () => {
    // 模拟用户反馈（实际项目中通过UI收集）
    const userFeedback = Math.floor(Math.random() * 5) + 1; // 1-5随机评分
    
    await endConversation(userFeedback);
    
    // 获取并显示性能评分
    const score = getPerformanceScore();
    setPerformanceScore(score);
    
    // 生成报告
    const report = generateReport();
    console.log('评估报告:', report);
    setShowReport(true);
    
    Alert.alert('对话结束', `效能评分: ${score.toFixed(2)}/5.0`);
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text>加载AI情绪疏导服务...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AI情绪疏导效能仪表板</Text>
      
      {/* 核心指标卡片 */}
      <View style={styles.metricsContainer}>
        <MetricCard 
          title="综合评分" 
          value={`${performanceScore.toFixed(2)}/5.0`}
          target="4.0+"
          achieved={performanceScore >= 4.0}
        />
        
        <MetricCard 
          title="对话轮次" 
          value={conversationHistory.length.toString()}
          target="5+"
          achieved={conversationHistory.length >= 5}
        />
        
        <MetricCard 
          title="当前状态" 
          value={isLoading ? "处理中..." : "就绪"}
          target="就绪"
          achieved={!isLoading}
        />
      </View>

      {/* 对话历史 */}
      <View style={styles.conversationContainer}>
        <Text style={styles.sectionTitle}>对话历史</Text>
        {conversationHistory.map((entry, index) => (
          <View key={index} style={styles.messagePair}>
            <Text style={styles.userMessage}>你: {entry.user}</Text>
            <Text style={styles.aiMessage}>AI: {entry.ai}</Text>
          </View>
        ))}
      </View>

      {/* 操作按钮 */}
      <View style={styles.buttonContainer}>
        <Text 
          style={styles.endButton} 
          onPress={handleEndConversation}
        >
          结束对话并生成报告
        </Text>
        
        {showReport && (
          <View style={styles.reportContainer}>
            <Text style={styles.reportTitle}>效能评估报告</Text>
            <Text>综合评分: {performanceScore.toFixed(2)}/5.0</Text>
            <Text>建议: {performanceScore >= 4.0 ? "表现优秀！" : "有提升空间"}</Text>
          </View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
};

const MetricCard = ({ title, value, target, achieved }: { 
  title: string; 
  value: string; 
  target: string;
  achieved: boolean;
}) => (
  <View style={[styles.metricCard, achieved ? styles.metricCardSuccess : styles.metricCardWarning]}>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTarget}>目标: {target}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  metricCard: {
    padding: 15,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center'
  },
  metricCardSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb'
  },
  metricCardWarning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7'
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745'
  },
  metricTarget: {
    fontSize: 12,
    color: '#6c757d'
  },
  conversationContainer: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  messagePair: {
    marginBottom: 10
  },
  userMessage: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5
  },
  aiMessage: {
    backgroundColor: '#f1f8e9',
    padding: 10,
    borderRadius: 8
  },
  buttonContainer: {
    alignItems: 'center'
  },
  endButton: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10
  },
  reportContainer: {
    backgroundColor: '#e9ecef',
    padding: 15,
    borderRadius: 8,
    marginTop: 10
  },
  reportTitle: {
    fontWeight: 'bold',
    marginBottom: 5
  },
  error: {
    color: 'red',
    marginTop: 10
  }
});

export default EmotionSupportDashboard;
