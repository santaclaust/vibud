// 图片源管理器
import { searchImageByQuote as pexelsSearch, preloadImages as pexelsPreload, getNextCachedImage } from './PexelsService';
import { searchImageByQuote as pixabaySearch } from './PixabayService';
import { getRandomImage as loremPicsumGetRandom, preloadImages as loremPicsumPreload } from './LoremPicsumService';

export type ImageSource = 'pexels' | 'pixabay' | 'lorempicsum';

let currentSource: ImageSource = 'pexels';

export function getCurrentImageSource(): ImageSource {
  return currentSource;
}

export function setImageSource(source: ImageSource): void {
  currentSource = source;
}

// 循环切换图片源
export function toggleImageSource(): ImageSource {
  switch (currentSource) {
    case 'pexels':
      currentSource = 'pixabay';
      break;
    case 'pixabay':
      currentSource = 'lorempicsum';
      break;
    case 'lorempicsum':
      currentSource = 'pexels';
      break;
  }
  return currentSource;
}

// 直接设置图片源
export function cycleToNextSource(): ImageSource {
  return toggleImageSource();
}

// 统一搜索接口
export async function searchImage(quoteText: string, category: string = 'all'): Promise<string | null> {
  if (currentSource === 'pixabay') {
    return await pixabaySearch(quoteText, category);
  }
  if (currentSource === 'lorempicsum') {
    // Lorem Picsum 不支持搜索，返回随机图
    return await loremPicsumGetRandom(1080, 1920);
  }
  return await pexelsSearch(quoteText, category);
}

// 预加载图片（切换时更快）
export async function preloadImages(category: string = 'all', count: number = 3): Promise<string[]> {
  if (currentSource === 'lorempicsum') {
    return await loremPicsumPreload(count, 1080, 1920);
  }
  // Pexels 预加载
  return await pexelsPreload(category, count);
}

// 获取缓存图片（无需 API 请求）
export function getNextImage(): string | null {
  if (currentSource === 'pexels') {
    return getNextCachedImage();
  }
  return null;
}

export default {
  getCurrentImageSource,
  setImageSource,
  toggleImageSource,
  searchImage,
  preloadImages,
  getNextImage,
};
