import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { savePushToken, getAuthState } from './CloudBaseService';
import logger from './Logger';

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
  private pushToken: string | null = null;

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

      // 获取并保存 Push Token（仅真机，非 web）
      if (Device.isDevice && Platform.OS !== 'web') {
        await this.registerForPushNotificationsAsync();
      } else if (Platform.OS === 'web') {
        logger.log('[Notification] Web 环境跳过 Push Token 获取');
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('通知初始化失败:', error);
      return false;
    }
  }

  // 注册远程推送并获取 Token
  async registerForPushNotificationsAsync(): Promise<string | null> {
    // Web 环境不支持
    if (Platform.OS === 'web') {
      logger.log('[Notification] Web 环境不支持推送');
      return null;
    }

    if (!Device.isDevice) {
      logger.log('[Notification] 模拟机不支持推送');
      return null;
    }

    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: 'c8c0a7k9-l3e5-d4e6-f8a9-b0c1d2e3f4a5', // TODO: 替换为实际的 Expo 项目 ID
      });
      
      if (token) {
        this.pushToken = token;
        logger.log('[Notification] 获取到 Push Token:', token.slice(0, 20) + '...');
        
        // 保存到 CloudBase
        try {
          const authState = await getAuthState();
          if (authState?.user?.uid) {
            await savePushToken(authState.user.uid, token);
            logger.log('[Notification] Push Token 已保存到 CloudBase');
          }
        } catch (err) {
          logger.error('[Notification] 保存 Push Token 失败:', err);
        }
        
        return token;
      }
    } catch (error) {
      logger.error('[Notification] 获取 Push Token 失败:', error);
    }
    return null;
  }

  // 添加通知接收监听
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // 添加通知点击监听
  addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // 解析远程通知数据
  parseNotification(notification: Notifications.Notification): {
    type?: string;
    data?: any;
  } {
    const data = notification.request.content.data || {};
    return {
      type: data.type,
      data,
    };
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
