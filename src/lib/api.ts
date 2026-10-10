/**
 * lib/api.ts — 前端统一 API 层
 * 所有对后端的 fetch 收口在这里：组件不拼 URL、不解析响应结构。
 * 注意：useAuth 已劫持全局 fetch 自动附带 Bearer token（/api/login 除外），
 * 因此这里不需要手动处理鉴权头。
 */
import type { Course, Material, MaterialNode } from '../types/course';
import type { PortalUser } from './useAuth';

const nocache = () => `t=${Date.now()}`;

/** 老师用户名列表（主页课程广场筛选用） */
export async function fetchTeacherNames(): Promise<string[]> {
  const res = await fetch(`/api/users?${nocache()}`);
  const data = await res.json();
  if (data.status !== 'success') return [];
  return (data.users as { username: string; role: string }[])
    .filter(u => u.role === 'teacher')
    .map(u => u.username);
}

/** 某位老师的课程列表 */
async function fetchCoursesOf(teacher: string): Promise<Course[]> {
  const res = await fetch(`/api/courses?teacher=${encodeURIComponent(teacher)}&${nocache()}`);
  const data = await res.json();
  if (data.status !== 'success') return [];
  return (data.courses as Course[]).map(c => ({ ...c, teacher }));
}

/**
 * 课程列表。teacher 为 '全部' 时并发聚合所有老师的课程
 * （与旧版行为一致：后端不支持跨老师查询）。
 */
export async function fetchCourses(teachers: string[], teacher: string): Promise<Course[]> {
  if (teacher !== '全部') return fetchCoursesOf(teacher);
  const results = await Promise.all(
    teachers.map(t => fetchCoursesOf(t).catch(() => [] as Course[])),
  );
  return results.flat();
}

/** 课程课件/素材列表 */
export async function fetchMaterials(courseId: string, teacher: string): Promise<Material[]> {
  const res = await fetch(
    `/api/courses/${encodeURIComponent(courseId)}/materials?teacher=${encodeURIComponent(teacher)}&${nocache()}`,
  );
  const data = await res.json();
  return data.status === 'success' ? data.materials : [];
}

/** 获取资源列表（按 teacher + category 筛选） */
export async function fetchResources(_teachers: string[], teacher: string, category: string = ''): Promise<Course[]> {
  const url = `/api/resources?${nocache()}` + (category ? `&category=${category}` : '') + (teacher !== '全部' ? `&teacher=${teacher}` : '');
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'success') return [];
  const items = data.resources || data.courses || [];
  return items.map((r: any) => ({
    ...r,
    type: r.type || 'reference',
    format: r.format || 'folder',
    material_count: r.material_count || 0,
    teacher: r.teacher || '',
  }));
}

/** 获取资源文件树（返回单个 Material，tree 字段为递归文件树） */
export async function fetchResourceTree(resourceId: string, resourceUrl: string): Promise<Material[]> {
  const res = await fetch(`/api/resources/${encodeURIComponent(resourceId)}/tree?${nocache()}`);
  const data = await res.json();
  if (data.status !== 'success') return [];
  const tree = data.tree || [];
  // 转成 MaterialNode[] 格式（name/type/size/path/children）
  const toNodes = (nodes: any[]): MaterialNode[] => nodes.map(n => ({
    name: n.name,
    type: n.type === 'folder' || n.type === 'dir' ? 'dir' : 'file',
    size: n.size || 0,
    path: n.path,
    children: n.children ? toNodes(n.children) : undefined,
  }));
  return [{
    name: data.meta?.name || '资源文件',
    url: resourceUrl,
    tree: toNodes(tree),
  }];
}

/** V2 信封错误：code!==0 时抛出，msg 可直接给用户看 */
export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

/** V2 统一请求（信封拦截）：成功只返回 data，失败抛 ApiError(msg) */
export async function apiV2<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init });
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

/** 所有老师的全部课程聚合（主页侧边栏「在学课程」等一次性拉取） */
export async function fetchAllCourses(): Promise<Course[]> {
  const teachers = await fetchTeacherNames();
  return fetchCourses(teachers, '全部');
}

/** 移动课程所在书架：'courses'=课程（主页侧边栏「课程」），'books'=书架 */
export async function setShelf(courseId: string, shelf: 'books' | 'courses'): Promise<void> {
  const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/shelf`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shelf }),
  });
  const data = await res.json();
  if (data.status !== 'success') throw new Error(data.detail || '操作失败');
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



