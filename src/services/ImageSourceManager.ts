// 图片源管理器
import { searchImageByQuote as pexelsSearch } from './PexelsService';
import { searchImageByQuote as pixabaySearch } from './PixabayService';

export type ImageSource = 'pexels' | 'pixabay';

let currentSource: ImageSource = 'pexels';

export function getCurrentImageSource(): ImageSource {
  return currentSource;
}

export function setImageSource(source: ImageSource): void {
  currentSource = source;
}

export function toggleImageSource(): ImageSource {
  currentSource = currentSource === 'pexels' ? 'pixabay' : 'pexels';
  return currentSource;
}

// 统一搜索接口
export async function searchImage(quoteText: string, category: string = 'all'): Promise<string | null> {
  if (currentSource === 'pixabay') {
    return await pixabaySearch(quoteText, category);
  }
  return await pexelsSearch(quoteText, category);
}

export default {
  getCurrentImageSource,
  setImageSource,
  toggleImageSource,
  searchImage,
};
