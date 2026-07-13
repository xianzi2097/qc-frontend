import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface LoadingContextType {
  loading: boolean;
  text: string;
  show: (text?: string) => void;
  hide: () => void;
  /** 包装异步操作：自动 show → await → hide */
  wrap: <T>(promise: Promise<T>, text?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType>(null!);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('加载中...');

  const show = useCallback((t?: string) => {
    setText(t || '加载中...');
    setLoading(true);
  }, []);

  const hide = useCallback(() => setLoading(false), []);

  const wrap = useCallback(async <T,>(promise: Promise<T>, t?: string): Promise<T> => {
    show(t);
    try { return await promise; }
    finally { hide(); }
  }, [show, hide]);

  return (
    <LoadingContext.Provider value={{ loading, text, show, hide, wrap }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
