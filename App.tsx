import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import ConfessionScreen from './src/screens/ConfessionScreen';
import MessageScreen from './src/screens/MessageScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import TreeHoleScreen from './src/screens/TreeHoleScreen';
import TimeMachineScreen from './src/screens/TimeMachineScreen';
import TabBar from './src/components/TabBar';
import CenterMenu from './src/components/CenterMenu';
import { useTheme } from './src/hooks/useTheme';
import notificationService from './src/services/NotificationService';
import { initCloudBase, reinitCloudBase, saveUserProfile, getUserProfile, logout } from './src/services/CloudBaseService';
import logger from './src/services/Logger';

type ScreenName = 'Home' | 'Confession' | 'Message' | 'Profile' | 'Community' | 'TreeHole' | 'TimeMachine';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<ScreenName>('Home');
  const [menuVisible, setMenuVisible] = useState(false);
  const [userId, setUserId] = useState<string>('guest');
  const [userInfo, setUserInfo] = useState<any>({ nickname: '游客', stats: { confessionCount: 0, treeholeCount: 0, timeMachineCount: 0, continuousDays: 0 } });
  
  const { mode: themeMode, setMode: setThemeMode, isDark, colors } = useTheme();

  // 用户初始化（获取 CloudBase 用户后创建/获取资料）
  const initUserProfile = useCallback(async (uid: string) => {
    let profile = await getUserProfile(uid);
    if (!profile) {
      await saveUserProfile({
        id: uid,
        nickname: '游客',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stats: { confessionCount: 0, treeholeCount: 0, timeMachineCount: 0, continuousDays: 0 }
      });
      profile = { id: uid, nickname: '游客', stats: { confessionCount: 0, treeholeCount: 0, timeMachineCount: 0, continuousDays: 0 } };
    }
    setUserInfo(profile);
  }, []);

  // 初始化 CloudBase + 获取用户
  useEffect(() => {
    const init = async () => {
      const cbOk = await initCloudBase();
      if (cbOk) {
        const authState = await import('./src/services/CloudBaseService').then(m => m.getAuthState());
        if (authState?.user) {
          setUserId(authState.user.uid);
          await initUserProfile(authState.user.uid);
        }
      }
      // 非 Web 端才初始化推送通知
      if (Platform.OS !== 'web') {
        await notificationService.init();
      }
      
      // 监听通知点击
      notificationService.addNotificationResponseReceivedListener((response) => {
        const { type, data } = notificationService.parseNotification(response.notification);
        logger.log('[App] 通知点击:', type, data);
        // 根据通知类型跳转
        if (type === 'ai_reply' || type === 'treehole_liked') {
          setCurrentRoute('Message');
        } else if (type === 'timemachine_reminder') {
          setCurrentRoute('TimeMachine');
        } else if (type === 'daily_checkin') {
          setCurrentRoute('Home');
        }
      });
    };
    init();
  }, [initUserProfile]);

  const handleCenterPress = () => setMenuVisible(true);
  const handleMenuSelect = (optionId: string) => {
    const map: Record<string, ScreenName> = { confession: 'Confession', treehole: 'TreeHole', timemachine: 'TimeMachine' };
    if (map[optionId]) setCurrentRoute(map[optionId]);
  };

  const handleLogout = useCallback(async () => {
    logger.log('[App] onLogout 开始');
    try {
      await logout();
      const authState = await import('./src/services/CloudBaseService').then(m => m.getAuthState());
      if (authState?.user) {
        setUserId(authState.user.uid);
        setUserInfo({ nickname: '游客', stats: { confessionCount: 0, treeholeCount: 0, timeMachineCount: 0, continuousDays: 0 } });
      }
    } catch (err) {
      logger.error('[App] 重新登录失败:', err);
    }
  }, []);

  const handleCustomLogin = useCallback(async (username: string) => {
    logger.log('[App] onCustomLogin:', username);
    
    // 🆕 重新初始化 CloudBase（切换用户后需要新的登录状态）
    await reinitCloudBase();
    
    const newUid = `user_${username}_${Date.now()}`;
    setUserId(newUid);
    setUserInfo({ nickname: username, stats: { confessionCount: 0, treeholeCount: 0, timeMachineCount: 0, continuousDays: 0 } });
  }, []);

  const renderScreen = () => {
    const screenProps = { 
      navigation: { navigate: (n: ScreenName) => setCurrentRoute(n) }, 
      colors, 
      themeMode, 
      onThemeChange: setThemeMode,
      userId,
      userInfo,
      onLogout: handleLogout,
      onCustomLogin: handleCustomLogin,
    };
    
    return (
      <>
        <View style={{ flex: 1, display: currentRoute === 'Home' ? 'flex' : 'none' }}>
          <HomeScreen {...screenProps} menuVisible={menuVisible} />
        </View>
        {currentRoute === 'Confession' && <ConfessionScreen {...screenProps} goBack={() => setCurrentRoute('Home')} />}
        {currentRoute === 'TreeHole' && <TreeHoleScreen {...screenProps} goBack={() => setCurrentRoute('Home')} />}
        {currentRoute === 'TimeMachine' && <TimeMachineScreen {...screenProps} goBack={() => setCurrentRoute('Home')} />}
        {currentRoute === 'Message' && <MessageScreen {...screenProps} />}
        {currentRoute === 'Profile' && <ProfileScreen {...screenProps} />}
        {currentRoute === 'Community' && <CommunityScreen {...screenProps} />}
      </>
    );
  };

  const showTabBar = ['Home', 'Message', 'Profile', 'Community'].includes(currentRoute);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.content}>{renderScreen()}</View>
      {showTabBar && (
        <View style={styles.tabBarContainer}>
          <TabBar navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n) }} currentRoute={currentRoute} onCenterPress={handleCenterPress} colors={colors} />
        </View>
      )}
      <CenterMenu visible={menuVisible} onClose={() => setMenuVisible(false)} onSelect={handleMenuSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  tabBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});