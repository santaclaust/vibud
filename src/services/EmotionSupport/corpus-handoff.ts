/**
 * AI情绪疏导语料库Handoffs核心模块
 * 基于您提供的Python实现转换为TypeScript版本
 */

import { UserContext, CorpusItem } from './types';

export class CorpusManager {
  private corpusCache: Map<string, CorpusItem[]> = new Map();
  private readonly corpusPath: string;

  constructor(corpusPath: string) {
    this.corpusPath = corpusPath;
    this.loadAllCorpora();
  }

  private loadAllCorpora(): void {
    // 在React Native中，语料库通常从assets或本地存储加载
    // 这里简化处理，实际项目中需要根据您的架构调整
    console.log('Loading corpus from:', this.corpusPath);
    // 实际实现需要根据您的数据加载策略调整
  }

  public getAppropriateCorpus(context: UserContext): string {
    // 危机情况优先处理
    if (context.risk_level === 1) {
      return this.getCrisisResponse(context);
    }

    // 根据对话阶段选择策略
    switch (context.conversation_stage) {
      case '初始接触':
        return this.getInitialResponse(context);
      case '深度探索':
        return this.getExploreResponse(context);
      case '洞察行动':
        return this.getInsightResponse(context);
      default:
        return this.getClosingResponse(context);
    }
  }

  private getCrisisResponse(context: UserContext): string {
    // 返回危机干预响应
    const crisisResponses = [
      "我很担心你，你现在安全吗？",
      "请拨打心理援助热线 400-161-9995，他们会帮助你。",
      "不要独自承受这些，寻求帮助是勇敢的表现。",
      "你的痛苦是暂时的，不要做让自己后悔的事。"
    ];
    return crisisResponses[Math.floor(Math.random() * crisisResponses.length)];
  }

  private getInitialResponse(context: UserContext): string {
    const initialResponses = [
      "我在听，你慢慢说。",
      "听起来你现在真的很难受。",
      "这种感觉搁谁身上都会扛不住。",
      "你愿意说多少都可以，我不急。"
    ];
    return initialResponses[Math.floor(Math.random() * initialResponses.length)];
  }

  private getExploreResponse(context: UserContext): string {
    const exploreResponses = [
      "能和我说说，是从什么时候开始有这种感觉的吗？",
      "是发生了什么事，让你变成这样的？",
      "这种不舒服，更多是心里闷，还是委屈，或是失望呢？",
      "如果用一个词形容现在的心里，会是什么？"
    ];
    return exploreResponses[Math.floor(Math.random() * exploreResponses.length)];
  }

  private getInsightResponse(context: UserContext): string {
    const insightResponses = [
      "我感觉你真正难受的，不是这件事，而是______。",
      "你其实最在意的是______，只是一直没好意思说。",
      "这件事让你怀疑自己了，对不对？",
      "你不是不够好，只是太在意了。"
    ];
    return insightResponses[Math.floor(Math.random() * insightResponses.length)];
  }

  private getClosingResponse(context: UserContext): string {
    const closingResponses = [
      "难是真的难，但你不会一直这样的。",
      "今天的泪水，会成为明天的力量。",
      "你值得被好好对待，包括被你自己。",
      "允许自己慢一点，没关系。"
    ];
    return closingResponses[Math.floor(Math.random() * closingResponses.length)];
  }

  public updateEffectivenessScore(corpusContent: string, feedbackScore: number): void {
    // 更新语料效果评分的逻辑
    console.log('Updating effectiveness score for:', corpusContent, feedbackScore);
  }

  public getHighPerformanceCorpus(category: string, topN: number = 5): CorpusItem[] {
    // 返回高性能语料
    return [];
  }
}

export class HandoffInterface {
  private corpusManager: CorpusManager;

  constructor(corpusManager: CorpusManager) {
    this.corpusManager = corpusManager;
  }

  public generateResponse(
    userInput: string,
    userContext: UserContext,
    feedbackScore?: number
  ): string {
    if (feedbackScore !== undefined) {
      // 更新上一次使用的语料效果评分
      this.corpusManager.updateEffectivenessScore(userInput, feedbackScore);
    }

    return this.corpusManager.getAppropriateCorpus(userContext);
  }

  public batchGenerateResponses(contexts: UserContext[]): string[] {
    return contexts.map(context => 
      this.corpusManager.getAppropriateCorpus(context)
    );
  }
}
