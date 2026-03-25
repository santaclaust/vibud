/**
 * CloudNotificationService
 * 同时写入 CloudBase + 发送本地通知
 * 统一的消息通知入口
 */

import notificationService from './NotificationService';
import { saveMessage } from './CloudBaseService';

// 当前用户ID（由 App.tsx 注入）
let currentUserId: string = 'guest';

export const setUserId = (uid: string) => {
  currentUserId = uid;
};

// 通知类型
export type NotifyType = 
  | 'ai_reply'      // AI回复
  | 'treehole_liked' // 树洞被赞
  | 'timemachine_reminder' // 时光机到期提醒
  | 'daily_quote'    // 每日签语
  | 'emotion_saved' // 情绪已记录
  | 'system';        // 系统通知

// 通知标题映射
const TITLE_MAP: Record<NotifyType, string> = {
  ai_reply: '💬 AI 已回复',
  treehole_liked: '❤️ 你的树洞被点亮',
  timemachine_reminder: '📮 时光机提醒',
  daily_quote: '🌅 今日签语',
  emotion_saved: '🌿 心绪已记录',
  system: '🔔 心芽通知',
};

// 发送通知（CloudBase写入 + 本地推送）
export const sendNotification = async (
  type: NotifyType,
  content: string,
  cloudUserId?: string
) => {
  const uid = cloudUserId || currentUserId;
  const title = TITLE_MAP[type] || '心芽通知';

  // 1. 写入 CloudBase（异步，不阻塞）
  try {
    await saveMessage({
      userId: uid,
      type,
      title,
      content,
      read: false,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[CloudNotify] 写入CloudBase失败:', err);
  }

  // 2. 发送本地推送（异步）
  try {
    await notificationService.sendImmediate({ title, body: content, data: { type } });
  } catch (err) {
    console.error('[CloudNotify] 本地推送失败:', err);
  }
};

// 快捷方法
export const notifyAIReply = (replyText: string, cloudUserId?: string) => {
  const body = replyText.length > 50 ? replyText.slice(0, 50) + '...' : replyText;
  return sendNotification('ai_reply', body, cloudUserId);
};

export const notifyEmotionSaved = (keywords: string[], cloudUserId?: string) => {
  const body = `已记录心绪：${keywords.join(' · ')}`;
  return sendNotification('emotion_saved', body, cloudUserId);
};

export const notifyDailyQuote = (quote: string, cloudUserId?: string) => {
  const body = quote.length > 50 ? quote.slice(0, 50) + '...' : quote;
  return sendNotification('daily_quote', body, cloudUserId);
};

export const notifyTreeHoleLiked = (postPreview: string, cloudUserId?: string) => {
  const preview = postPreview.length > 20 ? postPreview.slice(0, 20) + '...' : postPreview;
  return sendNotification('treehole_liked', `「${preview}」被点亮了爱心`, cloudUserId);
};

export const notifyTimeMachineReminder = (entryPreview: string, daysLeft: number, cloudUserId?: string) => {
  const preview = entryPreview.length > 15 ? entryPreview.slice(0, 15) + '...' : entryPreview;
  return sendNotification('timemachine_reminder', `「${preview}」将在 ${daysLeft} 天后开启`, cloudUserId);
};
