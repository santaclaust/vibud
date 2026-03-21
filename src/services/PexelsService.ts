// Pexels API 服务 - 按五大类别严格过滤
const PEXELS_API_KEY = 'YFOPEfx9IhazmwzyOcLOhLZ1a5QloVDSZE9SCSFGZonS6dbrTpFhRW5C';
const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

// 已显示过的图片URL缓存（避免重复）
const shownImages = new Set<string>();
let imageCounter = 0;

// 五大类别固定关键词映射
const categoryKeywords: Record<string, string[]> = {
  '内观': ['peaceful', 'calm', 'serene', 'quiet', 'mind', 'heart'],
  '感悟': ['growth', 'light', 'hope', 'journey', 'time'],
  '陪伴': ['warm', 'love', 'gentle', 'soft', 'cozy'],
  '远眺': ['mountain', 'peak', 'sky', 'cloud', 'horizon'],
  '隐喻': ['nature', 'tree', 'ocean', 'wave', 'star'],
  'all': ['peaceful', 'calm', 'nature', 'beautiful'],
};

// 严格排除人像参数
const EXCLUDE_PERSON = '&exclude=people,person,face,portrait,selfie,model,woman,man,girl,boy,baby,child,adult,teenager,couple,group,team,family,friends,celebrity,actor,actress,fashion,beauty,makeup,hairstyle,glamour,pose,body,skin,eye,mouth,nose';

// 判断图片是否可能包含人脸
function isLikelyPerson(photo: any): boolean {
  const photographer = (photo.photographer || '').toLowerCase();
  
  // 时尚/人像摄影师
  const personPhotographers = ['fashion', 'portrait', 'model', 'studio', 'beauty'];
  if (personPhotographers.some(p => photographer.includes(p))) {
    return true;
  }
  
  // 尺寸过滤：排除1:1比例且尺寸<3000px的头像类图
  if (photo.width && photo.height) {
    const ratio = photo.width / photo.height;
    if (ratio > 0.8 && ratio < 1.2 && photo.width < 3000) {
      return true;
    }
  }
  
  return false;
}

// 随机打乱数组
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 根据签语文本和类别搜索图片
export async function searchImageByQuote(quoteText: string, category: string = 'all'): Promise<string | null> {
  try {
    // 获取类别关键词
    const catKeywords = categoryKeywords[category] || categoryKeywords['all'];
    
    // 搜索词组合：[签语关键词] + landscape/nature/scenery + high resolution + no people
    const searchWords = [
      ...catKeywords,
      'landscape', 'nature', 'scenery', 'high resolution', 'no people', 'minimalist', 'aesthetic'
    ].join(' ');
    
    // 获取80张以上以便筛选
    const response = await fetch(
      `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(searchWords)}&per_page=80&orientation=portrait&size=large${EXCLUDE_PERSON}`,
      {
        headers: { Authorization: PEXELS_API_KEY },
      }
    );

    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      // 严格过滤人像
      const filteredPhotos = data.photos.filter((photo: any) => {
        const url = photo.src?.large2x || photo.src?.large;
        // 排除已显示过的
        if (url && shownImages.has(url)) return false;
        // 排除可能的人物照
        if (isLikelyPerson(photo)) return false;
        return true;
      });
      
      // 随机打乱
      const shuffled = shuffleArray(filteredPhotos.length > 0 ? filteredPhotos : data.photos);
      
      // 选择第一张未显示过的
      for (const photo of shuffled) {
        const url = photo.src?.large2x || photo.src?.large;
        if (url && !shownImages.has(url)) {
          shownImages.add(url);
          imageCounter++;
          if (imageCounter > 100) {
            shownImages.clear();
            imageCounter = 0;
          }
          return url;
        }
      }
      
      // 都显示过了就清空重新开始
      shownImages.clear();
      imageCounter = 0;
      const randomPhoto = shuffled[0];
      const url = randomPhoto.src?.large2x || randomPhoto.src?.large;
      if (url) {
        shownImages.add(url);
        return url;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to search image:', error);
    return null;
  }
}

// 随机获取图片
export async function getRandomImage(category: string = 'all'): Promise<string | null> {
  try {
    const catKeywords = categoryKeywords[category] || categoryKeywords['all'];
    const searchWords = [
      ...catKeywords,
      'landscape', 'nature', 'high resolution', 'no people', 'minimalist'
    ].join(' ');
    
    const response = await fetch(
      `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(searchWords)}&per_page=80&orientation=portrait&size=large${EXCLUDE_PERSON}`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      const filteredPhotos = data.photos.filter((photo: any) => {
        const url = photo.src?.large2x || photo.src?.large;
        if (url && shownImages.has(url)) return false;
        if (isLikelyPerson(photo)) return false;
        return true;
      });
      
      const shuffled = shuffleArray(filteredPhotos.length > 0 ? filteredPhotos : data.photos);
      
      for (const photo of shuffled) {
        const url = photo.src?.large2x || photo.src?.large;
        if (url && !shownImages.has(url)) {
          shownImages.add(url);
          return url;
        }
      }
      
      const randomPhoto = shuffled[0];
      return randomPhoto.src?.large2x || randomPhoto.src?.large;
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
    const catKeywords = categoryKeywords[category] || categoryKeywords['all'];
    const searchWords = [...catKeywords, 'landscape', 'nature', 'high resolution'].join(' ');
    
    const response = await fetch(
      `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(searchWords)}&per_page=${count * 3}&orientation=portrait&size=large${EXCLUDE_PERSON}`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      const filtered = data.photos.filter((photo: any) => !isLikelyPerson(photo));
      const shuffled = shuffleArray(filtered.length > 0 ? filtered : data.photos);
      return shuffled
        .slice(0, count)
        .map((photo: any) => photo.src?.large2x || photo.src?.large)
        .filter(Boolean);
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
