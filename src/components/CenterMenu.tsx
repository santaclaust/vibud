import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Modal, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  withSequence,
  Easing
} from 'react-native-reanimated';

interface MenuOption {
  id: string;
  icon: string;
  name: string;
  color: string;
  position: 'left' | 'center' | 'right';
}

const menuOptions: MenuOption[] = [
  { id: 'treehole', icon: '🌲', name: '树洞', color: '#27AE60', position: 'left' },
  { id: 'confession', icon: '💬', name: '倾诉', color: '#4A90E2', position: 'center' },
  { id: 'timemachine', icon: '📮', name: '时光机', color: '#E67E22', position: 'right' },
];

// 单个悬浮图标组件
function FloatingButton({ option, isVisible, onPress }: { option: MenuOption; isVisible: boolean; onPress: () => void }) {
  const progress = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      progress.value = withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.back(0.5))
      });

      setTimeout(() => {
        floatY.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );
      }, 1000);
    } else {
      progress.value = 0;
      floatY.value = 0;
    }
  }, [isVisible]);

  const getPosition = (pos: string) => {
    if (pos === 'left') return { x: -30, y: -15 };
    if (pos === 'right') return { x: 30, y: -15 };
    return { x: 0, y: -50 };
  };

  const offset = getPosition(option.position);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: offset.x * progress.value },
      { translateY: offset.y * progress.value + floatY.value },
      { scale: progress.value }
    ]
  }));

  return (
    <Animated.View style={[styles.menuItem, animatedStyle]}>
      <TouchableOpacity
        style={[styles.menuButton, { backgroundColor: option.color }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.menuIcon}>{option.icon}</Text>
      </TouchableOpacity>
      <Text style={styles.menuLabel}>{option.name}</Text>
    </Animated.View>
  );
}

export default function CenterMenu({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (id: string) => void }) {
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowButtons(true);
    } else {
      setTimeout(() => setShowButtons(false), 300);
    }
  }, [visible]);

  if (!visible && !showButtons) return null;

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HEADER_HEIGHT = 44; // 顶部按钮栏高度
  const TAB_BAR_HEIGHT = 55; // Tab Bar高度
  const BLUR_TOP = HEADER_HEIGHT;
  const BLUR_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - TAB_BAR_HEIGHT;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* 毛玻璃背景层 - 不包含顶部44px和底部Tab Bar */}
      <View style={styles.blurContainer}>
        <View style={[styles.blurWrapper, { top: BLUR_TOP, height: BLUR_HEIGHT }]}>
          <BlurView
            style={styles.blurView}
            tint="light"
            intensity={80}
          />
        </View>
      </View>
      
      {/* 点击空白关闭 */}
      <Pressable style={styles.clickArea} onPress={onClose} />

      {/* 扇形菜单 */}
      <View style={styles.menuContainer}>
        {menuOptions.map((option) => (
          <FloatingButton 
            key={option.id}
            option={option}
            isVisible={visible}
            onPress={() => { 
              onSelect(option.id); 
              onClose(); 
            }} 
          />
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  blurWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  blurView: {
    flex: 1,
  },
  clickArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  menuItem: {
    alignItems: 'center',
    marginHorizontal: 6,
  },
  menuButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  menuIcon: {
    fontSize: 26,
  },
  menuLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
});
