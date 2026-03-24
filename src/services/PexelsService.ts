// Pexels API 服务 - 按五大类别严格过滤

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  photographer: string;
  src: { large2x?: string; large?: string; medium?: string };
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

const PEXELS_API_KEY = 'YFOPEfx9IhazmwzyOcLOhLZ1a5QloVDSZE9SCSFGZonS6dbrTpFhRW5C';
const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

const shownImages = new Set<string>();
let imageCounter = 0;

const categoryKeywords: Record<string, string[]> = {
  'all': ['peaceful', 'calm', 'nature', 'beautiful'],
  '内观': ['peaceful', 'calm', 'serene', 'quiet', 'mind', 'heart'],
  '感悟': ['growth', 'light', 'hope', 'journey', 'time'],
  '陪伴': ['warm', 'love', 'gentle', 'soft', 'cozy'],
  '远眺': ['mountain', 'peak', 'sky', 'cloud', 'horizon'],
  '隐喻': ['nature', 'tree', 'ocean', 'wave', 'star'],
};

const EXCLUDE_PERSON = '&exclude=people,person,face,portrait,selfie,model,woman,man,girl,boy,baby,child,adult,teenager,couple,group,team,family,friends,celebrity,actor,actress,fashion,beauty,makeup,hairstyle,glamour,pose,body,skin,eye,mouth,nose';

function isLikelyPerson(photo: any): boolean {
  const photographer = (photo.photographer || '').toLowerCase();
  const personPhotographers = ['fashion', 'portrait', 'model', 'studio', 'beauty'];
  if (personPhotographers.some(p => photographer.includes(p))) {
    return true;
  }
  if (photo.width && photo.height) {
    const ratio = photo.width / photo.height;
    if (ratio > 0.8 && ratio < 1.2 && photo.width < 3000) {
      return true;
    }
  }
  return false;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function searchImageByQuote(quoteText: string, category: string = 'all'): Promise<string | null> {
  try {
    const catKeywords = categoryKeywords[category] || categoryKeywords['all'];
    const searchWords = [
      ...catKeywords,
      'landscape', 'nature', 'scenery', 'high resolution', 'no people', 'minimalist', 'aesthetic'
    ].join(' ');
    const response = await fetch(
      PEXELS_BASE_URL + '/search?query=' + encodeURIComponent(searchWords) + '&per_page=30&orientation=portrait&size=large' + EXCLUDE_PERSON,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return null;
    }
    const data = await response.json() as PexelsResponse;
    if (data.photos && data.photos.length > 0) {
      const filteredPhotos = data.photos.filter((photo) => {
        const url = photo.src?.large2x || photo.src?.large || '';
        if (url && shownImages.has(url)) return false;
        if (isLikelyPerson(photo)) return false;
        return true;
      });
      const shuffled = shuffleArray(filteredPhotos.length > 0 ? filteredPhotos : data.photos);
      for (const photo of shuffled) {
        const url = (photo.src?.large2x || photo.src?.large || '');
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
      shownImages.clear();
      imageCounter = 0;
      const randomPhoto = shuffled[0];
      const url = (randomPhoto.src?.large2x || randomPhoto.src?.large || '');
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

export async function getRandomImage(category: string = 'all'): Promise<string | null> {
  try {
    const catKeywords = categoryKeywords[category] || categoryKeywords['all'];
    const searchWords = [...catKeywords, 'landscape', 'nature', 'high resolution', 'no people', 'minimalist'].join(' ');
    const response = await fetch(
      PEXELS_BASE_URL + '/search?query=' + encodeURIComponent(searchWords) + '&per_page=30&orientation=portrait&size=large' + EXCLUDE_PERSON,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return null;
    }
    const data = await response.json() as PexelsResponse;
    if (data.photos && data.photos.length > 0) {
      const filteredPhotos = data.photos.filter((photo) => {
        const url = photo.src?.large2x || photo.src?.large || '';
        if (url && shownImages.has(url)) return false;
        if (isLikelyPerson(photo)) return false;
        return true;
      });
      const shuffled = shuffleArray(filteredPhotos.length > 0 ? filteredPhotos : data.photos);
      for (const photo of shuffled) {
        const url = (photo.src?.large2x || photo.src?.large || '');
        if (url && !shownImages.has(url)) {
          shownImages.add(url);
          return url;
        }
      }
      const randomPhoto = shuffled[0];
      return (randomPhoto.src?.large2x || randomPhoto.src?.large || '');
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch image:', error);
    return null;
  }
}

const imageCache: string[] = [];

export async function preloadImages(category: string = 'all', count: number = 3): Promise<string[]> {
  try {
    const catKeywords = categoryKeywords[category] || categoryKeywords['all'];
    const searchWords = [...catKeywords, 'landscape', 'nature', 'high resolution', 'no people'].join(' ');
    const response = await fetch(
      PEXELS_BASE_URL + '/search?query=' + encodeURIComponent(searchWords) + '&per_page=' + (count * 4) + '&orientation=portrait&size=large' + EXCLUDE_PERSON,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!response.ok) return [];
    const data = await response.json() as PexelsResponse;
    if (data.photos && data.photos.length > 0) {
      const filtered = data.photos.filter((photo) => !isLikelyPerson(photo));
      const shuffled = shuffleArray(filtered.length > 0 ? filtered : data.photos);
      const urls = shuffled
        .slice(0, count)
        .map((photo) => photo.src?.large2x || photo.src?.large || '')
        .filter(Boolean) as string[];
      imageCache.length = 0;
      imageCache.push(...urls);
      return urls;
    }
    return [];
  } catch (error) {
    console.error('Failed to preload images:', error);
    return [];
  }
}

export function getNextCachedImage(): string | null {
  if (imageCache.length > 0) {
    return imageCache.shift() || null;
  }
  return null;
}

export default { getRandomImage, preloadImages, getNextCachedImage };
