# 用户时间情绪记忆 - 功能设计

## 核心思路

参考 SuperMemory 的用户状态图谱理念，在倾诉对话完成后，提取 3 个关键词（情绪词 + 事件词）连同时间戳存入 CloudBase，构建用户情绪变化的时间线。

## 数据模型

集合名：`emotion_logs`

```typescript
interface EmotionLog {
  _id?: string;
  id: string;           // 格式: emot_{timestamp}
  userId: string;       // 用户ID
  keywords: string[];   // 3个关键词，如 ["焦虑", "工作", "失眠"]
  mood?: string;         // 主情绪（从moodOptions匹配）
  textExcerpt: string;   // 原始倾诉文本摘要（限50字）
  timestamp: number;     // 倾诉时间
}
```

## 关键词提取方案

**方案 A：本地规则提取（推荐 MVP）**
- 情绪词库匹配（焦虑/悲伤/孤独/迷茫/失眠/愤怒等）
- 最高频名词/动词提取
- 提取逻辑在倾诉保存时执行，不额外调用 AI

**方案 B：接入 AI 提取（高精度）**
- 倾诉完成后，调用 AI 分析文本，输出 3 个关键词
- 需要消耗 AI token，适合后期优化

## 交互流程

1. 用户完成倾诉对话，点击"结束倾诉"
2. 系统分析本次对话，提取 3 个关键词
3. 关键词 + 时间戳存入 CloudBase `emotion_logs`
4. 用户可在"个人中心 → 情绪记忆"查看情绪时间线

## 存储结构（CloudBase）

集合：`emotion_logs`
权限：`读取本人，修改本人`

## 前端展示

在个人中心新增"情绪记忆"入口：

```
情绪记忆
2026-03-24  焦虑、工作、失眠
2026-03-22  孤独、深夜、迷茫
2026-03-20  悲伤、分离、释怀
```

可点击查看原始倾诉摘要。

## 实现优先级

| 阶段 | 内容 | 状态 |
|------|------|------|
| MVP | 本地规则提取关键词，存入CloudBase | 待开发 |
| V2 | 接入AI高精度提取，情绪可视化时间线 | 规划中 |

## 依赖

- CloudBase 已接通（✅）
- ConfessionScreen 倾诉保存逻辑（需接入）
- ProfileScreen 个人中心（需新增情绪记忆入口）
