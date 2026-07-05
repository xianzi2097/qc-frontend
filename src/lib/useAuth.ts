import { useState, useCallback } from 'react';

export interface PortalUser {
  username: string;
  role: 'teacher' | 'student' | 'admin';
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

function readToken(): string | null {
  return localStorage.getItem('auth_token');
}

// ── 劫持全局 fetch，自动带 token ──
const origFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  // 登录/注册接口不需要 token
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
  if (url.includes('/api/login') || url.includes('/api/register')) {
    return origFetch(input, init);
  }

  const token = readToken();
  if (token) {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const res = await origFetch(input, { ...init, headers });
    if (res.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
    return res;
  }
  return origFetch(input, init);
};

/** 统一的身份获取 hook，支持登录/登出 */
export function useAuth() {
  const [user, setUser] = useState<PortalUser | null>(readUser);

  const login = useCallback((u: PortalUser, token?: string) => {
    localStorage.setItem('user', JSON.stringify(u));
    if (token) localStorage.setItem('auth_token', token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  return {
    user,
    username: user?.username ?? '',
    role: user?.role ?? 'teacher',
    isLoggedIn: !!user,
    token: readToken(),
    login,
    logout,
  };
}
