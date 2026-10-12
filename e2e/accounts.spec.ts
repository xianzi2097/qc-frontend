import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/** M5b-2 账号管理域 4 条（E7~E10）——先红后绿；D25：停用/启用直操，不进回收站 */

const ADMIN = 'admin';
const ADMIN_PW = '111111';
/** 每次运行唯一：账号停用后名字仍占用（不可物理删），唯一后缀保证创建段每次真跑 */
const regName = (tag: string) => `e2e-reg-${tag}-${Date.now().toString(36)}`;

/** 停用确认弹窗（confirmDisable 挂在 body 末尾的 fixed 层，与行内按钮区分） */
const disableDialog = (page: Page) => page.locator('div.fixed.inset-0.z-50');
const row = (page: Page, name: string) => page.locator('table tbody tr', { hasText: name });

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { username: ADMIN, password: ADMIN_PW } });
  const body = await res.json();
  expect(body.code, 'admin 登录失败').toBe(0);
  return body.data.token;
}

async function loginAdmin(page: Page) {
  await page.goto('/');
  await page.locator('[data-tip="登录"]').click();
  await page.getByLabel(/用户名/).fill(ADMIN);
  await page.getByLabel(/密码/).fill(ADMIN_PW);
  await page.getByRole('button', { name: '进入' }).click();
  await page.waitForURL('**/dashboard');
}

/** 行内停用按钮 → 弹窗确认（页面上行内/弹窗都有"停用"字样，靠 fixed 层区分） */
async function disableViaUI(page: Page, name: string) {
  await row(page, name).getByRole('button', { name: '停用' }).click();
  await disableDialog(page).getByRole('button', { name: '停用' }).click();
}

test.describe('M5b-2 账号管理域', () => {
  test('E7 用户列表：渲染账号行 + 状态列', async ({ page }) => {
    await loginAdmin(page);
    await expect(page.getByText('用户管理')).toBeVisible();
    await expect(page.getByText('状态').first(), '没有状态列').toBeVisible();
    await expect(row(page, 'admin').first(), '列表没渲染 admin 行').toBeVisible();
    await expect(row(page, 'teacher').first(), '列表没渲染 teacher 行').toBeVisible();
    await expect(row(page, 'teacher').first().getByText('正常')).toBeVisible();
  });

  test('E9 停用弹窗：可随时启用、取消不生效、停用↔启用往返', async ({ page, request }) => {
    const token = await adminToken(request);
    const name = regName('c9');
    const created = await request.post('/api/accounts', {
      headers: { Authorization: 'Bearer ' + token },
      data: { username: name, password: '123456', role: 'teacher' },
    });
    expect((await created.json()).code, '前置建号失败').toBe(0);

    await loginAdmin(page);
    await row(page, name).getByRole('button', { name: '停用' }).click();
    // D25 契约：提示可随时启用、不提回收站
    await expect(page.getByText('停用账号'), '停用弹窗没出现').toBeVisible();
    await expect(page.getByText(/可随时启用/)).toBeVisible();
    await expect(page.getByText(/回收站/), 'D25：停用不该提回收站').toHaveCount(0);

    // 取消 → 没停用
    await disableDialog(page).getByRole('button', { name: '取消' }).click();
    await expect(row(page, name).getByText('正常')).toBeVisible();

    // 确认停用 → 状态变化 + 出现启用按钮
    await disableViaUI(page, name);
    await expect(row(page, name).getByText('已停用'), '没标记已停用').toBeVisible();
    await expect(row(page, name).getByRole('button', { name: '启用' })).toBeVisible();

    // 启用往返 → 回到正常
    await row(page, name).getByRole('button', { name: '启用' }).click();
    await expect(row(page, name).getByText('正常')).toBeVisible();
    await expect(row(page, name).getByRole('button', { name: '停用' })).toBeVisible();

    // 收尾停用（不留 active 死号）
    await disableViaUI(page, name);
    await expect(row(page, name).getByText('已停用')).toBeVisible();
  });

  test('E8 创建老师 → 停用 → 启用 闭环', async ({ page }) => {
    const name = regName('c8');
    await loginAdmin(page);

    await page.getByRole('button', { name: '创建老师' }).click();
    await page.getByPlaceholder('老师账号').fill(name);
    await page.getByPlaceholder('密码').fill('123456');
    await page.getByRole('button', { name: '创建', exact: true }).click();   // 2026-10-12 起走卡片（行内表单已删）
    await page.getByRole('button', { name: '完成' }).click();                 // 卡片成功页
    await expect(row(page, name), '创建后列表没出现').toBeVisible();
    await expect(row(page, name).getByText('正常')).toBeVisible();

    await disableViaUI(page, name);
    await expect(row(page, name).getByText('已停用')).toBeVisible();

    await row(page, name).getByRole('button', { name: '启用' }).click();
    await expect(row(page, name).getByText('正常')).toBeVisible();

    // 收尾停用
    await disableViaUI(page, name);
    await expect(row(page, name).getByText('已停用')).toBeVisible();
  });

  test('E10 垃圾桶：停用账号不进桶（D25）', async ({ page, request }) => {
    const token = await adminToken(request);
    const h = { Authorization: 'Bearer ' + token };
    const name = regName('c10');
    const created = await request.post('/api/accounts', {
      headers: h,
      data: { username: name, password: '123456', role: 'teacher' },
    });
    const sid = (await created.json()).data.id;
    const disabled = await request.delete(`/api/accounts/${sid}`, { headers: h });
    expect((await disabled.json()).code).toBe(0);

    await loginAdmin(page);
    // 停用的号在用户管理里标"已停用"
    await expect(row(page, name).getByText('已停用')).toBeVisible();

    // 切垃圾桶：D25 后停用的号不进桶。桶里允许有班级/资产等正常删除条目
    // （M5b-5 起删班进桶），只断言「查无此人」，不再假设桶为空（脆弱假设已除账）
    await page.getByRole('button', { name: '垃圾桶' }).click();
    await expect(
      page.getByText('垃圾桶为空').or(page.getByRole('columnheader', { name: '名称' })),
      '垃圾桶视图没渲染出来',
    ).toBeVisible();
    await expect(page.getByText(name, { exact: true }), '停用的号不该进垃圾桶').toHaveCount(0);
  });
});
