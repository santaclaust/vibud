/**
 * 语料库自动更新服务（简化版本）
 * 实际项目中可能需要与后端API集成
 */

import CORPUS_DATA from './corpus-data';

export class CorpusAutoUpdater {
  private static readonly EXPANSION_STRATEGIES = [
    'synonymReplacement',
    'toneAdjustment', 
    'lengthVariation',
    'perspectiveShift'
  ];

  /**
   * 扩展语料库（生成变体）
   */
  public static expandCorpus(originalCorpus: any, expansionFactor: number = 2): any {
    const expandedCorpus: any = {};
    
    for (const [category, subcategories] of Object.entries(originalCorpus)) {
      expandedCorpus[category] = {};
      
      for (const [subcategory, contents] of Object.entries(subcategories)) {
        if (Array.isArray(contents)) {
          const expandedContents = [...contents];
          
          // 为每个原始语料生成变体
          for (const content of contents) {
            const variants = this.generateVariants(content, expansionFactor - 1);
            expandedContents.push(...variants);
          }
          
          // 去重并限制数量
          const uniqueContents = [...new Set(expandedContents)];
          expandedCorpus[category][subcategory] = uniqueContents.slice(0, contents.length * expansionFactor);
        }
      }
    }
    
    return expandedCorpus;
  }

  /**
   * 生成语料变体
   */
  private static generateVariants(content: string, numVariants: number): string[] {
    const variants: string[] = [];
    const strategies = [...this.EXPANSION_STRATEGIES];
    
    for (let i = 0; i < numVariants; i++) {
      const strategy = strategies[Math.floor(Math.random() * strategies.length)];
      try {
        const variant = this.applyStrategy(content, strategy);
        if (variant && variant !== content && !variants.includes(variant)) {
          variants.push(variant);
        }
      } catch (error) {
        console.warn('Failed to generate variant:', error);
      }
    }
    
    return variants;
  }

  /**
   * 应用变体策略
   */
  private static applyStrategy(content: string, strategy: string): string {
    switch (strategy) {
      case 'synonymReplacement':
        return this.synonymReplacement(content);
      case 'toneAdjustment':
        return this.toneAdjustment(content);
      case 'lengthVariation':
        return this.lengthVariation(content);
      case 'perspectiveShift':
        return this.perspectiveShift(content);
      default:
        return content;
    }
  }

  private static synonymReplacement(content: string): string {
    const synonymMap: Record<string, string[]> = {
      '难受': ['痛苦', '难过', '不舒服', '煎熬'],
      '理解': ['懂', '明白', '体会', '感同身受'],
      '陪伴': ['陪着', '支持', '在身边', '不离开'],
      '勇敢': ['坚强', '有勇气', '了不起', '很棒']
    };
    
    for (const [word, synonyms] of Object.entries(synonymMap)) {
      if (content.includes(word)) {
        const replacement = synonyms[Math.floor(Math.random() * synonyms.length)];
        return content.replace(word, replacement);
      }
    }
    return content;
  }

  private static toneAdjustment(content: string): string {
    if (content.endsWith('吗？') || content.endsWith('吧？')) {
      return content.slice(0, -2) + '。';
    } else if (content.endsWith('。')) {
      return content.slice(0, -1) + '吗？';
    }
    return content;
  }

  private static lengthVariation(content: string): string {
    const words = content.split(' ');
    if (words.length > 8) {
      return words.slice(0, 6).join(' ') + '...';
    } else if (words.length < 5) {
      const additions = ['真的', '非常', '特别', '确实'];
      return content.replace('。', `，${additions[Math.floor(Math.random() * additions.length)]}。`);
    }
    return content;
  }

  private static perspectiveShift(content: string): string {
    if (content.includes('你') && !content.includes('我')) {
      const empatheticPrefixes = ['我能感受到', '我理解', '我知道', '我能想象'];
      return `${empatheticPrefixes[Math.floor(Math.random() * empatheticPrefixes.length)]}${content.toLowerCase()}`;
    }
    return content;
  }

  /**
   * 获取扩展后的语料库
   */
  public static getExpandedCorpus(): any {
    return this.expandCorpus(CORPUS_DATA, 2);
  }
}

export default CorpusAutoUpdater;
