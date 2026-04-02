/**
 * 心芽项目语料库管理系统
 * 包含：加载、自动扩展、效果评估、评价机制
 */

// ========== 语料库类型定义 ==========

export interface CorpusItem {
  content: string;
  category: string;
  subcategory: string;
  usageCount: number;
  effectivenessScore: number; // 0-1，基于用户反馈
  createdAt: number;
  lastUsedAt?: number;
}

export interface CorpusCategory {
  name: string;
  subcategories: Record<string, CorpusItem[]>;
}

export interface CorpusStats {
  totalItems: number;
  categories: Record<string, number>;
  averageScore: number;
  highPerformanceItems: number; // score >= 0.7
  lowPerformanceItems: number;  // score <= 0.3
}

// ========== 语料库管理器 ==========

class CorpusManager {
  private corpus: Record<string, Record<string, CorpusItem[]>> = {};
  private stats: CorpusStats | null = null;

  // 加载语料库
  load(corpusData: Record<string, Record<string, string[]>>): void {
    for (const [category, subcats] of Object.entries(corpusData)) {
      this.corpus[category] = {};
      for (const [subcategory, items] of Object.entries(subcats)) {
        this.corpus[category][subcategory] = items.map(content => ({
          content,
          category,
          subcategory,
          usageCount: 0,
          effectivenessScore: 0.5, // 默认中等评分
          createdAt: Date.now(),
        }));
      }
    }
    this.calculateStats();
  }

  // 根据条件获取语料
  getItem(category: string, subcategory: string): CorpusItem | null {
    const items = this.corpus[category]?.[subcategory];
    if (!items || items.length === 0) return null;
    
    // 权重随机选择：效果好的优先
    const weightedItems = items.map(item => ({
      item,
      weight: item.effectivenessScore + 0.1 // 基础权重
    }));
    const totalWeight = weightedItems.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { item, weight } of weightedItems) {
      random -= weight;
      if (random <= 0) return item;
    }
    
    return items[0];
  }

  // 记录使用
  recordUsage(item: CorpusItem): void {
    item.usageCount++;
    item.lastUsedAt = Date.now();
  }

  // 更新评分
  updateScore(content: string, score: number): void {
    for (const subcats of Object.values(this.corpus)) {
      for (const items of Object.values(subcats)) {
        const item = items.find(i => i.content === content);
        if (item) {
          // 滑动平均更新评分
          item.effectivenessScore = (item.effectivenessScore * 0.7 + score * 0.3);
          return;
        }
      }
    }
  }

  // 自动扩展语料（同义词替换、语气调整等）
  autoExpand(category: string, subcategory: string, factor: number = 2): void {
    const items = this.corpus[category]?.[subcategory];
    if (!items) return;

    const newItems: CorpusItem[] = [];
    for (const item of items) {
      if (newItems.length >= items.length * (factor - 1)) break;
      
      // 生成变体
      const variants = this.generateVariants(item.content);
      for (const variant of variants) {
        newItems.push({
          ...item,
          content: variant,
          usageCount: 0,
          effectivenessScore: 0.5, // 新变体默认中等
          createdAt: Date.now(),
        });
      }
    }
    
    items.push(...newItems);
    this.calculateStats();
  }

  // 生成语料变体
  private generateVariants(original: string): string[] {
    const variants: string[] = [];
    
    // 1. 添加确认语气词
    if (!original.includes('，')) {
      variants.push(original + '。');
      variants.push(original + '，真的。');
    }
    
    // 2. 转换为疑问句（适用于部分场景）
    if (original.includes('我') && original.includes('。')) {
      variants.push(original.replace('。', '吗？'));
    }
    
    // 3. 添加共情前缀
    const empathyPrefixes = ['我理解', '我能感受到', '我听到'];
    for (const prefix of empathyPrefixes) {
      if (!original.startsWith(prefix)) {
        variants.push(prefix + '，' + original);
      }
    }
    
    return variants.slice(0, 3); // 最多3个变体
  }

  // 计算统计信息
  private calculateStats(): void {
    let total = 0;
    let scoreSum = 0;
    let highScore = 0;
    let lowScore = 0;
    const categories: Record<string, number> = {};

    for (const [cat, subcats] of Object.entries(this.corpus)) {
      let catCount = 0;
      for (const items of Object.values(subcats)) {
        for (const item of items) {
          total++;
          catCount++;
          scoreSum += item.effectivenessScore;
          if (item.effectivenessScore >= 0.7) highScore++;
          if (item.effectivenessScore <= 0.3) lowScore++;
        }
      }
      categories[cat] = catCount;
    }

    this.stats = {
      totalItems: total,
      categories,
      averageScore: total > 0 ? scoreSum / total : 0,
      highPerformanceItems: highScore,
      lowPerformanceItems: lowScore,
    };
  }

  // 获取统计
  getStats(): CorpusStats {
    if (!this.stats) this.calculateStats();
    return this.stats!;
  }

  // 获取所有语料
  getAllItems(): CorpusItem[] {
    const allItems: CorpusItem[] = [];
    for (const subcats of Object.values(this.corpus)) {
      for (const items of Object.values(subcats)) {
        allItems.push(...items);
      }
    }
    return allItems;
  }

  // 获取低性能语料（待优化）
  getLowPerformanceItems(limit: number = 10): CorpusItem[] {
    const lowItems: CorpusItem[] = [];
    for (const subcats of Object.values(this.corpus)) {
      for (const items of Object.values(subcats)) {
        if (items.effectivenessScore <= 0.3) {
          lowItems.push(...items);
        }
      }
    }
    return lowItems.sort((a, b) => a.effectivenessScore - b.effectivenessScore).slice(0, limit);
  }
}

// ========== 评价机制 ==========
// TODO: [语料库深度开发] CorpusEvaluator 待接入反馈系统后启用

class CorpusEvaluator {
  // 用户评价处理
  processFeedback(item: CorpusItem, feedback: 'like' | 'neutral' | 'dislike'): void {
    const scoreMap = { 'like': 1.0, 'neutral': 0.5, 'dislike': 0.0 };
    const newScore = scoreMap[feedback];
    
    // 更新评分（滑动平均）
    item.effectivenessScore = item.effectivenessScore * 0.7 + newScore * 0.3;
  }

  // 隐式评价（基于用户行为）
  implicitEvaluate(item: CorpusItem, userContinued: boolean): void {
    // 用户继续对话 = 正向反馈
    const score = userContinued ? 0.6 : 0.4;
    item.effectivenessScore = item.effectivenessScore * 0.8 + score * 0.2;
  }

  // 生成优化建议
  generateOptimization建议(items: CorpusItem[]): string[] {
    const suggestions: string[] = [];
    
    for (const item of items.slice(0, 5)) {
      if (item.effectivenessScore <= 0.3) {
        suggestions.push(`建议重写：「${item.content.slice(0, 20)}...」- 当前评分 ${item.effectivenessScore.toFixed(2)}`);
      }
    }
    
    return suggestions;
  }
}

// ========== 定期任务 ==========

class CorpusScheduler {
  private manager: CorpusManager;
  private evaluator: CorpusEvaluator;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(manager: CorpusManager, evaluator: CorpusEvaluator) {
    this.manager = manager;
    this.evaluator = evaluator;
  }

  // 启动定期任务
  start(intervalHours: number = 24): void {
    // 每天执行一次
    this.timer = setInterval(() => {
      this.runScheduledTasks();
    }, intervalHours * 60 * 60 * 1000);
  }

  // 停止
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // 执行定期任务
  private runScheduledTasks(): void {
    console.log('[CorpusScheduler] 执行定期任务...');
    
    // 1. 对低性能语料进行自动扩展
    const lowItems = this.manager.getLowPerformanceItems(20);
    const categoriesToExpand = new Set(lowItems.map(i => i.category));
    
    for (const cat of categoriesToExpand) {
      this.manager.autoExpand(cat, '', 1.5);
    }
    
    // 2. 输出优化建议
    const suggestions = this.evaluator.generateOptimization建议(lowItems);
    console.log('[CorpusScheduler] 优化建议:', suggestions);
    
    // 3. 重新计算统计
    this.manager.getStats();
  }
}

// ========== 导出单例 ==========

export const corpusManager = new CorpusManager();
export const corpusEvaluator = new CorpusEvaluator();
export const corpusScheduler = new CorpusScheduler(corpusManager, corpusEvaluator);

// 加载语料的便捷函数
export function initializeCorpus(corpusData: Record<string, Record<string, string[]>>): void {
  corpusManager.load(corpusData);
  console.log('[Corpus] 语料库已加载:', corpusManager.getStats());
}