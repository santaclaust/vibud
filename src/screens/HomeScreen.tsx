import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, ScrollView, Image, ActivityIndicator } from 'react-native';
import { getTodayQuote, getQuotesByCategory, Quote } from '../data/quotes';
import { getRandomImage, searchImageByQuote } from '../services/PexelsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const categories = [
  { id: 'all', name: '全部' },
  { id: '内观', name: '内观' },
  { id: '感悟', name: '感悟' },
  { id: '陪伴', name: '陪伴' },
  { id: '远眺', name: '远眺' },
  { id: '隐喻', name: '隐喻' },
];

// 根据屏幕宽度计算标签大小
const calculateTagSize = () => {
  const padding = 16 * 2;
  const gap = 10 * 5;
  const availableWidth = SCREEN_WIDTH - 40 - padding - gap;
  const tagWidth = availableWidth / categories.length;
  return {
    width: Math.floor(tagWidth),
    height: 36,
    fontSize: 14,
  };
};

export default function HomeScreen({ navigation, menuVisible }: any) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentQuote, setCurrentQuote] = useState<Quote>(getTodayQuote());
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  const tagSize = useMemo(() => calculateTagSize(), []);
  
  // 切换分类时更新签语和图片
  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setImageLoading(true);
    
    let newQuote: Quote;
    
    // 更新签语
    if (categoryId === 'all') {
      newQuote = getTodayQuote();
    } else {
      const categoryQuotes = getQuotesByCategory(categoryId);
      if (categoryQuotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * categoryQuotes.length);
        newQuote = categoryQuotes[randomIndex];
      } else {
        newQuote = getTodayQuote();
      }
    }
    
    setCurrentQuote(newQuote);
    
    // 用签语文本搜索匹配的图片
    const imageUrl = await searchImageByQuote(newQuote.text, categoryId);
    setBgImage(imageUrl);
    setImageLoading(false);
  };
  
  // 初始加载图片
  useEffect(() => {
    const loadInitialImage = async () => {
      setImageLoading(true);
      const quote = getTodayQuote();
      const imageUrl = await searchImageByQuote(quote.text, 'all');
      setBgImage(imageUrl);
      setImageLoading(false);
    };
    loadInitialImage();
  }, []);

  const displayQuote = currentQuote;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />
      
      {/* 顶部导航 */}
      <View style={styles.header}>
        <Text style={styles.logo}>🌱 心芽</Text>
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      {/* 内容区域 */}
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 签语展示 */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText} numberOfLines={1}>{displayQuote.text}</Text>
        </View>

        {/* 图片展示 */}
        {imageLoading ? (
          <View style={styles.imageContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        ) : bgImage ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: bgImage }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* 分类选择 */}
        <View style={styles.categoryRow}>
          <Text style={styles.sectionTitle}>选择你的心情</Text>
          <View style={styles.categoryTags}>
            {categories.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={[
                  styles.categoryTag,
                  { 
                    minWidth: tagSize.width,
                    height: tagSize.height,
                    paddingHorizontal: 8,
                  },
                  selectedCategory === cat.id && styles.categoryTagActive
                ]}
                onPress={() => handleCategoryChange(cat.id)}
              >
                <Text style={[
                  styles.categoryTagText,
                  { fontSize: tagSize.fontSize },
                  selectedCategory === cat.id && styles.categoryTagTextActive
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(249, 249, 249, 0.9)',
  },
  logo: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  searchIcon: {
    fontSize: 18,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  quoteCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    paddingVertical: 40,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quoteText: {
    fontSize: 20,
    lineHeight: 28,
    color: '#333',
    textAlign: 'center',
    fontFamily: 'PingFang SC',
    includeFontPadding: false,
  },
  imageContainer: {
    width: '100%',
    flex: 1,
    minHeight: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#F5F5F5',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  categoryRow: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryTag: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTagActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  categoryTagText: {
    color: '#666',
  },
  categoryTagTextActive: {
    color: '#FFF',
  },
});
