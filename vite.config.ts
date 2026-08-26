import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

/**
 * 开发代理说明：
 * - /api → 本机 FastAPI（后端大脑）
 * - /Scratch /docs /course /share → 这些路径在正式环境由 Caddy 托管，
 *   开发时转发到本机 Caddy（默认 :80），保证主页上的跨站链接全部可用。
 * - 若 Caddy 不在 80 端口，启动时设环境变量：QC_ORIGIN=http://127.0.0.1:端口
 */
const SITE_ORIGIN = process.env.QC_ORIGIN ?? 'http://127.0.0.1'

export default defineConfig({
  base: '/',
  build: {
    outDir: resolve(__dirname, '../../qc-pocket-space/frontend/dashboard'),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/Scratch': SITE_ORIGIN,
      '/docs': SITE_ORIGIN,
      '/course': SITE_ORIGIN,
      '/share': SITE_ORIGIN,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
