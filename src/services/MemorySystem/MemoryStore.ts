/**
 * 心芽记忆系统 - 持久化存储
 * 参考 Claude Code memdir.ts 存储逻辑
 * 基于 AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  MemoryHeader,
  MemoryRecord,
  MemoryQueryParams,
  MemoryStats,
  ENTRYPOINT_NAME,
  DEFAULT_MEMORY_DIR,
  Heart芽MemoryType,
} from './MemoryTypes'

const MEMORY_STORAGE_KEY = '@heart芽_memory_index'
const MEMORY_DIR_KEY = '@heart芽_memory_dir'
const PREFERENCE_KEY = '@heart芽_user_preference'

/**
 * 用户偏好风格
 */
export interface UserPreference {
  // 沟通偏好
  preferredTone?: '温暖' | '简洁' | '幽默' | '认真'    // 语气风格
  preferredLength?: '极短' | '短' | '中等'            // 回复长度
  likesPhrases?: string[]                               // 喜欢的话
  dislikesPhrases?: string[]                            // 不喜欢的话
  
  // 陪伴偏好
  likesEmpathy?: string[]                                // 喜欢的共情方式
  dislikesAdvice?: boolean                               // 不喜欢说教
  likesEncouragement?: boolean                           // 喜欢鼓励
  prefersSilence?: boolean                               // 喜欢安静陪伴
  
  // 互动偏好
  likesQuestions?: boolean                               // 喜欢被问问题
  likesReflection?: boolean                              // 喜欢被理解感
  dislikesComfort?: boolean                              // 不喜欢空洞安慰
  
  // 学习数据
  feedbackCount: number                                  // 反馈次数
  lastUpdated: string
  confidence: number                                      // 置信度 0-1
}

/**
 * 解析 markdown frontmatter
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return { frontmatter: {}, body: content }
  }
  
  const frontmatterStr = match[1]
  const body = content.slice(match[0].length).trim()
  const frontmatter: Record<string, string> = {}
  
  frontmatterStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(':').trim()
    }
  })
  
  return { frontmatter, body }
}

/**
 * 解析日期字符串为时间戳
 */
function parseDate(dateStr: string): number {
  return new Date(dateStr).getTime()
}

export class MemoryStore {
  private memoryDir: string = DEFAULT_MEMORY_DIR
  private indexCache: MemoryHeader[] | null = null

  /**
   * 初始化记忆存储
   */
  async initialize(): Promise<void> {
    try {
      const savedDir = await AsyncStorage.getItem(MEMORY_DIR_KEY)
      if (savedDir) {
        this.memoryDir = savedDir
      }
      await this.loadIndex()
    } catch (error) {
      console.error('MemoryStore初始化失败:', error)
    }
  }

  /**
   * 设置记忆目录
   */
  async setMemoryDir(dir: string): Promise<void> {
    this.memoryDir = dir
    await AsyncStorage.setItem(MEMORY_DIR_KEY, dir)
    this.indexCache = null
    await this.loadIndex()
  }

  /**
   * 获取记忆目录
   */
  getMemoryDir(): string {
    return this.memoryDir
  }

  /**
   * 加载索引缓存
   */
  private async loadIndex(): Promise<void> {
    try {
      const indexJson = await AsyncStorage.getItem(MEMORY_STORAGE_KEY)
      if (indexJson) {
        this.indexCache = JSON.parse(indexJson)
      } else {
        this.indexCache = []
      }
    } catch (error) {
      console.error('加载记忆索引失败:', error)
      this.indexCache = []
    }
  }

  /**
   * 保存索引缓存
   */
  private async saveIndex(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        MEMORY_STORAGE_KEY,
        JSON.stringify(this.indexCache)
      )
    } catch (error) {
      console.error('保存记忆索引失败:', error)
    }
  }

  /**
   * 获取存储键名
   */
  private getStorageKey(filename: string): string {
    return `${this.memoryDir}_${filename}`
  }

  /**
   * 保存记忆
   */
  async saveMemory(record: MemoryRecord): Promise<void> {
    const { frontmatter, content } = this.separateFrontmatter(record)
    const markdown = this.buildMarkdown(frontmatter, content)
    
    const key = this.getStorageKey(record.name + '.md')
    await AsyncStorage.setItem(key, markdown)
    
    // 更新索引
    const header: MemoryHeader = {
      filename: record.name + '.md',
      filePath: key,
      mtimeMs: Date.now(),
      description: record.description,
      type: record.type,
      trigger: record.trigger,
      emotion: record.emotion,
    }
    
    this.indexCache = this.indexCache || []
    const existingIndex = this.indexCache.findIndex(h => h.filename === header.filename)
    if (existingIndex >= 0) {
      this.indexCache[existingIndex] = header
    } else {
      this.indexCache.unshift(header)
    }
    
    await this.saveIndex()
  }

  /**
   * 分离 frontmatter 和正文
   */
  private separateFrontmatter(record: MemoryRecord): { frontmatter: Record<string, string>; content: string } {
    const frontmatter: Record<string, string> = {
      name: record.name,
      description: record.description,
      type: record.type,
    }
    
    if (record.trigger) frontmatter.trigger = record.trigger
    if (record.emotion) frontmatter.emotion = record.emotion
    if (record.intensity) frontmatter.intensity = String(record.intensity)
    if (record.cycleDate) frontmatter.cycleDate = record.cycleDate
    if (record.cycleLength) frontmatter.cycleLength = String(record.cycleLength)
    if (record.copingMethod) frontmatter.copingMethod = record.copingMethod
    if (record.effectiveness) frontmatter.effectiveness = String(record.effectiveness)
    if (record.createdAt) frontmatter.createdAt = record.createdAt
    if (record.updatedAt) frontmatter.updatedAt = record.updatedAt
    
    return { frontmatter, content: record.content }
  }

  /**
   * 构建 markdown
   */
  private buildMarkdown(frontmatter: Record<string, string>, content: string): string {
    const fmLines = Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
    return `---\n${fmLines}\n---\n\n${content}`
  }

  /**
   * 读取记忆
   */
  async readMemory(filename: string): Promise<MemoryRecord | null> {
    try {
      const key = this.getStorageKey(filename)
      const markdown = await AsyncStorage.getItem(key)
      if (!markdown) return null
      
      const { frontmatter, body } = parseFrontmatter(markdown)
      
      const record: MemoryRecord = {
        name: frontmatter.name || filename.replace('.md', ''),
        description: frontmatter.description || '',
        type: frontmatter.type as Heart芽MemoryType,
        content: body,
        filePath: key,
        trigger: frontmatter.trigger,
        emotion: frontmatter.emotion,
        intensity: frontmatter.intensity ? parseInt(frontmatter.intensity) : undefined,
        cycleDate: frontmatter.cycleDate,
        cycleLength: frontmatter.cycleLength ? parseInt(frontmatter.cycleLength) : undefined,
        copingMethod: frontmatter.copingMethod,
        effectiveness: frontmatter.effectiveness ? parseInt(frontmatter.effectiveness) : undefined,
        createdAt: frontmatter.createdAt || new Date().toISOString(),
        updatedAt: frontmatter.updatedAt || new Date().toISOString(),
      }
      
      return record
    } catch (error) {
      console.error('读取记忆失败:', error)
      return null
    }
  }

  /**
   * 删除记忆
   */
  async deleteMemory(filename: string): Promise<void> {
    try {
      const key = this.getStorageKey(filename)
      await AsyncStorage.removeItem(key)
      
      if (this.indexCache) {
        this.indexCache = this.indexCache.filter(h => h.filename !== filename)
        await this.saveIndex()
      }
    } catch (error) {
      console.error('删除记忆失败:', error)
    }
  }

  /**
   * 查询记忆
   */
  async queryMemories(params: MemoryQueryParams): Promise<MemoryHeader[]> {
    await this.loadIndex()
    
    let results = [...(this.indexCache || [])]
    
    if (params.type) {
      results = results.filter(h => h.type === params.type)
    }
    
    if (params.emotion) {
      results = results.filter(h => h.emotion === params.emotion)
    }
    
    if (params.trigger) {
      results = results.filter(h => 
        h.trigger?.toLowerCase().includes(params.trigger!.toLowerCase())
      )
    }
    
    if (params.limit) {
      results = results.slice(0, params.limit)
    }
    
    return results
  }

  /**
   * 获取所有记忆
   */
  async getAllMemories(): Promise<MemoryHeader[]> {
    await this.loadIndex()
    return this.indexCache || []
  }

  /**
   * 获取记忆统计
   */
  async getStats(): Promise<MemoryStats> {
    await this.loadIndex()
    const memories = this.indexCache || []
    
    const byType: Record<string, number> = {}
    const byEmotion: Record<string, number> = {}
    const byTrigger: Record<string, number> = {}
    
    let recentCount = 0
    let oldestDate: string | null = null
    let newestDate: string | null = null
    
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    
    memories.forEach(m => {
      // 按类型统计
      if (m.type) {
        byType[m.type] = (byType[m.type] || 0) + 1
      }
      
      // 按情绪统计
      if (m.emotion) {
        byEmotion[m.emotion] = (byEmotion[m.emotion] || 0) + 1
      }
      
      // 按触发因素统计
      if (m.trigger) {
        byTrigger[m.trigger] = (byTrigger[m.trigger] || 0) + 1
      }
      
      // 最近7天统计
      if (m.mtimeMs > sevenDaysAgo) {
        recentCount++
      }
      
      // 最旧/最新日期
      const dateStr = new Date(m.mtimeMs).toISOString().split('T')[0]
      if (!oldestDate || dateStr < oldestDate) oldestDate = dateStr
      if (!newestDate || dateStr > newestDate) newestDate = dateStr
    })
    
    return {
      totalCount: memories.length,
      byType: byType as Record<Heart芽MemoryType, number>,
      byEmotion,
      byTrigger,
      recentCount,
      oldestDate,
      newestDate,
    }
  }

  /**
   * 生成索引内容 (MEMORY.md)
   */
  async getEntrypointContent(): Promise<string> {
    await this.loadIndex()
    const memories = this.indexCache || []
    
    if (memories.length === 0) {
      return `# 心芽记忆\n\n暂无记录。开始倾诉后，记忆将自动保存于此。`
    }
    
    const lines = ['# 心芽记忆', '']
    
    // 按类型分组
    const grouped = new Map<string, MemoryHeader[]>()
    memories.forEach(m => {
      const type = m.type || 'other'
      if (!grouped.has(type)) {
        grouped.set(type, [])
      }
      grouped.get(type)!.push(m)
    })
    
    // 输出分组
    for (const [type, items] of grouped) {
      lines.push(`## ${type}`, '')
      items.forEach(m => {
        const desc = m.description ? ` — ${m.description}` : ''
        const emotion = m.emotion ? `[${m.emotion}] ` : ''
        lines.push(`- ${emotion}${m.filename.replace('.md', '')}${desc}`)
      })
      lines.push('')
    }
    
    return lines.join('\n')
  }

  // ========== 偏好学习功能 ==========

  /**
   * 获取用户偏好
   */
  async getUserPreference(): Promise<UserPreference> {
    try {
      const json = await AsyncStorage.getItem(PREFERENCE_KEY)
      if (json) {
        return JSON.parse(json)
      }
    } catch (e) {
      console.error('获取偏好失败:', e)
    }
    return { feedbackCount: 0, lastUpdated: new Date().toISOString(), confidence: 0 }
  }

  /**
   * 更新用户偏好 (从反馈学习)
   */
  async learnFromFeedback(
    userMessage: string,
    aiResponse: string,
    feedback: 'positive' | 'negative' | 'neutral'
  ): Promise<void> {
    const pref = await this.getUserPreference()
    
    // 分析用户消息特征
    const msgLower = userMessage.toLowerCase()
    
    // 学习喜欢的话
    if (feedback === 'positive') {
      // 提取AI回复中的关键词作为"喜欢"的话
      const positivePhrases = ['我懂', '心疼', '听起来', '不容易', '陪着你', '理解']
      positivePhrases.forEach(phrase => {
        if (aiResponse.includes(phrase) && !pref.likesPhrases?.includes(phrase)) {
          pref.likesPhrases = [...(pref.likesPhrases || []), phrase]
        }
      })
      
      // 学习长度偏好
      if (aiResponse.length < 50) {
        pref.preferredLength = '极短'
      } else if (aiResponse.length < 100) {
        pref.preferredLength = '短'
      }
    }
    
    // 学习不喜欢的话
    if (feedback === 'negative') {
      // 提取AI回复中可能引起不满的词
      const negativePhrases = ['你应该', '可以尝试', '首先', '建议', '但是']
      negativePhrases.forEach(phrase => {
        if (aiResponse.includes(phrase)) {
          pref.dislikesPhrases = [...(pref.dislikesPhrases || []), phrase]
        }
      })
      
      // 检测是否不喜欢说教
      if (aiResponse.includes('建议') || aiResponse.includes('可以')) {
        pref.dislikesAdvice = true
      }
    }
    
    // 检测沟通风格
    if (userMessage.includes('...') || userMessage.includes('嗯')) {
      pref.preferredTone = '温暖'
    }
    if (userMessage.length < 20) {
      pref.preferredLength = '极短'
    }
    
    // 更新统计
    pref.feedbackCount += 1
    pref.lastUpdated = new Date().toISOString()
    pref.confidence = Math.min(pref.feedbackCount / 10, 1)  // 10次反馈后置信度=1
    
    await AsyncStorage.setItem(PREFERENCE_KEY, JSON.stringify(pref))
    console.log('[偏好学习] 已更新, 反馈次数:', pref.feedbackCount)
  }

  /**
   * 获取偏好摘要 (用于AI上下文)
   */
  async getPreferenceSummary(): Promise<string> {
    const pref = await this.getUserPreference()
    
    if (pref.feedbackCount === 0) {
      return ''
    }
    
    const parts: string[] = []
    
    if (pref.preferredLength) {
      parts.push(`偏好长度: ${pref.preferredLength}`)
    }
    if (pref.preferredTone) {
      parts.push(`偏好语气: ${pref.preferredTone}`)
    }
    if (pref.likesPhrases && pref.likesPhrases.length > 0) {
      parts.push(`喜欢听: ${pref.likesPhrases.slice(0, 3).join('、')}`)
    }
    if (pref.dislikesAdvice) {
      parts.push('不喜欢: 说教/给建议')
    }
    if (pref.dislikesPhrases && pref.dislikesPhrases.length > 0) {
      parts.push(`不喜欢: ${pref.dislikesPhrases.slice(0, 3).join('、')}`)
    }
    
    return parts.join('; ')
  }

  // ========== 时间轴回顾功能 ==========

  /**
   * 获取时间轴记忆 (按日期排序)
   */
  async getTimelineMemories(limit: number = 50): Promise<MemoryHeader[]> {
    await this.loadIndex()
    const memories = this.indexCache || []
    
    // 按时间倒序
    return memories
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, limit)
  }

  /**
   * 获取里程碑 (重要时刻)
   */
  async getMilestones(): Promise<MemoryRecord[]> {
    await this.loadIndex()
    const memories = this.indexCache || []
    
    // 查找标记为milestone的记录
    const milestones: MemoryRecord[] = []
    
    for (const header of memories) {
      if (header.type === 'milestone') {
        const record = await this.readMemory(header.filename)
        if (record) milestones.push(record)
      }
    }
    
    return milestones.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  /**
   * 获取去年同期记忆
   */
  async getSamePeriodLastYear(): Promise<MemoryHeader[]> {
    await this.loadIndex()
    const memories = this.indexCache || []
    
    const now = new Date()
    const lastYear = now.getFullYear() - 1
    const month = now.getMonth()
    const day = now.getDate()
    
    // 查找去年同月同日附近的记录 (±7天)
    const targetStart = new Date(lastYear, month, day - 7).getTime()
    const targetEnd = new Date(lastYear, month, day + 7).getTime()
    
    return memories.filter(m => 
      m.mtimeMs >= targetStart && m.mtimeMs <= targetEnd
    )
  }

  /**
   * 获取月度记忆统计
   */
  async getMonthlyStats(year: number, month: number): Promise<{
    count: number
    emotions: Record<string, number>
    triggers: Record<string, number>
  }> {
    await this.loadIndex()
    const memories = this.indexCache || []
    
    const startDate = new Date(year, month - 1, 1).getTime()
    const endDate = new Date(year, month, 0).getTime()
    
    const monthMemories = memories.filter(m => 
      m.mtimeMs >= startDate && m.mtimeMs <= endDate
    )
    
    const emotions: Record<string, number> = {}
    const triggers: Record<string, number> = {}
    
    monthMemories.forEach(m => {
      if (m.emotion) {
        emotions[m.emotion] = (emotions[m.emotion] || 0) + 1
      }
      if (m.trigger) {
        triggers[m.trigger] = (triggers[m.trigger] || 0) + 1
      }
    })
    
    return {
      count: monthMemories.length,
      emotions,
      triggers,
    }
  }

  /**
   * 清空所有记忆 (谨慎使用)
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const memoryKeys = keys.filter(k => k.startsWith(this.memoryDir))
      await AsyncStorage.multiRemove(memoryKeys)
      this.indexCache = []
      await this.saveIndex()
    } catch (error) {
      console.error('清空记忆失败:', error)
    }
  }
}

// 导出单例
export const memoryStore = new MemoryStore()