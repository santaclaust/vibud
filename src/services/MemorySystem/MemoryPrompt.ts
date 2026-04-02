/**
 * 心芽记忆系统 - AI上下文Prompt构建
 * 参考 Claude Code memdir.ts buildMemoryPrompt
 */

import { memoryStore } from './MemoryStore'
import { Heart芽MemoryType, MemoryHeader } from './MemoryTypes'
import { feedbackService } from '../FeedbackService'

/**
 * 构建记忆系统提示词 (注入AI上下文)
 */
export async function buildMemoryPrompt(params?: {
  maxLines?: number
  maxBytes?: number
}): Promise<string> {
  const { maxLines = 50, maxBytes = 5000 } = params || {}
  
  const lines: string[] = [
    '# 心芽记忆系统',
    '',
    '你有一个持久化的记忆系统，用于记录用户的情绪历程和偏好。',
    '',
    '## 记忆类型',
    '',
    '- **emotion**: 情绪记录 (焦虑、悲伤、开心、平静...)',
    '- **trigger**: 触发因素 (工作压力、人际关系、失眠...)',
    '- **coping**: 应对方案 (用户常用的减压方法)',
    '- **cycle**: 周期规律 (经期、季节性情绪波动)',
    '- **preference**: 偏好风格 (喜欢怎样的安慰方式)',
    '- **milestone**: 重要时刻 (值得纪念的日子)',
    '',
    '## 何时访问记忆',
    '',
    '- 当用户提到过去的经历时',
    '- 当用户的情绪与之前的触发因素相似时',
    '- 当需要了解用户的偏好风格时',
    '- 用户明确要求回顾时',
    '',
    '## 重要提示',
    '',
    '- 记忆可能随时间变得不准确，使用前应验证',
    '- 不要直接引用记忆中的具体建议，而是理解背后的情绪需求',
    '- 如果记忆与当前状态矛盾，以当前为准',
  ]
  
  // 🆕 获取用户偏好 (从FeedbackService)
  try {
    const userStyle = await feedbackService.getUserStyle()
    if (userStyle && userStyle.preferPhrases?.length > 0) {
      lines.push('', '## 用户偏好 (从反馈学习)', '')
      lines.push(`- 喜欢的话: ${userStyle.preferPhrases.slice(0, 3).join('、')}`)
      if (userStyle.avoidPhrases?.length > 0) {
        lines.push(`- 避免的话: ${userStyle.avoidPhrases.slice(0, 3).join('、')}`)
      }
      if (userStyle.tone) {
        lines.push(`- 偏好语气: ${userStyle.tone}`)
      }
      lines.push('')
    }
  } catch (e) {
    console.log('获取用户偏好失败:', e)
  }
  
  // 获取索引
  const memories = await memoryStore.getAllMemories()
  
  if (memories.length === 0) {
    lines.push('', '## 当前记忆', '', '暂无记录。')
    return truncatePrompt(lines.join('\n'), maxLines, maxBytes)
  }
  
  // 截取最近的记忆
  const recentMemories = memories.slice(0, 20)
  
  lines.push('', '## 近期记忆', '')
  
  // 按类型分组显示
  const grouped = new Map<string, MemoryHeader[]>()
  recentMemories.forEach(m => {
    const type = m.type || 'other'
    if (!grouped.has(type)) {
      grouped.set(type, [])
    }
    grouped.get(type)!.push(m)
  })
  
  for (const [type, items] of grouped) {
    lines.push(`### ${type}`)
    items.forEach(m => {
      const date = new Date(m.mtimeMs).toLocaleDateString('zh-CN')
      const desc = m.description ? ` — ${m.description}` : ''
      const emotion = m.emotion ? `[${m.emotion}] ` : ''
      lines.push(`- ${emotion}${date}: ${m.filename.replace('.md', '')}${desc}`)
    })
    lines.push('')
  }
  
  return truncatePrompt(lines.join('\n'), maxLines, maxBytes)
}

/**
 * 截断提示词
 */
function truncatePrompt(content: string, maxLines: number, maxBytes: number): string {
  const trimmed = content.trim()
  const lines = trimmed.split('\n')
  
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join('\n') + 
      `\n\n> ... (共 ${lines.length} 行，仅显示前 ${maxLines} 行)`
  }
  
  if (trimmed.length > maxBytes) {
    return trimmed.slice(0, maxBytes) + 
      `\n\n> ... (共 ${trimmed.length} 字符，仅显示前 ${maxBytes} 字符)`
  }
  
  return trimmed
}

/**
 * 获取特定类型的记忆
 */
export async function getMemoriesByType(type: Heart芽MemoryType): Promise<MemoryHeader[]> {
  return memoryStore.queryMemories({ type, limit: 50 })
}

/**
 * 获取相关记忆 (根据情绪/触发因素)
 */
export async function findRelevantMemories(
  emotion?: string,
  trigger?: string
): Promise<MemoryHeader[]> {
  const all = await memoryStore.getAllMemories()
  
  let results = all
  
  if (emotion) {
    results = results.filter(m => 
      m.emotion?.toLowerCase().includes(emotion.toLowerCase())
    )
  }
  
  if (trigger) {
    results = results.filter(m => 
      m.trigger?.toLowerCase().includes(trigger.toLowerCase())
    )
  }
  
  return results.slice(0, 10)
}

/**
 * 获取用户画像摘要 (用于AI上下文)
 */
export async function getUserProfileSummary(): Promise<string> {
  const stats = await memoryStore.getStats()
  
  if (stats.totalCount === 0) {
    return '用户暂无情绪记录。'
  }
  
  const lines: string[] = [
    '【用户画像摘要】',
    '',
    `总记录: ${stats.totalCount} 条`,
    `最近7天: ${stats.recentCount} 条`,
  ]
  
  // 情绪分布
  if (Object.keys(stats.byEmotion).length > 0) {
    lines.push('', '情绪分布:')
    Object.entries(stats.byEmotion)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([emotion, count]) => {
        lines.push(`- ${emotion}: ${count} 次`)
      })
  }
  
  // 触发因素
  if (Object.keys(stats.byTrigger).length > 0) {
    lines.push('', '主要触发因素:')
    Object.entries(stats.byTrigger)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([trigger, count]) => {
        lines.push(`- ${trigger}: ${count} 次`)
      })
  }
  
  // 时间范围
  if (stats.oldestDate && stats.newestDate) {
    lines.push('', `记录时间: ${stats.oldestDate} ~ ${stats.newestDate}`)
  }
  
  // 🆕 尝试获取用户偏好
  try {
    const userStyle = await feedbackService.getUserStyle()
    if (userStyle && userStyle.preferPhrases?.length > 0) {
      lines.push('', '【用户偏好】')
      lines.push(`喜欢: ${userStyle.preferPhrases.slice(0, 3).join('、')}`)
      if (userStyle.avoidPhrases?.length > 0) {
        lines.push(`避免: ${userStyle.avoidPhrases.slice(0, 3).join('、')}`)
      }
    }
  } catch (e) {
    // 忽略
  }
  
  return lines.join('\n')
}