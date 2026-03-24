import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, useColorScheme } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import ConfessionScreen from './src/screens/ConfessionScreen';
import MessageScreen from './src/screens/MessageScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import TreeHoleScreen from './src/screens/TreeHoleScreen';
import TimeMachineScreen from './src/screens/TimeMachineScreen';
import TabBar from './src/components/TabBar';
import CenterMenu from './src/components/CenterMenu';
import themeManager, { ThemeMode, lightTheme, darkTheme } from './src/services/ThemeManager';
import notificationService from './src/services/NotificationService';
import { initCloudBase, signInAnonymously, getAuthState, saveUserProfile, getUserProfile } from './src/services/CloudBaseService';

type ScreenName = 'Home' | 'Confession' | 'Message' | 'Profile' | 'Community' | 'TreeHole' | 'TimeMachine';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<ScreenName>('Home');
  const [menuVisible, setMenuVisible] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [userId, setUserId] = useState<string>('guest');
  const [userInfo, setUserInfo] = useState<any>({ nickname: '游客', stats: { confessionCount: 0, treeholeCount: 0, timeMachineCount: 0, continuousDays: 0 } });
  
  const systemColorScheme = useColorScheme();
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  // 初始化
  useEffect(() => {
    const init = async () => {
      // 主题
      themeManager.init().then(setThemeMode);
      
      // CloudBase 匿名登录
      const cbOk = await initCloudBase();
      if (cbOk) {
        try {
          await signInAnonymously();
          const authState = await getAuthState();
          if (authState?.user) {
            const uid = authState.user.uid;
            setUserId(uid);
            
            // 尝试获取已有资料
            let profile = await getUserProfile(uid);
            if (!profile) {
              // 首次创建用户资料
              await saveUserProfile({
                id: uid,
                nickname: '游客',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                stats: { confessionCount: 0, treeholeCount: 0, timeMachineCount: 0, continuousDays: 0 }
              });
              profile = { id: uid, nickname: '游客', stats: { confessionCount: 0, treeholeCount: 0, timeMachineCount: 0, continuousDays: 0 } } as any;
            }
            setUserInfo(profile);
          }
        } catch (err) {
          console.error('[CloudBase] 匿名登录失败:', err);
        }
      }
    };
    
    init();
    notificationService.init();
  }, []);

  const handleCenterPress = () => setMenuVisible(true);

  const handleMenuSelect = (optionId: string) => {
    if (optionId === 'confession') setCurrentRoute('Confession');
    else if (optionId === 'treehole') setCurrentRoute('TreeHole');
    else if (optionId === 'timemachine') setCurrentRoute('TimeMachine');
  };

  // 渲染当前页面
  const renderScreen = () => {
    const screenProps = { 
      navigation: { navigate: (n: ScreenName) => setCurrentRoute(n) }, 
      colors, 
      themeMode, 
      onThemeChange: setThemeMode,
      userId,
      userInfo
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

  const showTabBar = currentRoute === 'Home' || currentRoute === 'Message' || currentRoute === 'Profile' || currentRoute === 'Community';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.content}>{renderScreen()}</View>
      {showTabBar && (
        <View style={styles.tabBarContainer}>
          <TabBar 
            navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n) }} 
            currentRoute={currentRoute} 
            onCenterPress={handleCenterPress}
            colors={colors}
          />
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
