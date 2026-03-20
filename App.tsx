import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import ConfessionScreen from './src/screens/ConfessionScreen';
import MessageScreen from './src/screens/MessageScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import TabBar from './src/components/TabBar';
import CenterMenu from './src/components/CenterMenu';

type ScreenName = 'Home' | 'Confession' | 'Message' | 'Profile' | 'Community';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<ScreenName>('Home');
  const [menuVisible, setMenuVisible] = useState(false);

  const handleCenterPress = () => {
    setMenuVisible(true);
  };

  const handleMenuSelect = (optionId: string) => {
    if (optionId === 'confession') {
      setCurrentRoute('Confession');
    } else if (optionId === 'treehole') {
      console.log('跳转到树洞');
    } else if (optionId === 'timemachine') {
      console.log('跳转到时光机');
    }
  };

  const renderScreen = () => {
    switch (currentRoute) {
      case 'Home':
        return <HomeScreen navigation={{ navigate: (name: ScreenName) => setCurrentRoute(name) }} menuVisible={menuVisible} />;
      case 'Confession':
        return <ConfessionScreen navigation={{ navigate: (name: ScreenName) => setCurrentRoute(name), goBack: () => setCurrentRoute('Home') }} />;
      case 'Message':
        return <MessageScreen navigation={{ navigate: (name: ScreenName) => setCurrentRoute(name) }} />;
      case 'Profile':
        return <ProfileScreen navigation={{ navigate: (name: ScreenName) => setCurrentRoute(name) }} />;
      case 'Community':
        return <CommunityScreen navigation={{ navigate: (name: ScreenName) => setCurrentRoute(name) }} />;
      default:
        return <HomeScreen navigation={{ navigate: (name: ScreenName) => setCurrentRoute(name) }} menuVisible={menuVisible} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <View style={styles.tabBarContainer}>
        <TabBar 
          navigation={{ navigate: (name: ScreenName) => setCurrentRoute(name) }} 
          currentRoute={currentRoute}
          onCenterPress={handleCenterPress}
        />
      </View>
      <CenterMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)}
        onSelect={handleMenuSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
