/**
 * lib/api.ts — 前端统一 API 层
 * 所有对后端的 fetch 收口在这里：组件不拼 URL、不解析响应结构。
 * 注意：useAuth 已劫持全局 fetch 自动附带 Bearer token（/api/login 除外），
 * 因此这里不需要手动处理鉴权头。
 */
import type { Course, Material, TreeNode, Bucket } from '../types/course';
import type { PortalUser } from './useAuth';

const nocache = () => `t=${Date.now()}`;

// ═══ 资产族（V2：/api/assets · bucket 四值 · M5b-6） ═══

/** V2 资产行（列表/详情的 data 一行；publish 仅 owner/admin 在详情额外得） */
export interface AssetRow {
  id: string;
  owner_id: string;
  owner_name: string;
  bucket: Bucket;
  name: string;
  description: string;
  tags: string[];
  type: string;
  format: string;
  shareable?: boolean;
  created_at: string;
  publish?: { state?: string; message?: string; finished_at?: string };
}

/** V2 行 → 前端 Course 形状（teacher=owner_name，调用组件零改动） */
export const toCourse = (a: AssetRow): Course => ({
  id: a.id, name: a.name, type: a.type, format: a.format,
  description: a.description, tags: a.tags, bucket: a.bucket,
  teacher: a.owner_name, publish: a.publish, shareable: a.shareable,
});

/** 课程+书架全量（一次取数，取代旧「老师名单→逐师拉课」N+1 链） */
export async function fetchCourses(): Promise<Course[]> {
  const d = await apiV2<{ items: AssetRow[] }>(`/api/assets?${nocache()}`);
  return d.items.filter(a => a.bucket === 'books' || a.bucket === 'courses').map(toCourse);
}

/** 资料 / 软件下载 */
export async function fetchResources(category: 'reference' | 'download'): Promise<Course[]> {
  const d = await apiV2<{ items: AssetRow[] }>(`/api/assets?bucket=${category}&${nocache()}`);
  return d.items.map(toCourse);
}

/** 课件列表（仅课程族；V2 /lessons） */
export async function fetchMaterials(courseId: string): Promise<Material[]> {
  const d = await apiV2<{ items: Material[] }>(
    `/api/assets/${encodeURIComponent(courseId)}/lessons?${nocache()}`);
  return d.items;
}

/** 单层目录（逐层加载 P2） */
export async function fetchFileEntries(assetId: string, path: string = ''): Promise<TreeNode[]> {
  const d = await apiV2<{ entries: TreeNode[] }>(
    `/api/assets/${encodeURIComponent(assetId)}/files?path=${encodeURIComponent(path)}&${nocache()}`);
  return d.entries;
}

/** 路径按段编码（中文/空格/# 不断链），保留 / 分隔 */
const encPath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

/** 单文件下载；也用作 Scratch 课件目录基址（Scratch 拼 main.sb3，零改动） */
export const fileHref = (assetId: string, path: string) =>
  `/api/assets/${encodeURIComponent(assetId)}/files/download?path=${encPath(path)}`;

/** 目录/整包 zip 下载（全族开放，D33/D34：课程族须 shareable=true） */
export const zipHref = (assetId: string, path: string = '') =>
  `/api/assets/${encodeURIComponent(assetId)}/download${path ? `?path=${encPath(path)}` : ''}`;

/** Scratch 课件目录：以 / 结尾，Scratch 拼 main.sb3 / student.sb3 后即为文件下载点 */
export const scratchFolderHref = (assetId: string, lesson: string) => fileHref(assetId, `${lesson}/`);

/** V2 信封错误：code!==0 时抛出，msg 可直接给用户看 */
export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

/** V2 统一请求（信封拦截）：成功只返回 data，失败抛 ApiError(msg)；FormData 时不塞 json 头（让浏览器带 boundary） */
export async function apiV2<T = any>(path: string, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const res = await fetch(path, {
    headers: isForm ? {} : { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!body || typeof body.code !== 'number' || body.code !== 0) {
    throw new ApiError(body?.code ?? res.status, body?.msg ?? `请求失败(${res.status})`);
  }
  return body.data as T;
}

/** 登录（V2：POST /api/auth/login → {code,msg,data:{token,account}}） */
export async function login(username: string, password: string): Promise<{ user: PortalUser; token?: string }> {
  const data = await apiV2<any>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const a = data.account;
  return {
    user: { id: a.id, username: a.username, role: a.role, avatar_path: a.avatar_path },
    token: data.token,
  };
}

/** 通知后端退出（V2：/api/auth/logout；尽力而为，本地状态由调用方清理） */
export function logoutRequest(): void {
  apiV2('/api/auth/logout', { method: 'POST' }).catch(() => {});
}

/** 换预设头像（V2：PUT /api/accounts/{id}/avatar/preset，{preset:"avatar_07"}；token 即身份） */
export async function updateAvatar(avatarPath: string): Promise<void> {
  let id: string | undefined;
  try {
    id = JSON.parse(localStorage.getItem('user') || '{}')?.id;
  } catch { /* 交给下面抛错 */ }
  if (!id) throw new Error('缺少账号 id，请重新登录后重试');
  await apiV2(`/api/accounts/${encodeURIComponent(id)}/avatar/preset`, {
    method: 'PUT',
    body: JSON.stringify({ preset: avatarPath }),
  });
}

/** 所有课程+书架聚合（主页侧边栏「在学课程」等一次性拉取） */
export async function fetchAllCourses(): Promise<Course[]> {
  return fetchCourses();
}

/** 挪书架/挪分类（V2：PATCH bucket，替代旧 PUT /shelf） */
export async function setShelf(courseId: string, bucket: Bucket): Promise<void> {
  await apiV2(`/api/assets/${encodeURIComponent(courseId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ bucket }),
  });
}

// ═══ 用户设置（V2：/api/settings · 字段改名 · D20 主题四值） ═══

export interface RecentOpen {
  /** section=主页板块 / course=课程 */
  kind: 'section' | 'course';
  id: string;
  label: string;
  teacher?: string | null;
  type?: string | null;
  ts: number;
}

export interface UserSettings {
  theme: string;
  customHue: string;
  fontSize: number;
  sidebarExpanded: boolean;
  recentOpens: RecentOpen[];
}

const DEFAULT_SETTINGS = (): UserSettings =>
  ({ theme: '', customHue: '', fontSize: 16, sidebarExpanded: false, recentOpens: [] });

/** V2 形状 → 前端形状：组件只认 camelCase，翻译收口在这一层（调用方组件零改动） */
function fromV2(d?: {
  theme?: string; hue?: number; font_size?: number; sidebar?: boolean; recent_opens?: string[];
}): UserSettings {
  const recentOpens: RecentOpen[] = [];
  const seen = new Set<string>();                 // 按 (kind:id) 再兜一层，防历史脏数据双条
  for (const item of d?.recent_opens ?? []) {
    try {
      const r = JSON.parse(item);
      if (!r || typeof r.kind !== 'string' || typeof r.id !== 'string') continue;
      const key = `${r.kind}:${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // V2 的 item 不带 ts（去重要求串稳定）；缺省给最新值，避免被 HomePage 旧记录换算逻辑误伤
      recentOpens.push({ ...r, ts: typeof r.ts === 'number' ? r.ts : Number.MAX_SAFE_INTEGER } as RecentOpen);
    } catch { /* 脏条目丢弃 */ }
  }
  return {
    theme: d?.theme ?? '',
    customHue: d?.theme === 'custom' && typeof d?.hue === 'number' ? String(d.hue) : '',
    fontSize: d?.font_size ?? 16,
    sidebarExpanded: d?.sidebar === true,
    recentOpens,
  };
}

export async function fetchUserSettings(): Promise<UserSettings> {
  try {
    return fromV2(await apiV2(`/api/settings?${nocache()}`));
  } catch {
    return DEFAULT_SETTINGS();   // 游客 401 / 失败 → 默认值（与旧行为一致，调用方静默回退）
  }
}

/** 记录一次打开（V2：item=不透明字符串 ≤200，服务端整串去重置顶、上限 6）
 *  序列化不带 ts —— 同一 (kind,id) 重复打开必须是同一串，否则去重失效；超长先截标签 */
export async function recordRecentOpen(entry: Omit<RecentOpen, 'ts'>): Promise<void> {
  let label = entry.label;
  const build = () => JSON.stringify({ ...entry, label });
  let item = build();
  while (item.length > 200 && label.length > 0) {
    label = label.slice(0, Math.max(0, label.length - 5));
    item = build();
  }
  if (item.length > 200) return;
  await apiV2('/api/settings/recent-opens', {
    method: 'POST',
    body: JSON.stringify({ item }),
  });
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const body: Record<string, unknown> = {};
  if (patch.theme !== undefined) body.theme = patch.theme;           // ''/green/blue/custom（D20）
  if (patch.customHue) {                                             // 自定义色才带 hue；选预设不动旧值
    const hue = parseInt(patch.customHue, 10);
    if (!isNaN(hue) && hue >= 0 && hue <= 360) body.hue = hue;
  }
  if (patch.fontSize !== undefined) body.font_size = patch.fontSize; // 12–28（调用方已 clamp）
  if (patch.sidebarExpanded !== undefined) body.sidebar = patch.sidebarExpanded;
  const data = await apiV2(`/api/settings?${nocache()}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return fromV2(data);
}



