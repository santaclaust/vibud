// 主题 Hook - 统一主题状态管理
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { themeManager, ThemeMode, ThemeColors } from '../services/ThemeManager';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');

  // 初始化主题
  useEffect(() => {
    themeManager.init().then(setModeState);
  }, []);

  // 切换主题
  const setMode = useCallback(async (newMode: ThemeMode) => {
    await themeManager.setMode(newMode);
    setModeState(newMode);
  }, []);

  // 循环切换
  const cycle = useCallback(async () => {
    const next = await themeManager.cycle();
    setModeState(next);
    return next;
  }, []);

  // 当前颜色
  const colors = useMemo((): ThemeColors => {
    return themeManager.getColors(systemColorScheme === 'dark');
  }, [mode, systemColorScheme]);

  const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');

  return { mode, setMode, cycle, colors, isDark };
}