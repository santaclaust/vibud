/**
 * 心芽启动屏 - 芽苗生长动画
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useTheme } from './hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SplashScreenProps {
  visible: boolean;
  onComplete: () => void;
}

export default function SplashScreen({ visible, onComplete }: SplashScreenProps) {
  const { colors } = useTheme();
  
  // 动画值
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  
  // 芽苗生长动画
  useEffect(() => {
    if (!visible) return;
    
    // 重置动画
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    textOpacity.setValue(0);
    loadingOpacity.setValue(0);
    
    // 动画序列
    const sequence = Animated.sequence([
      // 1. 种子出现 (0-300ms)
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      
      // 2. 种子发芽生长 (300-800ms)
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      
      // 3. 显示文字 (800-1000ms)
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      
      // 4. 显示加载条 (1000-1200ms)
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      
      // 5. 等待完成 (1200-2000ms)
      Animated.delay(800),
    ]);
    
    sequence.start(() => {
      onComplete();
    });
    
    return () => {
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
      textOpacity.stopAnimation();
      loadingOpacity.stopAnimation();
    };
  }, [visible]);
  
  // 种子样式
  const seedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };
  
  // 文字样式
  const titleStyle = {
    opacity: textOpacity,
    transform: [{
      translateY: textOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      }),
    }],
  };
  
  return (
    <View style={[styles.container, { backgroundColor: '#F8FFF8' }]}>
      {/* 种子/芽苗 */}
      <Animated.View style={[styles.seedContainer, seedStyle]}>
        {/* 种子 */}
        <Text style={styles.seed}>🌱</Text>
      </Animated.View>
      
      {/* 产品名 */}
      <Animated.View style={[styles.textContainer, titleStyle]}>
        <Text style={styles.title}>心芽</Text>
        <Text style={styles.subtitle}>治愈每一次心跳</Text>
      </Animated.View>
      
      {/* 加载条 */}
      <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
        <View style={styles.loadingBar}>
          <Animated.View style={styles.loadingProgress} />
        </View>
        <Text style={styles.loadingText}>正在准备温暖...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seedContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seed: {
    fontSize: 64,
  },
  textContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '600',
    color: '#2D5A3D',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8BA893',
    marginTop: 8,
    letterSpacing: 2,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  loadingBar: {
    width: 120,
    height: 3,
    backgroundColor: '#E0E8E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '60%',
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 12,
    color: '#8BA893',
    marginTop: 12,
  },
});