/**
 * 心芽启动屏 - 芽苗生长动画
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ICON_SIZE = 80;
const SEED_TOP = SCREEN_HEIGHT * 0.382 - ICON_SIZE;

interface SplashScreenProps {
  visible: boolean;
  onComplete: () => void;
  style?: any;
}

export default function SplashScreen({ visible, onComplete, style }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  const seedScale = useRef(new Animated.Value(0)).current;
  const seedOpacity = useRef(new Animated.Value(0)).current;
  const seedTranslateY = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textGap = useRef(new Animated.Value(16)).current;
  
  useEffect(() => {
    if (!visible || isFadingOut) return;
    
    seedScale.setValue(0);
    seedOpacity.setValue(0);
    seedTranslateY.setValue(0);
    textOpacity.setValue(0);
    textGap.setValue(16);
    
    // 阶段1: 种子出现 scale + 上浮 (0-1200ms)
    Animated.parallel([
      Animated.timing(seedScale, { toValue: 1.6, duration: 1200, easing: Easing.out(Easing.back(1.5)), useNativeDriver: false }),
      Animated.timing(seedOpacity, { toValue: 1, duration: 1200, useNativeDriver: false }),
      Animated.timing(seedTranslateY, { toValue: -4, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(textGap, { toValue: 24, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start(() => {
      // 呼吸循环
      const anim = seedTranslateY;
      const runBreathing = () => {
        Animated.timing(anim, { toValue: -9, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }).start(() => {
          Animated.timing(anim, { toValue: -4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }).start(() => runBreathing());
        });
      };
      runBreathing();
      
      // 文字淡入
      Animated.timing(textOpacity, { toValue: 1, duration: 1000, useNativeDriver: false }).start(() => {
        // 动画完成后等待1.5秒，然后开始淡出
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            onComplete();
          }, 1000);
        }, 1500);
      });
    });
    
    return () => {
      seedScale.stopAnimation();
      seedOpacity.stopAnimation();
      seedTranslateY.stopAnimation();
      textOpacity.stopAnimation();
      textGap.stopAnimation();
    };
  }, [visible, isFadingOut]);
  
  const seedStyle = {
    transform: [{ scale: seedScale }, { translateY: seedTranslateY }],
    opacity: seedOpacity,
  };
  
  const textTop = SEED_TOP + ICON_SIZE + 80;
  
  if (!visible) {
    return null;
  }
  
  // 使用 CSS 过渡来实现淡出效果
  const containerStyle = isFadingOut ? [styles.container, styles.fadeOut, style] : [styles.container, style];
  
  return (
    <View style={containerStyle}>
      <Animated.View style={[styles.seedContainer, { top: SEED_TOP }, seedStyle]}>
        <Text style={styles.seed}>🌱</Text>
      </Animated.View>
      
      <View style={[styles.textContainer, { top: textTop }]}>
        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={styles.title}>心芽</Text>
          <Text style={styles.subtitle}>倾听每一次心跳</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FFF8',
    zIndex: 1000,
  },
  fadeOut: {
    opacity: 0,
    transition: 'opacity 1000ms ease-out',
  },
  seedContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seed: { fontSize: ICON_SIZE, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 6 },
  textContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  title: { fontSize: 42, fontWeight: '500', color: '#2D5A3D', letterSpacing: 10, textShadowColor: 'rgba(45, 90, 61, 0.3)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 5, textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '300', color: '#94A3A8', marginTop: 16, letterSpacing: 6, textAlign: 'center' },
});