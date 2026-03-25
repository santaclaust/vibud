import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 配置通知处理
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 通知类型
export type NotificationType = 
  | 'ai_reply'      
  | 'treehole_liked' 
  | 'timemachine_reminder' 
  | 'daily_checkin';

// 通知服务
class NotificationService {
  private initialized = false;

  // 初始化
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('通知权限未授予');
        return false;
      }

      // Android 额外配置
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
        });

        await Notifications.setNotificationChannelAsync('timemachine', {
          name: '时光机提醒',
          importance: Notifications.AndroidImportance.HIGH,
          description: '写给未来自己的信即将到期',
        });
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('通知初始化失败:', error);
      return false;
    }
  }

  // 发送AI回复通知
  async notifyAIReply(text: string): Promise<void> {
    const body = text.length > 50 ? text.slice(0, 50) + '...' : text;
    await this.sendImmediate({
      title: '💬 AI 已回复',
      body: body,
      data: { type: 'ai_reply' },
    });
  }

  // 发送树洞点亮通知
  async notifyTreeHoleLiked(postText: string): Promise<void> {
    const preview = postText.length > 20 ? postText.slice(0, 20) + '...' : postText;
    await this.sendImmediate({
      title: '❤️ 你的树洞被点亮',
      body: `「${preview}」被点亮了爱心`,
      data: { type: 'treehole_liked' },
    });
  }

  // 发送时光机提醒
  async notifyTimeMachineReminder(entryText: string, daysLeft: number): Promise<void> {
    const preview = entryText.length > 15 ? entryText.slice(0, 15) + '...' : entryText;
    await this.sendImmediate({
      title: '📮 时光机提醒',
      body: `「${preview}」将在 ${daysLeft} 天后开启`,
      data: { type: 'timemachine_reminder' },
    });
  }

  // 发送每日签到提醒
  async notifyDailyCheckin(): Promise<void> {
    await this.sendImmediate({
      title: '🌅 新的一天',
      body: '来看看今天的签语吧',
      data: { type: 'daily_checkin' },
    });
  }

  // 立即发送通知
  async sendImmediate(params: {
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: params.data,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('发送通知失败:', error);
    }
  }

  // 定时发送（用于时光机）
  async scheduleTimeMachineNotification(
    entryText: string, 
    timestamp: number, 
    daysBefore: number = 7
  ): Promise<string | null> {
    const triggerTime = timestamp + (daysBefore * 24 * 60 * 60 * 1000);
    const now = Date.now();

    if (triggerTime <= now) return null;

    const preview = entryText.length > 15 ? entryText.slice(0, 15) + '...' : entryText;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📮 时光机提醒',
          body: `「${preview}」将在 ${daysBefore} 天后开启`,
          data: { type: 'timemachine_reminder', entryText },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerTime),
        },
      });
      return id;
    } catch (error) {
      console.error('定时通知失败:', error);
      return null;
    }
  }

  // 取消所有通知
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // 取消特定通知
  async cancel(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // 获取所有待发送通知
  async getScheduled(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
