// 认证 Hook - 统一用户状态管理
import { useState, useEffect, useCallback } from 'react';
import { getAuthState, getCurrentUser, signInAnonymously } from '../services/CloudBaseService';

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化认证
  const initAuth = useCallback(async () => {
    try {
      const state = await getAuthState();
      if (state?.user) {
        setUserId(state.user.uid);
      } else {
        // 匿名登录
        await signInAnonymously();
        const user = await getCurrentUser();
        setUserId(user?.uid || null);
      }
    } catch (err) {
      console.error('[useAuth] 初始化失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { initAuth(); }, [initAuth]);

  return { userId, loading };
}