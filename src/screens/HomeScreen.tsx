import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, ScrollView, Image, ActivityIndicator, Alert, Modal, Pressable } from 'react-native';
import { getTodayQuote, getQuotesByCategory, Quote } from '../data/quotes';
import { searchImage, getCurrentImageSource, toggleImageSource, ImageSource, preloadImages, getNextImage } from '../services/ImageSourceManager';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../services/ThemeManager';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import logger from '../services/Logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const categories = [
  { id: 'all', name: '全部' },
  { id: '内观', name: '内观' },
  { id: '感悟', name: '感悟' },
  { id: '陪伴', name: '陪伴' },
  { id: '远眺', name: '远眺' },
  { id: '隐喻', name: '隐喻' },
];

const calculateTagSize = () => {
  const padding = 16 * 2;
  const gap = 10 * 5;
  const availableWidth = SCREEN_WIDTH - 40 - padding - gap;
  const tagWidth = availableWidth / categories.length;
  return { width: Math.floor(tagWidth), height: 36, fontSize: 14 };
};

const getThemeIcon = (mode: ThemeMode): string => {
  switch (mode) {
    case 'light': return '☀️';
    case 'dark': return '🌙';
    case 'system': return '⚙️';
  }
};

export default function HomeScreen({ navigation, menuVisible, colors: propsColors, themeMode: propsThemeMode, onThemeChange }: any) {
  // 使用 Hook 管理主题
  const { mode, cycle } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentQuote, setCurrentQuote] = useState<Quote>(getTodayQuote());
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageSource, setImageSource] = useState<ImageSource>('pexels');
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  
  // 优先使用props传递的colors，否则使用Hook的colors
  const colors = propsColors || { background: '#F9F9F9', surface: '#FFFFFF', text: '#333333', textSecondary: '#666666', border: '#E0E0E0', primary: '#4A90E2', card: '#FFFFFF' };
  const isDark = mode === 'dark';
  
  // 手势相关
  const lastY = useRef(0);
  const lastX = useRef(0);
  const isSwiping = useRef(false);
  
  const tagSize = useMemo(() => calculateTagSize(), []);

  // 加载图片（优先用缓存）
  const loadImage = useCallback(async (quote: Quote, category: string) => {
    setImageLoading(true);
    const source = getCurrentImageSource();
    setImageSource(source);
    
    // Pexels 模式：先尝试从缓存获取
    let imageUrl: string | null = null;
    if (source === 'pexels') {
      imageUrl = getNextImage();
    }
    
    // 缓存没有再请求 API
    if (!imageUrl) {
      imageUrl = await searchImage(quote.text, category);
      // 同时预加载后续图片
      if (imageUrl) {
        preloadImages(category, 3);
      }
    }
    
    setBgImage(imageUrl);
    setImageLoading(false);
  }, []);

  // 获取同类别随机签语（确保不重复）
  const getRandomQuoteInCategory = useCallback((category: string, currentQuoteText?: string): Quote => {
    if (category === 'all') {
      const quote = getTodayQuote();
      // 如果是同一个，回退到另一个
      if (quote.text === currentQuoteText && currentQuoteText) {
        const allQuotes = require('../data/quotes').quotes;
        const filtered = allQuotes.filter((q: Quote) => q.text !== currentQuoteText);
        if (filtered.length > 0) {
          return filtered[Math.floor(Math.random() * filtered.length)];
        }
      }
      return quote;
    }
    const categoryQuotes = getQuotesByCategory(category);
    if (categoryQuotes.length > 0) {
      // 过滤掉当前签语，确保换一张
      const filtered = categoryQuotes.filter((q: Quote) => q.text !== currentQuoteText);
      const pool = filtered.length > 0 ? filtered : categoryQuotes;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return getTodayQuote();
  }, []);

  // 切换到下一类别（循环）
  const goToNextCategory = useCallback(() => {
    const currentIndex = categories.findIndex(c => c.id === selectedCategory);
    const nextIndex = (currentIndex + 1) % categories.length;
    const nextCat = categories[nextIndex];
    setSelectedCategory(nextCat.id);
    const newQuote = getRandomQuoteInCategory(nextCat.id, currentQuote.text);
    setCurrentQuote(newQuote);
    loadImage(newQuote, nextCat.id);
  }, [selectedCategory, currentQuote, getRandomQuoteInCategory, loadImage]);

  // 切换到上一类别（循环）
  const goToPrevCategory = useCallback(() => {
    const currentIndex = categories.findIndex(c => c.id === selectedCategory);
    const prevIndex = (currentIndex - 1 + categories.length) % categories.length;
    const prevCat = categories[prevIndex];
    setSelectedCategory(prevCat.id);
    const newQuote = getRandomQuoteInCategory(prevCat.id, currentQuote.text);
    setCurrentQuote(newQuote);
    loadImage(newQuote, prevCat.id);
  }, [selectedCategory, currentQuote, getRandomQuoteInCategory, loadImage]);

  // 上下滑动 - 更换同类签语和图片
  const handleVerticalSwipe = useCallback((dy: number) => {
    if (Math.abs(dy) > 30) {
      // 上下滑 - 换一个新的签语
      const newQuote = getRandomQuoteInCategory(selectedCategory, currentQuote.text);
      setCurrentQuote(newQuote);
      loadImage(newQuote, selectedCategory);
    }
  }, [selectedCategory, currentQuote, getRandomQuoteInCategory, loadImage]);

  // 左右滑动 - 更换类别
  const handleHorizontalSwipe = useCallback((dx: number) => {
    if (Math.abs(dx) > 30) {
      if (dx < 0) {
        // 向左滑 - 下一类别
        goToNextCategory();
      } else {
        // 向右滑 - 上一类别
        goToPrevCategory();
      }
    }
  }, [goToNextCategory, goToPrevCategory]);

  // 处理手势开始
  const handleTouchStart = (event: any) => {
    lastY.current = event.nativeEvent.touches[0].pageY;
    lastX.current = event.nativeEvent.touches[0].pageX;
    isSwiping.current = false;
  };

  // 处理手势移动
  const handleTouchMove = (event: any) => {
    const currentY = event.nativeEvent.touches[0].pageY;
    const currentX = event.nativeEvent.touches[0].pageX;
    const dy = currentY - lastY.current;
    const dx = currentX - lastX.current;
    
    // 超过阈值才算滑动
    if (Math.abs(dy) > 10 || Math.abs(dx) > 10) {
      isSwiping.current = true;
    }
  };

  // 处理手势结束
  const handleTouchEnd = (event: any) => {
    const endY = event.nativeEvent.changedTouches[0].pageY;
    const endX = event.nativeEvent.changedTouches[0].pageX;
    const dy = endY - lastY.current;
    const dx = endX - lastX.current;
    
    if (isSwiping.current) {
      // 判断是水平还是垂直滑动
      if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动 - 换类别
        handleHorizontalSwipe(dx);
      } else {
        // 垂直滑动 - 换签语
        handleVerticalSwipe(dy);
      }
    }
    isSwiping.current = false;
  };

  // 长按开始
  const handleLongPress = () => {
    setIsLongPressing(true);
    setTimeout(() => {
      setShowImageMenu(true);
    }, 300);
  };

  // 长按结束
  const handlePressOut = () => {
    setIsLongPressing(false);
  };

  // 保存图片到相册
  const saveImage = async () => {
    if (!bgImage) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', '请允许访问相册以保存图片');
        return;
      }
      
      const filename = 'xinya_' + Date.now() + '.jpg';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileUri = ((FileSystem as any).documentDirectory || '') + filename;
      
      // 下载图片
      const downloadResult = await FileSystem.downloadAsync(bgImage, fileUri);
      
      // 保存到相册
      await MediaLibrary.createAssetAsync(downloadResult.uri);
      
      Alert.alert('保存成功', '图片已保存到相册');
    } catch (error) {
      console.error('保存图片失败:', error);
      Alert.alert('保存失败', '无法保存图片');
    }
    setShowImageMenu(false);
  };

  // 设置桌面壁纸
  const setWallpaper = async (type: 'home' | 'lock') => {
    if (!bgImage) return;
    Alert.alert('提示', '桌面壁纸功能需要原生模块支持，请在App中实现');
    setShowImageMenu(false);
  };

  // 切换分类
  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    const newQuote = getRandomQuoteInCategory(categoryId);
    setCurrentQuote(newQuote);
    await loadImage(newQuote, categoryId);
  };

  // 切换图片源
  const handleToggleImageSource = async () => {
    toggleImageSource();
    const newSource = getCurrentImageSource();
    setImageSource(newSource);
    await loadImage(currentQuote, selectedCategory);
  };

  // 获取图片源显示名称
  const getSourceDisplayName = (source: ImageSource): string => {
    switch (source) {
      case 'pexels': return '📸 Pexels';
      case 'pixabay': return '🖼️ Pixabay';
      case 'lorempicsum': return '🎲 LP';
      default: return source;
    }
  };

  // 切换主题
  const handleToggleTheme = async () => {
    const newMode = await cycle();
    if (onThemeChange) {
      onThemeChange(newMode);
    }
  };

  // 初始加载
  useEffect(() => {
    const init = async () => {
      setImageLoading(true);
      const quote = getTodayQuote();
      setCurrentQuote(quote);
      const imageUrl = await searchImage(quote.text, 'all');
      setBgImage(imageUrl);
      setImageLoading(false);
    };
    init();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* 顶部导航 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.centerButtons}>
          <TouchableOpacity 
            style={[styles.sourceButton, imageSource === 'pexels' && styles.sourceButtonActive]}
            onPress={handleToggleImageSource}
          >
            <Text style={[styles.sourceButtonText, imageSource === 'pexels' && styles.sourceButtonTextActive]}>
              pexels
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sourceButton, imageSource === 'pixabay' && styles.sourceButtonActive]}
            onPress={handleToggleImageSource}
          >
            <Text style={[styles.sourceButtonText, imageSource === 'pixabay' && styles.sourceButtonTextActive]}>
              pixabay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sourceButton, imageSource === 'lorempicsum' && styles.sourceButtonActive]}
            onPress={handleToggleImageSource}
          >
            <Text style={[styles.sourceButtonText, imageSource === 'lorempicsum' && styles.sourceButtonTextActive]}>
              LP
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={[styles.themeButton, { backgroundColor: colors.card }]} onPress={handleToggleTheme}>
          <Text style={styles.themeButtonText}>{getThemeIcon(mode)}</Text>
        </TouchableOpacity>
      </View>

      {/* Logo标题 */}
      <View style={[styles.logoRow, { backgroundColor: colors.surface }]}>
        <Text style={[styles.logo, { color: colors.text }]}>🌱 心芽</Text>
      </View>

      {/* 内容区域 - 添加手势 */}
      <Pressable
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
        style={styles.contentArea}
      >
        {/* 签语展示 */}
        <View style={[styles.quoteCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.quoteText, { color: colors.text }]}>{currentQuote.text}</Text>
        </View>

        {/* 图片展示 */}
        {imageLoading ? (
          <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {getSourceDisplayName(imageSource)}
            </Text>
          </View>
        ) : bgImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: bgImage }} style={styles.backgroundImage} resizeMode="cover" />
            <View style={styles.sourceTag}>
              <Text style={styles.sourceTagText}>{getSourceDisplayName(imageSource)}</Text>
            </View>
            {/* 长按提示 */}
            {isLongPressing && (
              <View style={styles.longPressHint}>
                <Text style={styles.longPressHintText}>长按设置壁纸</Text>
              </View>
            )}
          </View>
        ) : null}
      </Pressable>

      {/* 图片操作菜单 */}
      <Modal visible={showImageMenu} transparent animationType="fade" onRequestClose={() => setShowImageMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowImageMenu(false)}>
          <View style={styles.imageMenuCard}>
            <Text style={styles.imageMenuTitle}>图片操作</Text>
            <TouchableOpacity style={styles.imageMenuItem} onPress={() => setWallpaper('home')}>
              <Text style={styles.imageMenuIcon}>🖥️</Text>
              <Text style={styles.imageMenuText}>设为桌面壁纸</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageMenuItem} onPress={() => setWallpaper('lock')}>
              <Text style={styles.imageMenuIcon}>🔒</Text>
              <Text style={styles.imageMenuText}>设为锁屏壁纸</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageMenuItem} onPress={saveImage}>
              <Text style={styles.imageMenuIcon}>💾</Text>
              <Text style={styles.imageMenuText}>保存到相册</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageMenuCancel} onPress={() => setShowImageMenu(false)}>
              <Text style={styles.imageMenuCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  centerButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  sourceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
  },
  sourceButtonActive: {
    backgroundColor: '#4A90E2',
  },
  sourceButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sourceButtonTextActive: {
    color: '#FFF',
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 18,
  },
  logoRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  logo: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  contentArea: {
    flex: 1,
  },
  quoteCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 24,
    paddingVertical: 30,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quoteText: {
    fontSize: 20,
    lineHeight: 32,
    textAlign: 'center',
    fontFamily: 'PingFang SC',
    includeFontPadding: false,
    paddingHorizontal: 8,
  },
  imageContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 60, // 为 Tab Bar 留空间，衔接
    flex: 1,
    minHeight: 200,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: { width: '100%', height: '100%', borderTopLeftRadius: 15, borderTopRightRadius: 15, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  loadingText: { marginTop: 12, fontSize: 14 },
  sourceTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceTagText: { color: '#FFF', fontSize: 12 },
  longPressHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  longPressHintText: { color: '#FFF', fontSize: 12 },
  categoryRow: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 14, marginBottom: 12 },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryTag: {
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTagText: { fontWeight: '500' },
  categoryTagTextActive: { color: '#FFF' },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageMenuCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  imageMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  imageMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  imageMenuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  imageMenuText: {
    fontSize: 16,
    color: '#333',
  },
  imageMenuCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  imageMenuCancelText: {
    fontSize: 16,
    color: '#999',
  },
});
