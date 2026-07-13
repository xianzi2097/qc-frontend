import { useEffect } from 'react';
import { useLoading } from '../../lib/useLoading';

export default function LoadingOverlay() {
  const { loading } = useLoading();

  useEffect(() => {
    const el = document.getElementById('splash-loader');
    if (!el) return;
    if (loading) {
      // 更新文字（可选）
      const p = el.querySelector('p');
      if (p) p.textContent = '加载中...';
    } else {
      el.style.display = 'none';
    }
  }, [loading]);

  return null;
}
