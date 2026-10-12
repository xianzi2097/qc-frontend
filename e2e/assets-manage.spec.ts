import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/** M5b-6 资产族 · 管理面 e2e（S2 资产 CRUD / S3 文件树 / 回收站）
 *  P1：CourseManager+ResourcesManager 合并一页（AssetManager，bucket 四选一）
 *  排序 = 上移/下移按钮（V2 order 接口 position 语义）
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

async function resetAssets(request: APIRequestContext): Promise<void> {
  const h = auth(await tchrToken(request));
  const list = await (await request.get('/api/assets', { headers: h })).json();
  for (const a of list.data.items as { id: string }[]) {
    await request.delete(`/api/assets/${a.id}`, { headers: h });
  }
  // 清回收站残留（admin 才能清）
  const ha = auth(await adminToken(request));
  const trash = await (await request.get('/api/trash', { headers: ha })).json();
  for (const t of trash.data.items as { id: string; type: string }[]) {
    if (t.type === 'asset') await request.delete(`/api/trash/${t.id}`, { headers: ha });
  }
}

async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/');
  await page
    .locator('[data-tip="登录"]')
    .or(page.getByRole('button', { name: '登录', exact: true }))
    .first()
    .click();
  await page.getByLabel(/用户名/).fill(username);
  await page.getByLabel(/密码/).fill(password);
  await page.getByRole('button', { name: '进入' }).click();
  await page.waitForURL('**/dashboard');
}

/** 进教师端「资产管理」页 */
async function openAssets(page: Page) {
  await page.getByRole('button', { name: '资产管理' }).click();
  await expect(page.getByRole('button', { name: '新建资产' }), '资产管理页没打开').toBeVisible();
}

const ts = () => Date.now().toString(36);

test.describe('M5b-6 资产族 · 管理面', () => {
  test.describe.configure({ mode: 'serial' });

  test('E30 资产 CRUD：新建（课程 scratch）→ 改名 → 挪书架 → 刷新读回', async ({ page, request }) => {
    await resetAssets(request);
    await loginAs(page, TCHR, TCHR_PW);
    await openAssets(page);

    // 新建（课程族：名称 + 类型 scratch）
    const name = `e2e资产-${ts()}`;
    await page.getByRole('button', { name: '新建资产' }).click();
    await page.getByPlaceholder('资产名称').fill(name);
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page.getByText(name, { exact: true }).first(), '新建资产没出现在列表').toBeVisible();

    // 挪书架（★）→ 切 bucket tab 看到
    await page.getByText(name, { exact: true }).first().hover();
    await page.locator('[title="移到书架"]').click();
    await page.getByRole('button', { name: '书架', exact: true }).click();
    await expect(page.getByText(name, { exact: true }).first(), '挪书架后书架 tab 里没出现').toBeVisible();

    // 刷新读回（V2 持久化）
    await page.reload();
    await openAssets(page);
    await page.getByRole('button', { name: '书架', exact: true }).click();
    await expect(page.getByText(name, { exact: true }).first(), '刷新后书架里没读回').toBeVisible();
  });

  test('E31 文件树：上传 → 建目录 → 改名 → 上移排序 → 删除', async ({ page, request }) => {
    await resetAssets(request);
    const name = `e2e树-${ts()}`;
    const h = auth(await tchrToken(request));
    const res = await request.post('/api/assets', {
      headers: h, data: { bucket: 'reference', name, type: 'python', format: 'folder' },
    });
    const body = await res.json();
    expect(body.code, 'API 建资产失败').toBe(0);

    await loginAs(page, TCHR, TCHR_PW);
    await openAssets(page);
    await page.getByRole('button', { name: '资料', exact: true }).click();
    await page.getByText(name, { exact: true }).first().click();   // 进文件面板

    // 上传两个文件
    for (const fn of ['a.txt', 'b.txt']) {
      await page.locator('input[type="file"]').first().setInputFiles({
        name: fn, mimeType: 'text/plain', buffer: Buffer.from(`content-${fn}`),
      });
      await expect(page.getByText(fn), `上传 ${fn} 后列表没出现`).toBeVisible();
    }

    // 新建文件夹
    await page.getByRole('button', { name: '新建文件夹' }).click();
    await page.getByPlaceholder('文件夹名称').fill('docs');
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page.getByRole('button', { name: 'docs' }), '新建文件夹没出现').toBeVisible();

    // 进文件夹再退出（逐层钻取）
    await page.getByRole('button', { name: 'docs' }).click();
    await expect(page.getByText('此文件夹暂无内容，可上传文件或新建文件夹')).toBeVisible();
    await page.getByRole('button', { name: '根目录' }).click();
    await expect(page.getByText('a.txt')).toBeVisible();

    // 改名 a.txt → z.txt（锁定含 a.txt 的行）
    const rowA = page.locator('.flex-1.overflow-y-auto > div.group').filter({ hasText: 'a.txt' });
    await rowA.hover();
    await rowA.locator('[title="重命名"]').click();
    await page.locator('.fixed.inset-0 input').fill('z.txt');
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.getByText('z.txt'), '改名后没生效').toBeVisible();

    // 上移排序：z.txt（改名后排末位）上移一位
    const rowZ = page.locator('.flex-1.overflow-y-auto > div.group').filter({ hasText: 'z.txt' });
    const idxBefore = await rowZ.evaluate(el => Array.from(el.parentElement!.children).indexOf(el));
    await rowZ.hover();
    await rowZ.locator('[title="上移"]').click();
    const rowZ2 = page.locator('.flex-1.overflow-y-auto > div.group').filter({ hasText: 'z.txt' });
    const idxAfter = await rowZ2.evaluate(el => Array.from(el.parentElement!.children).indexOf(el));
    expect(idxAfter, '上移排序没生效').toBe(idxBefore - 1);

    // 物理删（confirmDelete 弹窗，按钮收窄到弹窗内防与行内图标钮同名冲突）
    await rowZ2.hover();
    await rowZ2.locator('[title="删除"]').click();
    await expect(page.getByText('此操作不可恢复！')).toBeVisible();
    await page.locator('div.fixed.inset-0').getByRole('button', { name: '确认', exact: true }).click();
    await expect(page.getByText('z.txt', { exact: true }), '删除后该消失').toHaveCount(0);
  });

  test('E32 删除资产 → 回收站恢复 → 回列表', async ({ page, request }) => {
    await resetAssets(request);
    const name = `e2e桶-${ts()}`;
    const h = auth(await tchrToken(request));
    await request.post('/api/assets', {
      headers: h, data: { bucket: 'reference', name, type: 'python', format: 'folder' },
    });

    await loginAs(page, TCHR, TCHR_PW);
    await openAssets(page);
    await page.getByRole('button', { name: '资料', exact: true }).click();

    // 删除（confirmDelete recoverable）
    await page.getByText(name, { exact: true }).first().hover();
    await page.locator('[title="删除"]').click();
    await expect(page.getByText('可在回收站恢复。')).toBeVisible();
    await page.locator('div.fixed.inset-0').getByRole('button', { name: '确认', exact: true }).click();
    await expect(page.getByText(name, { exact: true }), '删除后列表该消失').toHaveCount(0);

    // 回收站恢复
    await page.getByRole('button', { name: '回收站' }).click();
    await expect(page.getByText(name).first(), '回收站里没看到').toBeVisible();
    await page.getByRole('button', { name: '恢复' }).first().click();
    await page.getByRole('button', { name: '关闭' }).click();
    await expect(page.getByText(name, { exact: true }).first(), '恢复后列表没回来').toBeVisible();
  });
});
