import { useState, useCallback, useEffect } from 'react';

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

// ── ponytail: 劫持全局 fetch，自动带 token ──
// 为什么放模块顶层：所有页面都需要带 token，import 即生效，不需要每个组件单独 wrap。
// 缺点：副作用隐蔽，import useAuth 就会触发。项目小，可接受。
const origFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  // 登录/注册接口不需要 token
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
  if (url.includes('/api/login')) {
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
    // 403 权限不足：提示用户重新登录
    if (res.status === 403) {
      const data = await res.clone().json().catch(() => null);
      alert(data?.detail || '权限不足，请重新登录');
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
  const [validating, setValidating] = useState(true);

  // ── 页面加载时验证 token 有效性 ──
  useEffect(() => {
    const storedUser = readUser();
    const storedToken = readToken();

    // 没有 user 或 token，直接标记为未登录
    if (!storedUser || !storedToken) {
      if (storedUser && !storedToken) {
        // 有 user 但没 token（旧缓存），清除
        localStorage.removeItem('user');
        setUser(null);
      }
      setValidating(false);
      return;
    }

    // 用 /api/user/profile 验证 token 是否仍有效
    fetch('/api/user/profile')
      .then(res => {
        if (!res.ok) {
          // token 无效或用户已被删除，清除登录状态
          localStorage.removeItem('user');
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      })
      .catch(() => {
        // 网络错误不清除，可能是暂时断网
      })
      .finally(() => setValidating(false));
  }, []);

  const login = useCallback((u: PortalUser, token?: string) => {
    localStorage.setItem('user', JSON.stringify(u));
    if (token) localStorage.setItem('auth_token', token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    fetch('/api/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
    }).catch(() => {});
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  return {
    user,
    username: user?.username ?? '',
    role: user?.role ?? 'teacher',
    isLoggedIn: !!user && !validating,
    validating,
    token: readToken(),
    login,
    logout,
  };
}
