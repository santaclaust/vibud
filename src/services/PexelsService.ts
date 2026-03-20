// Pexels API 服务
const PEXELS_API_KEY = 'YFOPEfx9IhazmwzyOcLOhLZ1a5QloVDSZE9SCSFGZonS6dbrTpFhRW5C';
const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

// 根据心情分类映射搜索关键词（情感化、避免人像、印象派/蜡笔风格）
const categoryKeywords: Record<string, string[]> = {
  'all': ['soft pastel abstract', 'gentle texture', 'dreamy watercolor', 'impressionist sky'],
  '内观': ['meditation atmosphere', 'inner peace', 'calm mindfulness', 'soft shadow', 'solitude mood'],
  '感悟': ['warm sunrise feelings', 'soft light hope', 'tender growth', 'grateful heart', 'gentle morning'],
  '陪伴': ['soft warmth', 'gentle connection', 'caring heart', 'loving kindness', 'cozy feeling'],
  '远眺': ['vast horizon soft', 'distant mountains misty', 'ethereal sky', 'dreamy landscape', 'soft horizon'],
  '隐喻': ['impressionist painting', 'soft abstract art', 'blurred beauty', 'pastel tones', 'ethereal art'],
};

// 根据签语文本提取关键词搜索
export async function searchImageByQuote(quoteText: string, category: string = 'all'): Promise<string | null> {
  try {
    // 从签语文本中提取关键词（取前几个关键词）
    const textKeywords = extractKeywordsFromQuote(quoteText);
    
    // 合并心情分类的关键词
    const categoryWords = categoryKeywords[category] || categoryKeywords['all'];
    
    // 组合搜索词：签语关键词 + 风格 + 避免人像和器官特写
    const searchWords = [
      ...textKeywords.slice(0, 2),
      ...categoryWords.slice(0, 2),
      'soft', 'pastel', 'dreamy', 'abstract', 'texture'
    ];
    
    // 排除人物和器官特写
    const excludeTerms = '&exclude=people,person,face,eye,hand,body,skin,human';
    
    const keyword = searchWords.join(' ');
    
    const response = await fetch(
      `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(keyword)}&per_page=25&orientation=portrait&size=large`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      // 选择高像素图片
      const validPhotos = data.photos.filter((photo: any) => {
        return (photo.width || 0) >= 2000 && (photo.height || 0) >= 2000;
      });
      
      if (validPhotos.length > 0) {
        const randomIndex = Math.floor(Math.random() * validPhotos.length);
        return validPhotos[randomIndex].src.large2x || validPhotos[randomIndex].src.large;
      }
      
      // 回退
      const randomIndex = Math.floor(Math.random() * data.photos.length);
      return data.photos[randomIndex].src.large2x || data.photos[randomIndex].src.large;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to search image:', error);
    return null;
  }
}

// 从签语文本提取关键词
function extractKeywordsFromQuote(text: string): string[] {
  // 定义情感关键词库
  const emotionWords: Record<string, string[]> = {
    '温暖': ['warm', 'gentle', 'soft'],
    '阳光': ['sunshine', 'sunlight', 'golden'],
    '希望': ['hope', 'light', 'bright'],
    '爱': ['love', 'heart', 'caring'],
    '陪伴': ['together', 'companion', 'support'],
    '力量': ['strength', 'power', 'brave'],
    '平静': ['peace', 'calm', 'serene'],
    '成长': ['growth', 'bloom', 'flourish'],
    '未来': ['future', 'horizon', 'distant'],
    '过去': ['memory', 'nostalgia', 'past'],
    '眼泪': ['tear', 'rain', 'emotion'],
    '笑': ['smile', 'joy', 'happy'],
    '星星': ['star', 'night', 'twinkle'],
    '月亮': ['moon', 'night', 'peaceful'],
    '大海': ['sea', 'ocean', 'vast'],
    '山': ['mountain', 'peak', 'majestic'],
    '花': ['flower', 'bloom', 'petal'],
    '树': ['tree', 'nature', 'green'],
    '水': ['water', 'flow', 'peace'],
    '风': ['wind', 'breeze', 'free'],
    '云': ['cloud', 'sky', 'dreamy'],
    '光': ['light', 'glow', 'shine'],
    '梦': ['dream', 'fantasy', 'wish'],
    '心': ['heart', 'soul', 'feeling'],
    '自己': ['self', 'inner', 'soul'],
    '时间': ['time', 'moment', 'memory'],
    '路': ['path', 'journey', 'road'],
  };
  
  const keywords: string[] = [];
  
  // 遍历情感词库，匹配签语文本
  for (const [chinese, english] of Object.entries(emotionWords)) {
    if (text.includes(chinese)) {
      keywords.push(...english);
    }
  }
  
  // 如果没有匹配，返回默认情感词
  if (keywords.length === 0) {
    keywords.push('soft', 'gentle', 'emotional', 'peaceful');
  }
  
  return [...new Set(keywords)]; // 去重
}
export async function getRandomImage(category: string = 'all'): Promise<string | null> {
  try {
    const keywords = categoryKeywords[category] || categoryKeywords['all'];
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    
    // 添加参数避免人像和器官，高像素，印象派/蜡笔风格
    const excludeTerms = '&exclude=people,person,face,eye,hand,body,skin,human,portrait,selfie';
    const response = await fetch(
      `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(keyword)}&per_page=20&orientation=portrait&size=large${excludeTerms}`, 
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      // 过滤掉包含人物的图片，选择高像素的
      const validPhotos = data.photos.filter((photo: any) => {
        const width = photo.width || 0;
        const height = photo.height || 0;
        // 选择像素较高的图片
        return width >= 2000 && height >= 2000;
      });
      
      if (validPhotos.length > 0) {
        const randomIndex = Math.floor(Math.random() * validPhotos.length);
        return validPhotos[randomIndex].src.large2x || validPhotos[randomIndex].src.large;
      }
      
      // 如果没有符合条件的，回退到任意图片
      if (data.photos.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.photos.length);
        return data.photos[randomIndex].src.large2x || data.photos[randomIndex].src.large;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch image:', error);
    return null;
  }
}

// 预加载多张图片
export async function preloadImages(category: string = 'all', count: number = 5): Promise<string[]> {
  try {
    const keywords = categoryKeywords[category] || categoryKeywords['all'];
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    
    const response = await fetch(
      `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(keyword)}&per_page=${count}&orientation=portrait&size=large`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      return data.photos
        .filter((photo: any) => (photo.width || 0) >= 1500)
        .map((photo: any) => photo.src.large2x || photo.src.large)
        .slice(0, count);
    }
    
    return [];
  } catch (error) {
    console.error('Failed to preload images:', error);
    return [];
  }
}

export default {
  getRandomImage,
  preloadImages,
};
