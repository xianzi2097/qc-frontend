import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/** M5b-6 资产族 · e2e（先红后绿）
 *  S1 公开读面（E28~E29）：主页课程/资料展示切 V2 assets
 *  P4（2026-10-12 拍板）：卡片「N 个课件」计数不显示（后端零改）
 *  Scratch 加载零改（folder = files/download?path=… 以 / 结尾拼 main.sb3）
 */

const ADMIN = 'admin';
const ADMIN_PW = '111111';
const TCHR = 'e2e_teacher';
const TCHR_PW = 'e2e-pass-123';

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { username: ADMIN, password: ADMIN_PW } });
  const body = await res.json();
  expect(body.code, 'admin 登录失败').toBe(0);
  return body.data.token;
}

async function ensureAccount(request: APIRequestContext, username: string, role: string): Promise<void> {
  const token = await adminToken(request);
  const h = { Authorization: 'Bearer ' + token };
  const res = await request.get(`/api/accounts?role=${role}`, { headers: h });
  const body = await res.json();
  const acc = (body.data.items as { id: string; username: string }[]).find(i => i.username === username);
  if (acc) {
    await request.post(`/api/accounts/${acc.id}/password`, { headers: h, data: { new_password: TCHR_PW } });
    return;
  }
  await request.post('/api/accounts', { headers: h, data: { username, password: TCHR_PW, role } });
  const again = await (await request.get(`/api/accounts?role=${role}`, { headers: h })).json();
  const made = (again.data.items as { id: string; username: string }[]).find(i => i.username === username);
  expect(made, `${role} 账号 ${username} 建失败`).toBeTruthy();
  await request.post(`/api/accounts/${made!.id}/password`, { headers: h, data: { new_password: TCHR_PW } });
}

async function tchrToken(request: APIRequestContext): Promise<string> {
  await ensureAccount(request, TCHR, 'teacher');
  const res = await request.post('/api/auth/login', { data: { username: TCHR, password: TCHR_PW } });
  const body = await res.json();
  expect(body.code, 'e2e_teacher 登录失败').toBe(0);
  return body.data.token;
}

function auth(token: string) {
  return { Authorization: 'Bearer ' + token };
}

/** 清场：删光 e2e_teacher 的资产 */
async function resetAssets(request: APIRequestContext): Promise<void> {
  const h = auth(await tchrToken(request));
  const list = await (await request.get('/api/assets', { headers: h })).json();
  for (const a of list.data.items as { id: string }[]) {
    await request.delete(`/api/assets/${a.id}`, { headers: h });
  }
}

/** API 建资产 → id */
async function apiCreateAsset(request: APIRequestContext, data: Record<string, unknown>): Promise<string> {
  const h = auth(await tchrToken(request));
  const res = await request.post('/api/assets', { headers: h, data });
  const body = await res.json();
  expect(body.code, `建资产失败：${body.msg}`).toBe(0);
  return body.data.id as string;
}

/** API 上传文件（path = 完整相对文件路径，中间目录自动建） */
async function apiUpload(request: APIRequestContext, assetId: string, path: string, content: string): Promise<void> {
  const h = auth(await tchrToken(request));
  const res = await request.post(`/api/assets/${assetId}/files/upload`, {
    headers: h,
    multipart: {
      file: { name: path.split('/').pop() || 'file.txt', mimeType: 'application/octet-stream', buffer: Buffer.from(content) },
      path,
    },
  });
  const body = await res.json();
  expect(body.code, `上传失败：${body.msg}`).toBe(0);
}

const ts = () => Date.now().toString(36);

/** 游客进主页侧边栏默认收起 → 先展开再点导航 */
async function openHomeSection(page: Page, label: string) {
  const fold = page.locator('[data-tip="展开侧边栏"]');
  if (await fold.count()) await fold.click();
  await page.getByRole('button', { name: label, exact: true }).first().click();
}

test.describe('M5b-6 资产族 · S1 公开读面', () => {
  test.describe.configure({ mode: 'serial' });

  test('E28 课程读面：主页课程区见资产 → 详情出课件格 → Scratch 链接带 download 路径', async ({ page, request }) => {
    await resetAssets(request);
    const name = `e2e课-${ts()}`;
    const id = await apiCreateAsset(request, { bucket: 'courses', name, type: 'scratch' });
    await apiUpload(request, id, 'L1/main.sb3', 'fake-sb3');

    await page.goto('/');
    await openHomeSection(page, '课程');
    await expect(page.getByText(name, { exact: true }).first(), '课程没出现在主页课程区').toBeVisible();

    await page.getByText(name, { exact: true }).first().click();
    await expect(page.getByText('L1', { exact: true }).first(), '课件格 L1 没出现').toBeVisible();
    await expect(page.getByText('教师版'), 'main.sb3 存在应显教师版').toBeVisible();

    // Scratch 零改动加载：folder 以 / 结尾，Scratch 拼 main.sb3 成 files/download?path=L1/main.sb3
    const link = page.locator('a[href*="/Scratch/index.html"]').first();
    await expect(link, 'Scratch 打开链接没出来').toBeVisible();
    const href = await link.getAttribute('href');
    expect(href, '链接应走 V2 files/download').toContain('/api/assets/');
    expect(href, 'folder 应指向课件目录且以 / 结尾').toContain('files/download?path=L1/');
  });

  test('E29 资料读面：资料页见资产 → 树逐层展开 → 文件链接走 download API', async ({ page, request }) => {
    await resetAssets(request);
    const name = `e2e资-${ts()}`;
    const id = await apiCreateAsset(request, { bucket: 'reference', name, type: 'python', format: 'folder' });
    await apiUpload(request, id, 'readme.md', '# hi');
    await apiUpload(request, id, 'd1/x.txt', 'nested');

    await page.goto('/');
    await openHomeSection(page, '资料');
    await expect(page.getByText(name, { exact: true }).first(), '资料没出现在资料页').toBeVisible();

    await page.getByText(name, { exact: true }).first().click();
    // 根层：readme.md + d1（逐层加载 P2）
    await expect(page.getByText('readme.md').first(), '根层文件没显示').toBeVisible();
    await page.getByText('d1', { exact: true }).first().click();   // 展开子层
    await expect(page.getByText('x.txt').first(), '展开后子层文件没显示').toBeVisible();

    const link = page.locator('a[href*="files/download"]').first();
    const href = await link.getAttribute('href');
    expect(href, '文件链接应走 V2 download API').toContain('/api/assets/');
    expect(href).toContain('path=');
  });
});
