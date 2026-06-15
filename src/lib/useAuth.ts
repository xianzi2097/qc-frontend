import { useState, useCallback } from 'react';

export interface PortalUser {
  username: string;
  role: 'teacher' | 'student' | 'admin';
  nickname: string;
  avatar_path: string;
}

function readUser(): PortalUser | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.username && parsed?.role ? parsed : null;
  } catch {
    return null;
  }
}

/** 统一的身份获取 hook，支持登录/登出 */
export function useAuth() {
  const [user, setUser] = useState<PortalUser | null>(readUser);

  const login = useCallback((u: PortalUser) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return {
    user,
    username: user?.username ?? '',
    role: user?.role ?? 'teacher',
    nickname: user?.nickname ?? '',
    isLoggedIn: !!user,
    login,
    logout,
  };
}
