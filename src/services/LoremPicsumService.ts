// Lorem Picsum 图片服务 - 随机图片
// 官网: https://picsum.photos/
// 优化：使用随机 ID 直接获取，比 API 列表更快

// 已显示过的图片ID缓存
const shownImageIds = new Set<string>();
let imageIdCounter = 0;

// 最大图片 ID (根据 Lorem Picsum 实际图片数量)
const MAX_IMAGE_ID = 1337;

// 随机打乱数组
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 获取随机图片 URL - 直接用随机 ID，速度最快
export async function getRandomImage(width: number = 1080, height: number = 1920): Promise<string | null> {
  try {
    // 直接生成随机 ID，避免 API 调用
    let randomId: number;
    let attempts = 0;
    
    // 尝试找一个未显示过的 ID
    do {
      randomId = Math.floor(Math.random() * MAX_IMAGE_ID);
      attempts++;
    } while (shownImageIds.has(randomId.toString()) && attempts < 10);
    
    // 记录已显示
    shownImageIds.add(randomId.toString());
    imageIdCounter++;
    
    // 定期清理缓存
    if (imageIdCounter > 100) {
      shownImageIds.clear();
      imageIdCounter = 0;
    }
    
    // 直接返回随机图片 URL
    return `https://picsum.photos/id/${randomId}/${width}/${height}`;
  } catch (error) {
    console.error('Failed to get random image:', error);
    // Fallback: 完全随机的 URL
    return `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
  }
}

// 根据类别获取图片 (Lorem Picsum 不支持搜索，直接返回随机)
export async function searchImageByCategory(category: string, width: number = 1080, height: number = 1920): Promise<string | null> {
  return await getRandomImage(width, height);
}

// 预加载多张图片
export async function preloadImages(count: number = 5, width: number = 1080, height: number = 1920): Promise<string[]> {
  const images: string[] = [];
  const ids = shuffleArray(Array.from({ length: MAX_IMAGE_ID }, (_, i) => i)).slice(0, count);
  
  for (const id of ids) {
    images.push(`https://picsum.photos/id/${id}/${width}/${height}`);
  }
  
  return images;
}

export default {
  getRandomImage,
  searchImageByCategory,
  preloadImages,
};
