/**
 * Judge0 API 接口层 — 预留对接
 * 后续部署 judge0 只需修改 JUDGE0_BASE_URL 和实现即可
 */

// ── 配置 ──────────────────────────────────────────────────
/**
 * Judge0 服务地址
 * - 开发环境：走 Vite 代理 `/judge0`（vite.config.ts 配置转发到真实 IP）
 * - 生产环境：由 Caddy 反向代理 `/judge0` → Judge0 服务
 * - 真实地址：http://192.168.2.158:2358（i3 家里的 Judge0）
 * - 以后内网穿透后改成穿透地址，如 https://xxx.ngrok.io
 */
const JUDGE0_BASE_URL = '/judge0';

// ── 语言映射 ──────────────────────────────────────────────
export type Language = 'python' | 'cpp';

export const LANGUAGE_CONFIG: Record<Language, { id: number; name: string; version: string }> = {
  python: { id: 71, name: 'Python', version: '3.8.1' },
  cpp:    { id: 54, name: 'C++',   version: 'GCC 9.2.0' },
};

// ── 类型定义（对齐 judge0 API） ──────────────────────────
export interface CompileRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
}

export interface CompileResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
  status: {
    id: number;
    description: string;
  };
}

export type JudgeStatus = 'online' | 'busy' | 'offline' | 'unconfigured';

interface WorkerInfo {
  queue: string;
  size: number;
  available: number;
  idle: number;
  working: number;
  paused: number;
  failed: number;
}

// ── 健康检查（状态灯用） ─────────────────────────────────
export async function checkJudgeStatus(): Promise<JudgeStatus> {
  if (!JUDGE0_BASE_URL) return 'unconfigured';
  try {
    const res = await fetch(`${JUDGE0_BASE_URL}/about`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return 'offline';
    const data = await res.json();
    if (data.version) return 'online';
    return 'offline';
  } catch {
    return 'offline';
  }
}

// ── 提交代码 ─────────────────────────────────────────────
export async function submitCode(req: CompileRequest): Promise<CompileResult> {
  if (!JUDGE0_BASE_URL) {
    // Mock 模式：模拟返回
    return mockExecute(req);
  }

  // 真实调用 judge0（wait=true 同步等待结果）
  const res = await fetch(`${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...req,
      enable_per_process_and_thread_time_limit: true,
      enable_per_process_and_thread_memory_limit: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Judge0 返回 ${res.status}`);
  }

  return res.json();
}

// ── Mock 执行（judge0 未接入时用） ────────────────────────
async function mockExecute(req: CompileRequest): Promise<CompileResult> {
  // 模拟网络延迟
  await new Promise(r => setTimeout(r, 500 + Math.random() * 500));

  const isPython = req.language_id === 71;

  // 简单模拟：把 stdin 原样输出
  if (req.source_code.includes('input()')) {
    return {
      stdout: req.stdin ? `${req.stdin}\n` : '\n',
      stderr: null,
      compile_output: null,
      time: '0.05',
      memory: 3800,
      status: { id: 3, description: 'Accepted' },
    };
  }

  // Hello World 模拟
  if (req.source_code.toLowerCase().includes('hello')) {
    return {
      stdout: 'Hello, World!\n',
      stderr: null,
      compile_output: null,
      time: '0.03',
      memory: 3200,
      status: { id: 3, description: 'Accepted' },
    };
  }

  // 默认
  return {
    stdout: isPython ? '(mock) 程序执行完成\n' : '(mock) 编译运行完成\n',
    stderr: null,
    compile_output: null,
    time: '0.04',
    memory: 3500,
    status: { id: 3, description: 'Accepted' },
  };
}
