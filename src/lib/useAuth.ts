import { useMemo } from 'react';

interface PortalUser {
  username: string;
  role: 'teacher' | 'student' | 'admin';
  nickname: string;
  avatar_path: string;
}

/** 统一的身份获取 hook，避免到处读 localStorage */
export function useAuth() {
  const user = useMemo<PortalUser | null>(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.username && parsed?.role ? parsed : null;
    } catch {
      return null;
    }
  }, []);

  return {
    user,
    username: user?.username ?? 'arin',
    role: user?.role ?? 'teacher',
    nickname: user?.nickname ?? 'Arin 老师',
    isLoggedIn: !!user,
  };
}
