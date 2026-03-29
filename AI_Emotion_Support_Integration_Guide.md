# AI情绪疏导语料库 - OpenCLAW集成指南

## ?? 项目结构
```
src/
├── services/
│   └── EmotionSupport/           # AI情绪疏导核心服务
│       ├── EmotionSupportService.ts  # 主服务类
│       ├── corpus-handoff.ts        # Handoffs核心逻辑
│       ├── corpus-data.ts           # 语料库数据
│       ├── CorpusAutoUpdater.ts     # 自动更新服务
│       └── types.ts                # 类型定义
├── hooks/
│   └── useEmotionSupport.ts        # React Hook封装
├── components/
│   └── EmotionSupportExample.tsx   # 示例组件
└── ...
```

## ?? 快速集成步骤

### 1. 安装依赖（如果需要）
```bash
# 通常不需要额外依赖，使用现有React Native环境
```

### 2. 在组件中使用Hook
```typescript
import useEmotionSupport from '../hooks/useEmotionSupport';

const MyComponent = () => {
  const { isInitialized, isLoading, generateResponse } = useEmotionSupport();
  
  const handleUserMessage = async (message: string) => {
    const userContext = {
      userId: 'user_123',
      user_group: UserGroup.ADOLESCENT,
      emotion_intensity: EmotionIntensity.MEDIUM,
      conversation_stage: ConversationStage.INITIAL,
      current_round: 1,
      risk_level: 3
    };
    
    const aiResponse = await generateResponse(message, userContext);
    // 处理AI响应
  };
};
```

### 3. 配置用户上下文
根据您的用户数据和对话状态，正确设置`UserContext`对象：

- **user_group**: 用户群体（青少年/职场人士/慢性病患者/通用）
- **emotion_intensity**: 情绪强度（低/中/高/危机）
- **conversation_stage**: 对话阶段（初始接触/深度探索/洞察行动/结束阶段）
- **risk_level**: 风险等级（1-3，1为最高风险）

### 4. 集成风险检测
实现`detectRiskLevel`函数来检测用户消息中的危机关键词：

```typescript
const detectRiskLevel = (message: string): number => {
  const crisisKeywords = ['自杀', '想死', '不想活', '伤害自己'];
  if (crisisKeywords.some(keyword => message.includes(keyword))) {
    return 1; // 最高风险，触发危机干预
  }
  // ... 其他风险级别检测
};
```

## ?? 高级功能

### 语料库自动扩展
```typescript
import CorpusAutoUpdater from './services/EmotionSupport/CorpusAutoUpdater';

// 获取扩展后的语料库（2倍扩展）
const expandedCorpus = CorpusAutoUpdater.getExpandedCorpus();
```

### 效果评分反馈
```typescript
// 用户对AI响应的评分（1-5分）
emotionSupportService.updateEffectivenessScore(aiResponse, userRating);
```

### 批量处理
```typescript
// 同时为多个用户生成响应
const responses = await emotionSupportService.batchGenerateResponses(userContexts);
```

## ??? 安全与伦理保障

### 危机干预机制
- 自动检测自杀/自伤关键词
- 优先返回危机干预响应
- 提供专业心理援助热线

### 边界设定
- 明确AI的局限性
- 避免过度依赖
- 适时建议专业帮助

### 隐私保护
- 不存储敏感个人信息
- 对话内容本地处理
- 符合心理健康伦理规范

## ?? 性能优化建议

### 缓存策略
- 语料库预加载到内存
- 使用Map结构提高查找效率
- 按需加载特定用户群体语料

### 异步处理
- AI响应生成使用异步操作
- 避免阻塞UI线程
- 提供加载状态反馈

### 内存管理
- 定期清理不常用的语料缓存
- 监控内存使用情况
- 优化大型语料库的存储结构

## ?? 更新与维护

### 语料库更新
- 定期从云端同步最新语料
- A/B测试不同语料效果
- 基于用户反馈持续优化

### 版本管理
- 语料库版本号管理
- 向后兼容性保证
- 灰度发布新语料

## ?? 注意事项

1. **合规性**: 确保符合当地心理健康服务法规
2. **专业边界**: 明确AI不能替代专业心理咨询
3. **文化适配**: 根据目标用户群体调整语料文化背景
4. **性能监控**: 监控响应时间和服务可用性
5. **用户教育**: 帮助用户正确理解和使用AI倾诉功能

---
**版本**: 1.0.0  
**最后更新**: 2026-03-29  
**适用平台**: React Native (OpenCLAW)
