// Pixabay API 服务 - 按五大类别严格过滤

interface PixabayPhoto {
  id: number;
  webformatURL?: string;
  largeImageURL?: string;
  imageWidth?: number;
  imageHeight?: number;
  user?: string;
  tags?: string;
}

interface PixabayResponse {
  hits: PixabayPhoto[];
  totalHits: number;
}

const PIXABAY_API_KEY = '55112465-6c55eb102c0922a24cf2c5e5b';
const PIXABAY_BASE_URL = 'https://pixabay.com/api/';

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

function hasFaceTag(tags: string): boolean {
  const faceTags = [
    'person', 'people', 'human', 'face', 'portrait', 'selfie', 'model',
    'woman', 'man', 'girl', 'boy', 'baby', 'child', 'adult', 'teenager',
    'couple', 'group', 'team', 'family', 'friends', 'smile', 'laughing',
    'head', 'face close-up', 'fashion', 'beauty', 'makeup', 'hairstyle',
    'portrait', 'glamour', 'pose', 'body', 'skin', 'eye', 'mouth', 'nose'
  ];
  const lowerTags = tags.toLowerCase();
  return faceTags.some(tag => lowerTags.includes(tag));
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
      PIXABAY_BASE_URL + '?key=' + PIXABAY_API_KEY + '&q=' + encodeURIComponent(searchWords) + '&per_page=80&orientation=vertical&image_type=photo'
    );
    if (!response.ok) {
      console.error('Pixabay API error:', response.status);
      return null;
    }
    const data = await response.json() as PixabayResponse;
    if (data.hits && data.hits.length > 0) {
      const filteredPhotos = data.hits.filter((photo) => {
        const tags = photo.tags || '';
        if (hasFaceTag(tags)) return false;
        if (shownImages.has(photo.largeImageURL || '')) return false;
        return true;
      });
      const shuffled = shuffleArray(filteredPhotos.length > 0 ? filteredPhotos : data.hits);
      for (const photo of shuffled) {
        const url = (photo.largeImageURL || photo.webformatURL || '');
        if (!shownImages.has(url)) {
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
      const url = (randomPhoto.largeImageURL || randomPhoto.webformatURL || '');
      shownImages.add(url);
      return url;
    }
    return null;
  } catch (error) {
    console.error('Failed to search Pixabay image:', error);
    return null;
  }
}

export async function getRandomImage(category: string = 'all'): Promise<string | null> {
  try {
    const catKeywords = categoryKeywords[category] || categoryKeywords['all'];
    const searchWords = [
      ...catKeywords,
      'landscape', 'nature', 'high resolution', 'no people', 'minimalist'
    ].join(' ');
    const response = await fetch(
      PIXABAY_BASE_URL + '?key=' + PIXABAY_API_KEY + '&q=' + encodeURIComponent(searchWords) + '&per_page=80&orientation=vertical&image_type=photo'
    );
    if (!response.ok) {
      console.error('Pixabay API error:', response.status);
      return null;
    }
    const data = await response.json() as PixabayResponse;
    if (data.hits && data.hits.length > 0) {
      const filteredPhotos = data.hits.filter((photo) => {
        const tags = photo.tags || '';
        if (hasFaceTag(tags)) return false;
        if (shownImages.has(photo.largeImageURL || '')) return false;
        return true;
      });
      const shuffled = shuffleArray(filteredPhotos.length > 0 ? filteredPhotos : data.hits);
      for (const photo of shuffled) {
        const url = (photo.largeImageURL || photo.webformatURL || '');
        if (!shownImages.has(url)) {
          shownImages.add(url);
          return url;
        }
      }
      const randomPhoto = shuffled[0];
      return (randomPhoto.largeImageURL || randomPhoto.webformatURL || '');
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch Pixabay image:', error);
    return null;
  }
}

export default { searchImageByQuote, getRandomImage };
