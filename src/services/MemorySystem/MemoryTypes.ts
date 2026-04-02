/**
 * 心芽记忆系统 - 核心类型定义
 * 参考 Claude Code src/memdir/memoryTypes.ts
 */

export const HEART芽_MEMORY_TYPES = [
  'emotion',    // 情绪记录 (焦虑/悲伤/开心...)
  'trigger',    // 触发因素 (什么事引起情绪波动)
  'coping',     // 应对方案 (用户常用的减压方法)
  'cycle',      // 周期规律 (经期/季节性情绪)
  'preference', // 偏好风格 (喜欢怎样的安慰方式)
  'milestone',  // 重要时刻 (去年此时...)
] as const

export type Heart芽MemoryType = typeof HEART芽_MEMORY_TYPES[number]

/**
 * 记忆文件 Frontmatter 结构
 */
export interface MemoryFrontmatter {
  name: string
  description: string
  type: Heart芽MemoryType
  // 情绪相关字段
  trigger?: string       // 触发因素关键词
  emotion?: string       // 情绪类型
  intensity?: number     // 强度 1-10
  // 周期相关字段
  cycleDate?: string     // 周期日期 (如经期开始日)
  cycleLength?: number   // 周期长度(天)
  // 应对方案字段
  copingMethod?: string  // 应对方法描述
  effectiveness?: number // 有效性 1-10
  // 时间戳
  createdAt?: string
  updatedAt?: string
}

/**
 * 记忆头信息 (扫描结果)
 */
export interface MemoryHeader {
  filename: string
  filePath: string
  mtimeMs: number
  description: string | null
  type: Heart芽MemoryType | null
  trigger?: string
  emotion?: string
}

/**
 * 记忆内容完整结构
 */
export interface MemoryRecord extends MemoryFrontmatter {
  content: string      // 记忆正文
  filePath: string
  createdAt: string
  updatedAt: string
}

/**
 * 记忆查询参数
 */
export interface MemoryQueryParams {
  type?: Heart芽MemoryType
  trigger?: string
  emotion?: string
  startDate?: string
  endDate?: string
  limit?: number
}

/**
 * 记忆统计信息
 */
export interface MemoryStats {
  totalCount: number
  byType: Record<Heart芽MemoryType, number>
  byEmotion: Record<string, number>
  byTrigger: Record<string, number>
  recentCount: number      // 最近7天
  oldestDate: string | null
  newestDate: string | null
}

export const DEFAULT_MEMORY_DIR = 'heart芽_memory'
export const ENTRYPOINT_NAME = 'MEMORY.md'
export const MAX_ENTRYPOINT_LINES = 100
export const MAX_ENTRYPOINT_BYTES = 10000