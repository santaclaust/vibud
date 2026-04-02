/**
 * 心芽记忆系统 - 主入口
 * 参考 Claude Code src/memdir/index.ts
 */

export * from './MemoryTypes'
export * from './MemoryStore'
export * from './MemoryPrompt'

import { memoryStore, UserPreference } from './MemoryStore'
import { buildMemoryPrompt, getUserProfileSummary } from './MemoryPrompt'
import { Heart芽MemoryType, MemoryRecord, MemoryHeader } from './MemoryTypes'

/**
 * 记忆系统初始化
 */
export async function initializeMemorySystem(): Promise<void> {
  await memoryStore.initialize()
}

/**
 * 快速保存情绪记录
 */
export async function quickSaveEmotion(params: {
  emotion: string
  trigger?: string
  intensity?: number
  content: string
  description?: string
}): Promise<void> {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toTimeString().split(' ')[0].replace(':', '-')
  
  const record: MemoryRecord = {
    name: `${dateStr}_${params.emotion}_${timeStr}`,
    description: params.description || `${params.emotion} - ${params.trigger || '未标注'}`,
    type: 'emotion',
    trigger: params.trigger,
    emotion: params.emotion,
    intensity: params.intensity || 5,
    content: params.content,
    filePath: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  
  await memoryStore.saveMemory(record)
}

/**
 * 保存触发因素
 */
export async function saveTrigger(params: {
  trigger: string
  description: string
  relatedEmotions?: string[]
}): Promise<void> {
  const now = new Date()
  
  const record: MemoryRecord = {
    name: `trigger_${params.trigger}`,
    description: params.description,
    type: 'trigger',
    content: `触发因素: ${params.trigger}\n相关情绪: ${params.relatedEmotions?.join(', ') || '未记录'}`,
    filePath: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  
  await memoryStore.saveMemory(record)
}

/**
 * 保存应对方案
 */
export async function saveCopingMethod(params: {
  method: string
  description: string
  effectiveness?: number
}): Promise<void> {
  const now = new Date()
  
  const record: MemoryRecord = {
    name: `coping_${params.method}`,
    description: params.description,
    type: 'coping',
    copingMethod: params.method,
    effectiveness: params.effectiveness,
    content: params.description,
    filePath: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  
  await memoryStore.saveMemory(record)
}

/**
 * 保存偏好风格
 */
export async function savePreference(params: {
  preference: string
  description: string
  examples?: string[]
}): Promise<void> {
  const now = new Date()
  
  const record: MemoryRecord = {
    name: `preference_${params.preference}`,
    description: params.description,
    type: 'preference',
    content: params.description + (params.examples ? `\n\n示例:\n${params.examples.map(e => `- ${e}`).join('\n')}` : ''),
    filePath: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  
  await memoryStore.saveMemory(record)
}

/**
 * 保存重要时刻
 */
export async function saveMilestone(params: {
  title: string
  description: string
  date?: string
  relatedEmotions?: string[]
}): Promise<void> {
  const now = new Date()
  
  const record: MemoryRecord = {
    name: `milestone_${params.title}`,
    description: params.description,
    type: 'milestone',
    content: params.description + (params.relatedEmotions ? `\n相关情绪: ${params.relatedEmotions.join(', ')}` : ''),
    filePath: '',
    createdAt: params.date || now.toISOString(),
    updatedAt: now.toISOString(),
  }
  
  await memoryStore.saveMemory(record)
}

/**
 * 从对话中自动提取并保存记忆
 */
export async function extractMemoryFromConversation(
  userMessage: string,
  aiResponse: string,
  detectedEmotion?: string,
  detectedTrigger?: string
): Promise<void> {
  if (detectedEmotion && userMessage.length > 50) {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    
    const record: MemoryRecord = {
      name: `${dateStr}_auto_${detectedEmotion}`,
      description: `从对话中自动提取: ${detectedEmotion}`,
      type: 'emotion',
      emotion: detectedEmotion,
      trigger: detectedTrigger,
      content: `用户: ${userMessage.slice(0, 200)}...\n\nAI: ${aiResponse.slice(0, 200)}...`,
      filePath: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    
    await memoryStore.saveMemory(record)
  }
}

// ========== 偏好学习 API ==========

/**
 * 从反馈学习偏好
 */
export async function learnUserPreference(
  userMessage: string,
  aiResponse: string,
  feedback: 'positive' | 'negative' | 'neutral'
): Promise<void> {
  await memoryStore.learnFromFeedback(userMessage, aiResponse, feedback)
}

/**
 * 获取用户偏好摘要
 */
export async function getUserPreferenceSummary(): Promise<string> {
  return memoryStore.getPreferenceSummary()
}

/**
 * 获取用户偏好详情
 */
export async function getUserPreference(): Promise<UserPreference> {
  return memoryStore.getUserPreference()
}

// ========== 时间轴回顾 API ==========

/**
 * 获取时间轴记忆
 */
export async function getTimelineMemories(limit?: number): Promise<MemoryHeader[]> {
  return memoryStore.getTimelineMemories(limit)
}

/**
 * 获取里程碑
 */
export async function getMilestones(): Promise<MemoryRecord[]> {
  return memoryStore.getMilestones()
}

/**
 * 获取去年同期记忆
 */
export async function getSamePeriodLastYear(): Promise<MemoryHeader[]> {
  return memoryStore.getSamePeriodLastYear()
}

/**
 * 获取月度统计
 */
export async function getMonthlyStats(year: number, month: number): Promise<{
  count: number
  emotions: Record<string, number>
  triggers: Record<string, number>
}> {
  return memoryStore.getMonthlyStats(year, month)
}

export default {
  initialize: initializeMemorySystem,
  quickSaveEmotion,
  saveTrigger,
  saveCopingMethod,
  savePreference,
  saveMilestone,
  extractMemoryFromConversation,
  learnUserPreference,
  getUserPreferenceSummary,
  getUserPreference,
  getTimelineMemories,
  getMilestones,
  getSamePeriodLastYear,
  getMonthlyStats,
  buildMemoryPrompt,
  getUserProfileSummary,
  store: memoryStore,
}