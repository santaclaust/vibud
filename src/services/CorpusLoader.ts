// TODO: [语料库深度开发] 保留加载器，后续深度开发语料库时启用
// 当前状态: 未被任何服务使用，待语料库系统完善后接入
/**
 * 语料库加载器
 * 从 assets/corpus/ 目录加载语料
 */

import { Asset } from 'expo-asset';

// 语料库文件映射
const CORPUS_FILES = [
  '01_通用安抚承接语.json',
  '02_浅层倾诉引导语.json',
  '03_事件叙述引导语.json',
  '04_循环模式突破话术.json',
  '05_情感隔离突破话术.json',
  '06_防御性降低话术.json',
  '07_共情表达语料.json',
  '08_温暖结尾语.json',
  '09_青少年专用语料.json',
  '10_职场人士专用语料.json',
  '11_慢性病患者专用语料.json',
  '12_CBT认知重构语料.json',
  '13_ACT接纳承诺语料.json',
  '14_EFT情绪聚焦语料.json',
  '15_危机干预专业语料.json',
  '16_场景化应对语料.json',
];

// 加载单个语料文件
async function loadCorpusFile(filename: string): Promise<Record<string, string[]>> {
  try {
    const module = await Asset.loadAsync(require(`../../assets/corpus/${filename}`));
    const response = await fetch(module.uri);
    return await response.json();
  } catch (error) {
    console.warn(`[Corpus] 加载失败: ${filename}`, error);
    return {};
  }
}

// 加载所有语料
export async function loadAllCorpus(): Promise<Record<string, Record<string, string[]>>> {
  const allCorpus: Record<string, Record<string, string[]>> = {};
  
  for (const filename of CORPUS_FILES) {
    const data = await loadCorpusFile(filename);
    const category = filename.replace('.json', '');
    if (Object.keys(data).length > 0) {
      allCorpus[category] = data;
    }
  }
  
  console.log('[Corpus] 加载完成:', Object.keys(allCorpus).length, '个分类');
  return allCorpus;
}

// 统计语料数量
export function countCorpus(corpus: Record<string, Record<string, string[]>>): {
  total: number;
  categories: Record<string, number>;
} {
  let total = 0;
  const categories: Record<string, number> = {};
  
  for (const [cat, subcats] of Object.entries(corpus)) {
    let count = 0;
    for (const items of Object.values(subcats)) {
      count += items.length;
      total += items.length;
    }
    categories[cat] = count;
  }
  
  return { total, categories };
}

export default { loadAllCorpus, countCorpus };