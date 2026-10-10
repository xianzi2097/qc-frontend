import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/** M5b-1 设置域 5 条（E1~E5）——新块用例先红后绿 */

const ADMIN = 'admin';
const ADMIN_PW = '111111';
const STUDENT = 'e2e_student';
const STUDENT_PW = 'e2e-pass-123';
const NEW_PW = 'Changed#123';

/** admin token（API 前置用，走 5173 代理 → 8001） */
async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { username: ADMIN, password: ADMIN_PW } });
  const body = await res.json();
  expect(body.code, 'admin 登录失败').toBe(0);
  return body.data.token;
}

/** 确保学生存在且密码回到已知值（幂等：每次清掉上次残留） */
async function ensureStudent(request: APIRequestContext): Promise<void> {
  const token = await adminToken(request);
  const h = { Authorization: 'Bearer ' + token };
  const find = async () => {
    const res = await request.get('/api/accounts?role=student', { headers: h });
    const body = await res.json();
    expect(body.code).toBe(0);
    return (body.data.items as { id: string; username: string }[]).find(i => i.username === STUDENT);
  };
  let stu = await find();
  if (!stu) {
    const res = await request.post('/api/accounts/batch', {
      headers: h,
      data: { role: 'student', password: STUDENT_PW, usernames: [STUDENT] },
    });
    expect((await res.json()).code, '建学生账号失败').toBe(0);
    stu = await find();
  }
  expect(stu, '学生账号缺失').toBeTruthy();
  const reset = await request.post(`/api/accounts/${stu!.id}/password`, {
    headers: h,
    data: { new_password: STUDENT_PW },
  });
  expect((await reset.json()).code, '重置学生密码失败').toBe(0);
}

/** UI 登录（主页登录面板；登录后强制跳 /dashboard） */
async function loginStudent(page: Page) {
  await page.goto('/');
  await page.locator('[data-tip="登录"]').click();
  await page.getByLabel(/用户名/).fill(STUDENT);
  await page.getByLabel(/密码/).fill(STUDENT_PW);
  await page.getByRole('button', { name: '进入' }).click();
  await page.waitForURL('**/dashboard');
}

/** 页面内带 token 读 V2 设置（断言"前端真的写进了新后端"） */
function readV2Settings(page: Page) {
  return page.evaluate(async () => {
    const token = localStorage.getItem('auth_token');
    const r = await fetch('/api/settings', { headers: { Authorization: 'Bearer ' + token } });
    return (await r.json()) as { code: number; data?: { theme?: string; font_size?: number } };
  });
}

/** 站内「开始」按钮（侧栏 rail/展开两模式通吃） */
const startBtn = (page: Page) =>
  page.locator('[data-tip="开始"]').or(page.getByRole('button', { name: '开始', exact: true }));

test.describe('M5b-1 设置域', () => {
  test('E1 主题：换绿色 → 存进 V2 → 刷新保持', async ({ page, request }) => {
    await ensureStudent(request);
    await loginStudent(page);
    await page.goto('/');

    await page.locator('[title="主题配色"]').click();
    await page.locator('[title="绿色"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'green');

    const body = await readV2Settings(page);
    expect(body.code).toBe(0);
    expect(body.data?.theme, '前端没把主题写进 V2').toBe('green');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'green');
  });

  test('E2 字号：A+ 调大 → 刷新从 V2 读回', async ({ page, request }) => {
    await ensureStudent(request);
    await loginStudent(page);
    await page.goto('/');

    await page.locator('[data-tour="programming"]').click();
    // 幂等：库里可能留着上次跑的值，先恢复默认 16（按钮只在非默认值时出现）
    const reset = page.locator('[title="恢复默认"]');
    if (await reset.count() > 0) await reset.click();
    await expect(page.locator('span.tabular-nums')).toHaveText('16');

    await page.locator('button:has-text("A+")').click();
    await page.locator('button:has-text("A+")').click();
    await expect(page.locator('span.tabular-nums')).toHaveText('20');

    // 等字号写进 V2 再刷新（updateFontSize 不 await，抢跑 reload 会读到旧值）
    await page.waitForFunction(async () => {
      const t = localStorage.getItem('auth_token');
      const r = await fetch('/api/settings', { headers: { Authorization: 'Bearer ' + t } });
      const b = await r.json().catch(() => null);
      return b?.data?.font_size === 20;
    }, undefined, { timeout: 5000 });

    await page.reload();
    await page.locator('[data-tour="programming"]').click();
    await expect(page.locator('span.tabular-nums'), '字号没从 V2 读回').toHaveText('20');
  });

  test('E3 最近打开：记一条 → 刷新读回 → 去重只一条', async ({ page, request }) => {
    await ensureStudent(request);
    await loginStudent(page);
    await page.goto('/');

    await page.locator('[data-tour="books"]').click();
    await startBtn(page).click();
    const chips = page.locator('button.group.rounded-full', { hasText: '书架' });
    await expect(page.getByText('最近', { exact: true })).toBeVisible();
    await expect(chips).toHaveCount(1);

    // 同一板块再开一次 → 服务端去重置顶，仍只一条
    await page.locator('[data-tour="books"]').click();
    await startBtn(page).click();
    await expect(chips).toHaveCount(1);

    // 刷新：从 V2 读回
    await page.reload();
    await expect(page.getByText('最近', { exact: true }), '最近打开没从 V2 读回').toBeVisible();
    await expect(chips).toHaveCount(1);
  });

  test('E4 改密：成功 → 旧密被拒 → 新密可登 → 测后恢复', async ({ page, request }) => {
    await ensureStudent(request);
    await loginStudent(page);

    await page.getByRole('button', { name: '设置' }).click();

    // 错原密码 → 显示后端 msg，且**不被踢下线**（劫持层对 2001 凭证错放行）
    await page.getByPlaceholder('输入原密码').fill('wrong-old-pw');
    await page.getByPlaceholder('输入新密码', { exact: true }).fill(NEW_PW);
    await page.getByPlaceholder('再次输入新密码').fill(NEW_PW);
    await page.getByRole('button', { name: '确认修改' }).click();
    await expect(page.getByText('原密码错误'), '没显示后端错误').toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('auth_token')), '错原密码被踢下线了').not.toBeNull();

    // 正确原密码 → 成功
    await page.getByPlaceholder('输入原密码').fill(STUDENT_PW);
    await page.getByRole('button', { name: '确认修改' }).click();
    await expect(page.getByText('密码修改成功！'), '改密没成功').toBeVisible();

    // 登出 → 旧密码应被拒
    await page.goto('/');
    await page.locator('[data-tip="退出登录"]').click();
    await page
      .locator('[data-tip="登录"]')
      .or(page.getByRole('button', { name: '登录' }))
      .first()
      .click();
    await page.getByLabel(/用户名/).fill(STUDENT);
    await page.getByLabel(/密码/).fill(STUDENT_PW);
    await page.getByRole('button', { name: '进入' }).click();
    await expect(page.getByText('账号或密码错误'), '旧密码居然还能登').toBeVisible();

    // 新密码可登 → 再把密码改回原值（不污染后续用例）
    await page.getByLabel(/密码/).fill(NEW_PW);
    await page.getByRole('button', { name: '进入' }).click();
    await page.waitForURL('**/dashboard');

    const restored = await page.evaluate(async () => {
      const token = localStorage.getItem('auth_token');
      const r = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ old_password: 'Changed#123', new_password: 'e2e-pass-123' }),
      });
      return (await r.json()).code;
    });
    expect(restored, '密码没恢复原值').toBe(0);
  });

  test('E5 预设头像：选一个 → 存进 V2 → 刷新保持', async ({ page, request }) => {
    await ensureStudent(request);
    await loginStudent(page);
    await page.goto('/');

    await page.locator('[data-tip*="更换头像"]').click();
    await page.locator('.neo-modal .grid button').nth(1).click();
    await page.getByRole('button', { name: '保存' }).click();

    // 核心断言：V2 的 /auth/me 返回的 avatar_path 真的变了（乐观 localStorage 不算数）
    const me = await page.evaluate(async () => {
      const token = localStorage.getItem('auth_token');
      const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      const body = await r.json();
      return body?.data?.avatar_path as string | undefined;
    });
    expect(me, '头像没写进 V2').toBe('avatar_1');

    await page.reload();
    const me2 = await page.evaluate(async () => {
      const token = localStorage.getItem('auth_token');
      const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      const body = await r.json();
      return body?.data?.avatar_path as string | undefined;
    });
    expect(me2).toBe('avatar_1');
  });

  test('E6 后台改密入口（admin）：入口在、表单通、错原密码不踢人', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-tip="登录"]').click();
    await page.getByLabel(/用户名/).fill(ADMIN);
    await page.getByLabel(/密码/).fill(ADMIN_PW);
    await page.getByRole('button', { name: '进入' }).click();
    await page.waitForURL('**/dashboard');

    // 侧栏底部「修改密码」入口（D24：后台缺按钮可加）
    await page.locator('[title="修改密码"]').click();
    await page.getByPlaceholder('输入原密码').fill('wrong-old-pw');
    await page.getByPlaceholder('输入新密码', { exact: true }).fill('NewAdmin#123');
    await page.getByPlaceholder('再次输入新密码').fill('NewAdmin#123');
    await page.getByRole('button', { name: '确认修改' }).click();
    await expect(page.getByText('原密码错误'), '弹层表单没打通后端').toBeVisible();
    // 只验链路不动 admin 真密码（闭环由学生端 E4 覆盖）；会话不被踢
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).not.toBeNull();
    await page.locator('[title="关闭弹窗"]').click();
    await expect(page.getByPlaceholder('输入原密码')).toHaveCount(0);
  });
});
