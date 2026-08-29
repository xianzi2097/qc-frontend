import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── 主题初始化：从 localStorage 读取，在 React 渲染前应用，避免闪烁 ──
const savedTheme = localStorage.getItem('codenova-theme');
if (savedTheme && savedTheme !== 'orange') {
  if (savedTheme === 'custom') {
    const hue = localStorage.getItem('codenova-custom-hue-value');
    if (hue) {
      document.documentElement.setAttribute('data-theme', 'custom');
      document.documentElement.style.setProperty('--custom-hue', hue);
    }
  } else {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
