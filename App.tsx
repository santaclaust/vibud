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
    const screenProps = { navigation: { navigate: (n: ScreenName) => setCurrentRoute(n) }, colors, themeMode, onThemeChange: setThemeMode };
    
    switch (currentRoute) {
      case 'Home': return <HomeScreen {...screenProps} menuVisible={menuVisible} />;
      case 'Confession': return <ConfessionScreen {...screenProps} goBack={() => setCurrentRoute('Home')} />;
      case 'Message': return <MessageScreen {...screenProps} />;
      case 'Profile': return <ProfileScreen {...screenProps} />;
      case 'Community': return <CommunityScreen {...screenProps} />;
      case 'TreeHole': return <TreeHoleScreen {...screenProps} goBack={() => setCurrentRoute('Home')} />;
      case 'TimeMachine': return <TimeMachineScreen {...screenProps} goBack={() => setCurrentRoute('Home')} />;
      default: return <HomeScreen {...screenProps} menuVisible={menuVisible} />;
    }
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
