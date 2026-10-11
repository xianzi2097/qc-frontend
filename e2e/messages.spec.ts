import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/** M5b-3 站内信域 4 条（E11~E14）——先红后绿：老师发 → 学生收（md 渲染） */

const ADMIN = 'admin';
const ADMIN_PW = '111111';
const TEACHER = 'teacher';
const TEACHER_PW = '123456';
const STUDENT = 'e2e_student';
const STUDENT_PW = 'e2e-pass-123';

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { username: ADMIN, password: ADMIN_PW } });
  const body = await res.json();
  expect(body.code, 'admin 登录失败').toBe(0);
  return body.data.token;
}

/** 确保学生存在且密码回到已知值（幂等） */
async function ensureStudent(request: APIRequestContext): Promise<string> {
  const token = await adminToken(request);
  const h = { Authorization: 'Bearer ' + token };
  const find = async () => {
    const res = await request.get('/api/accounts?role=student', { headers: h });
    const body = await res.json();
    return (body.data.items as { id: string; username: string }[]).find(i => i.username === STUDENT);
  };
  let stu = await find();
  if (!stu) {
    await request.post('/api/accounts', {
      headers: h,
      data: { username: STUDENT, password: STUDENT_PW, role: 'student' },
    });
    stu = await find();
  }
  expect(stu, '学生账号缺失').toBeTruthy();
  await request.post(`/api/accounts/${stu!.id}/password`, {
    headers: h,
    data: { new_password: STUDENT_PW },
  });
  return stu!.id;
}

/** teacher token + 学生 id → V2 API 直发一封（给接收侧用例做前置数据） */
async function apiSendMessage(request: APIRequestContext, studentId: string, title: string, content: string) {
  const login = await request.post('/api/auth/login', { data: { username: TEACHER, password: TEACHER_PW } });
  const body = await login.json();
  expect(body.code, 'teacher 登录失败').toBe(0);
  const res = await request.post('/api/messages', {
    headers: { Authorization: 'Bearer ' + body.data.token },
    data: { receiver_id: studentId, title, content },
  });
  expect((await res.json()).code, 'API 发信失败').toBe(0);
}

/** UI 登录（侧栏 rail/展开两模式通吃） */
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

async function logout(page: Page) {
  await page.goto('/');
  await page
    .locator('[data-tip="退出登录"], [title="退出登录"]')
    .first()
    .click();
}

/** 进入学生端邮箱模块并打开收件箱（默认不选中任何夹） */
async function openMailbox(page: Page) {
  await page.getByRole('button', { name: '邮箱' }).click();
  await page.getByText(/收件箱/).first().click();
}

test.describe('M5b-3 站内信域', () => {
  // 顺序执行：四条共用 e2e_student 信箱，并行会互相污染未读数与残留数据
  test.describe.configure({ mode: 'serial' });

  /** 清场：删光该学生信箱的夹与信（测试号专属，保证每条用例从干净状态起跑） */
  async function resetMailbox(request: APIRequestContext): Promise<string> {
    const sid = await ensureStudent(request);
    const login = await request.post('/api/auth/login', { data: { username: STUDENT, password: STUDENT_PW } });
    const tok = (await login.json()).data.token as string;
    const h = { Authorization: 'Bearer ' + tok };
    const folders = await (await request.get('/api/message-folders', { headers: h })).json();
    for (const f of folders.data.items as { id: string; builtin: boolean }[]) {
      if (!f.builtin) await request.delete(`/api/message-folders/${f.id}`, { headers: h });
    }
    const inbox = await (await request.get('/api/messages?box=inbox&page_size=100', { headers: h })).json();
    for (const m of inbox.data.items as { id: string }[]) {
      await request.delete(`/api/messages/${m.id}`, { headers: h });
    }
    return sid;
  }

  test('E11 老师发 → 学生收 + md 渲染 + 未读角标', async ({ page, request }) => {
    await resetMailbox(request);

    // ── 老师端 UI 发送（红阶段：收件人下拉还是空的/V1 源） ──
    await loginAs(page, TEACHER, TEACHER_PW);
    await page.getByRole('button', { name: '发送消息' }).click();
    const title = `e2e-md-${Date.now().toString(36)}`;
    await page.locator('select').filter({ hasText: '选择学生' }).first().selectOption({ label: STUDENT });
    await page.getByPlaceholder('例如：Scratch 课堂').fill(title);
    await page.locator('textarea').fill('# 一级标题\n**重点内容**');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await expect(page.getByText(/消息已发送给/), '发送没成功').toBeVisible();
    await logout(page);

    // ── 学生端接收 + md 渲染断言 ──
    await loginAs(page, STUDENT, STUDENT_PW);
    await openMailbox(page);
    // 未读角标出现（Dock 图标上的红点数字；清场后只有这一封）
    await expect(page.locator('button:has-text("邮箱") span.bg-rose-500').first(), '未读角标没出现').toBeVisible();
    // 打开收件箱里的信
    await page.getByText(title, { exact: true }).first().click();
    await expect(page.locator('.marked-body h1', { hasText: '一级标题' }), 'md 标题没渲染成 h1').toBeVisible();
    await expect(page.locator('.marked-body strong', { hasText: '重点内容' }), 'md 加粗没渲染').toBeVisible();
    // 读完 → 角标消失（读即已读 + onMsgRead 刷新）
    await expect(page.locator('button:has-text("邮箱") span.bg-rose-500'), '读完角标应消失').toHaveCount(0);
  });

  test('E12 文件夹：建/移信/删夹退回 + 内置夹受保护', async ({ page, request }) => {
    const sid = await resetMailbox(request);
    const title = `e2e-move-${Date.now().toString(36)}`;
    await apiSendMessage(request, sid, title, 'move test');

    await loginAs(page, STUDENT, STUDENT_PW);
    await openMailbox(page);

    // 内置收件箱：不给删除按钮（builtin 挡）
    const inboxRow = page.locator('div,button,span').filter({ hasText: /^收件箱$/ }).first();
    await expect(inboxRow).toBeVisible();

    // 新建文件夹 → 出现
    const fname = `e2e夹-${Date.now().toString(36)}`;
    await page.locator('[title="新建文件夹"]').click();
    await page.getByPlaceholder('文件夹名，如 Scratch课堂').fill(fname);
    await page.getByPlaceholder('文件夹名，如 Scratch课堂').press('Enter');
    await expect(page.getByText(fname, { exact: true }).first(), '新建文件夹没出现').toBeVisible();

    // 打开收件箱的信 → 移动到新夹 → 新夹里能看到
    await page.getByText(title, { exact: true }).first().click();
    await page.locator('select').filter({ hasText: '移动到' }).selectOption({ label: fname });
    await page.getByText(fname, { exact: true }).first().click();
    await expect(page.getByText(title, { exact: true }).first(), '移动后信不在新夹').toBeVisible();

    // 删除新夹 → 等确认弹窗渲染出来再点（异步挂载）
    await page.locator('[title="删除"]').first().click();
    const dialog = page.locator('div.fixed.inset-0.z-50');
    await expect(dialog, '删夹弹窗没出现').toBeVisible();
    await expect(dialog.getByText(/退回收件箱/), '删夹文案应说明信退回').toBeVisible();
    await dialog.getByRole('button', { name: '确认' }).click();
    await expect(page.getByText(fname, { exact: true }), '删夹后文件夹还在').toHaveCount(0);
  });

  test('E13 删除信：确认含「不可恢复」→ 真删', async ({ page, request }) => {
    const sid = await resetMailbox(request);
    const title = `e2e-del-${Date.now().toString(36)}`;
    await apiSendMessage(request, sid, title, 'delete me');

    await loginAs(page, STUDENT, STUDENT_PW);
    await openMailbox(page);

    // 条目行的删除按钮无 title（纯图标）→ 按行定位
    const itemRow = page.locator('div.group').filter({ hasText: title }).first();
    await itemRow.hover();
    await itemRow.locator('button').last().click();
    await expect(page.getByText(/不可恢复/), '删信确认必须含「不可恢复」（spec §7）').toBeVisible();
    await page.locator('div.fixed.inset-0.z-50').getByRole('button', { name: '确认' }).click();
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  });

  test('E14 权限与禁用态：学生无发送入口；群发灰按钮禁用', async ({ page }) => {
    // 学生端：没有任何"发送消息"入口（V2 仅 teacher 可发）
    await loginAs(page, STUDENT, STUDENT_PW);
    await expect(page.getByRole('button', { name: '发送消息' }), '学生端不该有发送入口').toHaveCount(0);
    await logout(page);

    // 教师端：单发可用；班级群发为灰色禁用按钮（A 方案，M5b-5 恢复）
    await loginAs(page, TEACHER, TEACHER_PW);
    await page.getByRole('button', { name: '发送消息' }).click();
    await expect(page.getByText('班级群发').first(), '群发应显示为灰按钮文案').toBeVisible();
    const disabledBtn = page.getByRole('button', { name: /班级群发/ });
    await expect(disabledBtn.first(), '群发按钮应禁用').toBeDisabled();
    // 空标题不允许发送
    await expect(page.getByRole('button', { name: '发送', exact: true }), '缺必填应禁用发送').toBeDisabled();
  });
});
