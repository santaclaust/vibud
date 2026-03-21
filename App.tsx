import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, useColorScheme } from 'react-native';
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

type ScreenName = 'Home' | 'Confession' | 'Message' | 'Profile' | 'Community' | 'TreeHole' | 'TimeMachine';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<ScreenName>('Home');
  const [menuVisible, setMenuVisible] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const systemColorScheme = useColorScheme();
  
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    themeManager.init().then(setThemeMode);
  }, []);

  const handleCenterPress = () => setMenuVisible(true);

  const handleMenuSelect = (optionId: string) => {
    if (optionId === 'confession') setCurrentRoute('Confession');
    else if (optionId === 'treehole') setCurrentRoute('TreeHole');
    else if (optionId === 'timemachine') setCurrentRoute('TimeMachine');
  };

  const renderScreen = () => {
    switch (currentRoute) {
      case 'Home': return <HomeScreen navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n) }} menuVisible={menuVisible} />;
      case 'Confession': return <ConfessionScreen navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n), goBack: () => setCurrentRoute('Home') }} />;
      case 'Message': return <MessageScreen navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n) }} />;
      case 'Profile': return <ProfileScreen navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n) }} />;
      case 'Community': return <CommunityScreen navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n) }} />;
      case 'TreeHole': return <TreeHoleScreen navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n), goBack: () => setCurrentRoute('Home') }} />;
      case 'TimeMachine': return <TimeMachineScreen navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n), goBack: () => setCurrentRoute('Home') }} />;
      default: return <HomeScreen navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n) }} menuVisible={menuVisible} />;
    }
  };

  const showTabBar = currentRoute === 'Home' || currentRoute === 'Message' || currentRoute === 'Profile' || currentRoute === 'Community';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.content}>{renderScreen()}</View>
      {showTabBar && (
        <View style={styles.tabBarContainer}>
          <TabBar navigation={{ navigate: (n: ScreenName) => setCurrentRoute(n) }} currentRoute={currentRoute} onCenterPress={handleCenterPress} />
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
