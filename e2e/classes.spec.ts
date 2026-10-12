import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/** M5b-5 班级学生域 4 条（E19~E22）——先红后绿
 *  P5：现场新建学生默认密码沿用 111111（V1 行为）
 *  P6：班级群发 = 前端循环单发（V2 无群发端点，后端零改动）
 */

const ADMIN = 'admin';
const ADMIN_PW = '111111';
/** 本块专属测试老师：班级归它所有，清场只删自己的班，不碰老师 dev 数据 */
const TCHR = 'e2e_teacher';
const TCHR_PW = 'e2e-pass-123';
const STUDENT = 'e2e_student';
const STUDENT_PW = 'e2e-pass-123';

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { username: ADMIN, password: ADMIN_PW } });
  const body = await res.json();
  expect(body.code, 'admin 登录失败').toBe(0);
  return body.data.token;
}

/** 确保账号存在且密码回到已知值（幂等） */
async function ensureAccount(request: APIRequestContext, username: string, role: string): Promise<string> {
  const token = await adminToken(request);
  const h = { Authorization: 'Bearer ' + token };
  const find = async () => {
    const res = await request.get(`/api/accounts?role=${role}`, { headers: h });
    const body = await res.json();
    return (body.data.items as { id: string; username: string }[]).find(i => i.username === username);
  };
  let acc = await find();
  if (!acc) {
    await request.post('/api/accounts', { headers: h, data: { username, password: TCHR_PW, role } });
    acc = await find();
  }
  expect(acc, `${role} 账号 ${username} 缺失`).toBeTruthy();
  await request.post(`/api/accounts/${acc!.id}/password`, { headers: h, data: { new_password: TCHR_PW } });
  return acc!.id;
}

async function tokenOf(request: APIRequestContext, username: string, password: string): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { username, password } });
  const body = await res.json();
  expect(body.code, `${username} 登录失败`).toBe(0);
  return body.data.token;
}

function auth(token: string) {
  return { Authorization: 'Bearer ' + token };
}

/** 清场：删光 e2e_teacher 的班级（删班只清自己的行，回收站条目无妨） */
async function resetClasses(request: APIRequestContext): Promise<void> {
  await ensureAccount(request, TCHR, 'teacher');
  const h = auth(await tokenOf(request, TCHR, TCHR_PW));
  const list = await (await request.get('/api/classes', { headers: h })).json();
  for (const c of list.data.items as { id: string }[]) {
    await request.delete(`/api/classes/${c.id}`, { headers: h });
  }
}

/** API 建班（E22 前置数据）→ 班 id */
async function apiCreateClass(request: APIRequestContext, name: string): Promise<string> {
  const h = auth(await tokenOf(request, TCHR, TCHR_PW));
  const res = await request.post('/api/classes', { headers: h, data: { name, schedule: {} } });
  const body = await res.json();
  expect(body.code, 'API 建班失败').toBe(0);
  return body.data.id;
}

/** API 把学生挂进班（username 已存在则挂接，等价 UI「跨班共享」） */
async function apiAddStudent(request: APIRequestContext, classId: string, username: string): Promise<void> {
  await ensureAccount(request, STUDENT, 'student');
  const h = auth(await tokenOf(request, TCHR, TCHR_PW));
  const res = await request.post(`/api/classes/${classId}/students`, {
    headers: h, data: { username },
  });
  const body = await res.json();
  expect(body.code, `API 加学生失败：${body.msg}`).toBe(0);
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

async function logout(page: Page) {
  await page.goto('/');
  await page
    .locator('[data-tip="退出登录"], [title="退出登录"]')
    .first()
    .click();
}

/** 进教师端「课堂记录」tab（班级面板在这里） */
async function openClasses(page: Page) {
  await page.getByRole('button', { name: '课堂记录' }).click();
  await expect(page.locator('[title="新建班级"]'), '班级面板没打开').toBeVisible();
}

test.describe('M5b-5 班级学生域', () => {
  test.describe.configure({ mode: 'serial' }); // 共用 e2e_teacher 的班级空间

  test('E19 建班 → 改排课 → 刷新从 V2 读回', async ({ page, request }) => {
    await resetClasses(request);
    await loginAs(page, TCHR, TCHR_PW);
    await openClasses(page);

    // 建班
    const cls = `e2e班-${Date.now().toString(36)}`;
    await page.locator('[title="新建班级"]').click();
    await page.getByPlaceholder('班级名称').fill(cls);
    await page.getByPlaceholder('班级名称').press('Enter');
    await expect(page.getByText(cls, { exact: true }).first(), '班级没出现在列表').toBeVisible();

    // 选中 → 改排课（周一 + 时间）
    await page.getByText(cls, { exact: true }).first().click();
    await page.locator('[title="排课"]').click();
    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal.getByText(/排课 - /), '排课弹窗没出现').toBeVisible();
    await modal.getByRole('button', { name: '周一', exact: true }).click();
    await modal.getByPlaceholder('上课时间（如 14:00-15:30）').fill('14:00-15:30');
    await modal.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.getByText('周一 14:00-15:30'), '排课没写进标题栏').toBeVisible();

    // 刷新读回（V2 持久化）
    await page.reload();
    await openClasses(page);
    await page.getByText(cls, { exact: true }).first().click();
    await expect(page.getByText('周一 14:00-15:30'), '刷新后排课没从 V2 读回').toBeVisible();
  });

  test('E20 加学生：现场新建 → 重复加报「已在班内」不炸', async ({ page, request }) => {
    await resetClasses(request);
    await loginAs(page, TCHR, TCHR_PW);
    await openClasses(page);

    const cls = `e2e加-${Date.now().toString(36)}`;
    await page.locator('[title="新建班级"]').click();
    await page.getByPlaceholder('班级名称').fill(cls);
    await page.getByPlaceholder('班级名称').press('Enter');
    await page.getByText(cls, { exact: true }).first().click();

    // 现场新建学生号（P5：密码 111111 由前端带）
    const stu = `e2es5${Date.now().toString(36)}`.toLowerCase().slice(0, 20);
    await page.getByRole('button', { name: '添加学生' }).click();
    await page.getByPlaceholder('学生姓名').fill(stu);
    await page.getByPlaceholder('学生姓名').press('Enter');
    await expect(page.getByRole('button', { name: /1名学生/ }), '学生没进班').toBeVisible();

    // 重复加同一个 → 同名检测弹窗 → 跨班共享 → 后端 409 → 错误提示可见、页面不炸
    await page.getByRole('button', { name: '添加学生' }).click();   // 首次添加成功后表单会收起，重新打开
    await page.getByPlaceholder('学生姓名').fill(stu);
    await page.getByPlaceholder('学生姓名').press('Enter');
    await expect(page.getByText(/发现同名/), '同名检测弹窗没出现').toBeVisible();
    await page.getByRole('button', { name: '是同一个学生，跨班共享' }).click();
    await expect(page.getByText(/已在班内/), '重复入班应报「学生已在班内」').toBeVisible();
    await expect(page.getByRole('button', { name: /1名学生/ }), '计数不该变成 2').toBeVisible();
  });

  test('E21 移出学生：班级里没了、账号还活着', async ({ page, request }) => {
    await resetClasses(request);
    await loginAs(page, TCHR, TCHR_PW);
    await openClasses(page);

    const cls = `e2e移-${Date.now().toString(36)}`;
    const stu = `e2es6${Date.now().toString(36)}`.toLowerCase().slice(0, 20);
    await page.locator('[title="新建班级"]').click();
    await page.getByPlaceholder('班级名称').fill(cls);
    await page.getByPlaceholder('班级名称').press('Enter');
    await page.getByText(cls, { exact: true }).first().click();
    await page.getByRole('button', { name: '添加学生' }).click();
    await page.getByPlaceholder('学生姓名').fill(stu);
    await page.getByPlaceholder('学生姓名').press('Enter');
    await expect(page.getByRole('button', { name: /1名学生/ })).toBeVisible();

    // 移除（原生 confirm）
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: /1名学生/ }).click();
    await page.getByRole('button', { name: '移除' }).click();
    await expect(page.getByRole('button', { name: /0名学生/ }), '移除后计数应回 0').toBeVisible();

    // 账号还活着（移出不删号，V2 语义）
    const token = await adminToken(request);
    const res = await request.get('/api/accounts?role=student&page_size=200', {
      headers: auth(token),
    });
    const body = await res.json();
    const names = (body.data.items as { username: string }[]).map(i => i.username);
    expect(names, '移出班级不该删账号').toContain(stu);
  });

  test('E22 班级群发恢复：选班群发 → 学生收件箱收到（P6 循环单发）', async ({ page, request }) => {
    const ts = Date.now().toString(36);
    const cls = `e2e群-${ts}`;
    const title = `e2e-blast-${ts}`;
    const classId = await apiCreateClass(request, cls);
    await apiAddStudent(request, classId, STUDENT);

    await loginAs(page, TCHR, TCHR_PW);
    await page.getByRole('button', { name: '发送消息' }).click();
    // 选班（恢复后的群发入口）
    await page.locator('select').filter({ hasText: /班级|选择班级/ }).first().selectOption({ label: cls });
    await page.getByPlaceholder('例如：Scratch 课堂').fill(title);
    await page.locator('textarea').fill('**群发**测试正文');
    await page.getByRole('button', { name: /班级群发/ }).click();
    await expect(page.getByText(/已群发给/), '群发成功提示没出现').toBeVisible();
    await logout(page);

    // 学生侧收到
    await loginAs(page, STUDENT, STUDENT_PW);
    await page.getByRole('button', { name: '邮箱' }).click();
    await page.getByText(/收件箱/).first().click();
    await expect(page.getByText(title, { exact: true }).first(), '学生没收到群发信').toBeVisible();
  });

  test('E23 管理员新建学生：按钮在、建号成功、角色徽标=学生', async ({ page }) => {
    const name = `e2eadm${Date.now().toString(36)}`.toLowerCase().slice(0, 20);
    await loginAs(page, ADMIN, ADMIN_PW);
    await page.getByRole('button', { name: '新建学生' }).click();
    await page.getByPlaceholder('学生账号', { exact: true }).fill(name);
    await page.getByPlaceholder(/密码/).fill('123456');   // 密码不预填（2026-10-12）
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page.getByText(/已创建/).first(), '成功反馈没出现').toBeVisible();
    await page.getByRole('button', { name: '完成' }).click();
    const row = page.locator('tr').filter({ hasText: name }).first();
    await expect(row, '新建学生没出现在用户列表').toBeVisible();
    await expect(row.getByText('学生', { exact: true }), '角色徽标应为学生').toBeVisible();
    await logout(page);
  });

  test('E24 班级管理：不选班新建学生（选初始班级）→ 自动入班 → 移出 → 搜索加回', async ({ page, request }) => {
    await resetClasses(request);
    const ts = Date.now().toString(36);
    const cls = `e2e管-${ts}`;
    const stu = `e2es7${ts}`.toLowerCase().slice(0, 20);
    await loginAs(page, TCHR, TCHR_PW);
    await page.getByRole('button', { name: '班级管理' }).click();

    // a 建班
    await page.locator('[title="新建班级"]').click();
    await page.getByPlaceholder('班级名称').fill(cls);
    await page.getByPlaceholder('班级名称').press('Enter');
    await expect(page.getByText(cls, { exact: true }).first(), '班级没出现').toBeVisible();

    // b 侧栏「新建学生」直接弹卡（可选初始班级）
    await page.getByRole('button', { name: '新建学生', exact: true }).click();
    await page.getByPlaceholder('学生账号', { exact: true }).fill(stu);
    await page.getByPlaceholder(/密码/).fill('123456');   // 密码不预填（2026-10-12）
    await page.locator('select').selectOption({ label: cls });
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page.getByText(/已加入/), '带初始班级应提示入班').toBeVisible();
    await page.getByRole('button', { name: '完成' }).click();   // 关卡 → 自动落在班级管理

    // 自动入班：选班 → 1名学生、成员显示账号名
    await page.getByText(cls, { exact: true }).first().click();
    await expect(page.getByText('1名学生'), '初始班级应自动入班').toBeVisible();
    await expect(page.getByText(stu, { exact: true }).first(), '成员应显示账号名').toBeVisible();

    // 移出（只移关系不删号）
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: '移出', exact: true }).click();
    await expect(page.getByText('0名学生'), '移出后计数应回 0').toBeVisible();

    // c1 搜索已有账号 → 点「添加」加回
    await page.getByPlaceholder(/搜索已有学生账号/).fill(stu);
    await page.getByRole('button', { name: '搜索', exact: true }).click();
    await page.getByRole('button', { name: '添加', exact: true }).click();
    await expect(page.getByText('1名学生'), '搜索加回应入班').toBeVisible();
  });

  test('E33 班级回收站：删班进桶 → 垃圾桶恢复 → 回列表', async ({ page, request }) => {
    await resetClasses(request);
    // 清历史桶（历年测试软删的班全堆在回收站，先清干净再验本用例）
    const ha = auth(await adminToken(request));
    const trash = await (await request.get('/api/trash', { headers: ha })).json();
    for (const t of trash.data.items as { id: string; type: string }[]) {
      if (t.type === 'class') await request.delete(`/api/trash/${t.id}`, { headers: ha });
    }
    const cls = `e2e桶-${Date.now().toString(36)}`;
    await apiCreateClass(request, cls);

    await loginAs(page, TCHR, TCHR_PW);
    await openClasses(page);
    await page.getByText(cls, { exact: true }).first().click();

    // 删班（原生 confirm → 软删进回收站）
    page.on('dialog', d => d.accept());
    await page.getByText(cls, { exact: true }).first().hover();
    await page.locator('[title="删除"]').click();
    await expect(page.getByText(cls, { exact: true }), '删除后列表该消失').toHaveCount(0);

    // 垃圾桶（M5b-8 切 V2）：看到已删班 → 在目标行里点恢复
    await page.getByRole('button', { name: '垃圾桶' }).click();
    await expect(page.getByText(cls).first(), '垃圾桶里没看到已删班级').toBeVisible();
    await page.locator('div.fixed.inset-0 div[class*="bg-slate-800"]').filter({ hasText: cls })
      .getByRole('button', { name: '恢复', exact: true }).click();
    await expect(page.locator('div.fixed.inset-0').getByText(cls, { exact: true }), '恢复后桶里该清掉').toHaveCount(0);
    await expect(page.getByText(cls, { exact: true }).first(), '恢复后应回列表').toBeVisible();
  });
});
