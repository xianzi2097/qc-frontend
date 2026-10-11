import { defineConfig } from '@playwright/test';

/**
 * e2e 配置（M5 方案 B）：
 * - 真前端(5173) + 真后端(8001)，webServer 自动拉起/回收，跑完不留进程
 * - 浏览器用系统 Edge（channel: 'msedge'）——零下载，不用 playwright install
 * - 不进 hooks 门禁：pre-push 只跑后端 231；e2e 手动 npx playwright test
 */
const BACKEND_DIR = '../../qc-pocket-space/backend_v2';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  workers: 1,               // 全局串行：多文件共享 e2e_student（密码重置/信箱），并行会互相踩
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'msedge',
    headless: false,          // 有头模式：需要给用户看过程时窗口可见（拍板 2026-10-10）
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: '.venv\\Scripts\\python.exe -m uvicorn main:app --port 8001',
      cwd: BACKEND_DIR,
      url: 'http://localhost:8001/api/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
