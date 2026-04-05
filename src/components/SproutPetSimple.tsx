/**
 * 心芽 - 植物宠物（简化版，无依赖）
 * 纯 React Native 实现，可直接使用
 * 如需 3D 版本需要安装 react-native-webview
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, PanResponder } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==============================================
// 配置
// ==============================================
const GROWTH_LEVELS = {
  1: { name: '嫩芽', size: 24 },
  2: { name: '幼苗', size: 32 },
  3: { name: '小盆栽', size: 40 },
  4: { name: '成长期', size: 48 },
  5: { name: '成熟期', size: 56 },
  6: { name: '开花', size: 64 },
  7: { name: '茂盛', size: 72 },
  8: { name: '繁花', size: 80 },
  9: { name: '精灵', size: 88 },
  10: { name: '守护神', size: 96 },
};

const MOOD_COLORS = {
  calm: '#4CAF50',    // 平静-绿
  happy: '#FFD700',   // 开心-金
  sad: '#6B8E9B',    // 忧郁-灰蓝
  energetic: '#FF6B35', // 活力-橙
};

// ==============================================
// 组件
// ==============================================
export default function SproutPet({ 
  userId = 'guest',
  growLevel = 1,
  mood = 'calm',
  onTap = () => {}, // 点击回调
}) {
  const pan = useRef(new Animated.ValueXY({ 
    x: SCREEN_WIDTH - 100, 
    y: 100 
  })).current;
  
  const bounce = useRef(new Animated.Value(1)).current;
  const blink = useRef(new Animated.Value(1)).current;
  
  // 拖拽
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.extractOffset();
      },
    })
  ).current;
  
  // 呼吸动画
  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    breathing.start();
    return () => breathing.stop();
  }, []);
  
  // 眨眼动画
  useEffect(() => {
    // 随机眨眼
    const interval = setInterval(() => {
      Animated.timing(blink, { toValue: 0.1, duration: 100, useNativeDriver: true }).start(() => {
        Animated.timing(blink, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      });
    }, 3000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);
  
  const config = GROWTH_LEVELS[growLevel] || GROWTH_LEVELS[1];
  const moodColor = MOOD_COLORS[mood] || MOOD_COLORS.calm;
  
  return (
    <Animated.View
      style={[
        styles.container,
        { 
          transform: [
            { translateX: pan.x }, 
            { translateY: pan.y },
            { scale: bounce },
          ] 
        }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.pet, { backgroundColor: moodColor }]}>
        <Animated.Text style={[styles.face, { opacity: blink }]}>
          {mood === 'happy' ? '😊' : mood === 'sad' ? '😢' : mood === 'energetic' ? '🔥' : '🌱'}
        </Animated.Text>
      </View>
      <Text style={styles.name}>{config.name}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 9999,
  },
  pet: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  face: {
    fontSize: 28,
  },
  name: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
});