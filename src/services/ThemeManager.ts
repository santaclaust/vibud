// 主题管理器 - openclaw风格的主题切换
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  card: string;
}

// 亮色主题
export const lightTheme: ThemeColors = {
  background: '#F9F9F9',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  border: '#E0E0E0',
  primary: '#4A90E2',
  card: '#FFFFFF',
};

// 暗色主题
export const darkTheme: ThemeColors = {
  background: '#1A1A1A',
  surface: '#2D2D2D',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  border: '#3D3D3D',
  primary: '#5BA0F2',
  card: '#2D2D2D',
};

const THEME_KEY = 'xinya_theme';

class ThemeManager {
  private mode: ThemeMode = 'light';

  async init(): Promise<ThemeMode> {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        this.mode = saved;
      }
    } catch (e) {
      console.error('Load theme failed:', e);
    }
    return this.mode;
  }

  getMode(): ThemeMode {
    return this.mode;
  }

  getColors(systemDark: boolean): ThemeColors {
    if (this.mode === 'system') {
      return systemDark ? darkTheme : lightTheme;
    }
    return this.mode === 'dark' ? darkTheme : lightTheme;
  }

  async setMode(mode: ThemeMode): Promise<void> {
    this.mode = mode;
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (e) {
      console.error('Save theme failed:', e);
    }
  }

  async cycle(): Promise<ThemeMode> {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const idx = modes.indexOf(this.mode);
    const next = modes[(idx + 1) % 3];
    await this.setMode(next);
    return next;
  }
}

export const themeManager = new ThemeManager();
export default themeManager;
