import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/** M5b-7 课堂记录域 3 条（E25~E27）——先红后绿
 *  D27：V2 content = JSON.stringify(学生记录数组)，前端序列化/解析（后端零改）
 *  前端 4 调用点全在 AttendancePanel.tsx（列表/保存/保存后重拉并入/删除）
 */

const ADMIN = 'admin';
const ADMIN_PW = '111111';
const TCHR = 'e2e_teacher';
const TCHR_PW = 'e2e-pass-123';
const STUDENT = 'e2e_student';

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { username: ADMIN, password: ADMIN_PW } });
  const body = await res.json();
  expect(body.code, 'admin 登录失败').toBe(0);
  return body.data.token;
}

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

/** 清场：删光 e2e_teacher 的班级 */
async function resetClasses(request: APIRequestContext): Promise<void> {
  await ensureAccount(request, TCHR, 'teacher');
  const h = auth(await tokenOf(request, TCHR, TCHR_PW));
  const list = await (await request.get('/api/classes', { headers: h })).json();
  for (const c of list.data.items as { id: string }[]) {
    await request.delete(`/api/classes/${c.id}`, { headers: h });
  }
}

/** API 建班 + 挂一个学生（schedule 空 = 无非上课日弹窗干扰）→ 班 id */
async function apiClassWithStudent(request: APIRequestContext, name: string): Promise<string> {
  await ensureAccount(request, STUDENT, 'student');
  const h = auth(await tokenOf(request, TCHR, TCHR_PW));
  const res = await request.post('/api/classes', { headers: h, data: { name, schedule: {} } });
  const body = await res.json();
  expect(body.code, 'API 建班失败').toBe(0);
  const classId = body.data.id as string;
  const add = await request.post(`/api/classes/${classId}/students`, { headers: h, data: { username: STUDENT } });
  const addBody = await add.json();
  expect(addBody.code, `API 加学生失败：${addBody.msg}`).toBe(0);
  return classId;
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

/** 进教师端「课堂记录」tab 并选中班级 */
async function openClass(page: Page, cls: string) {
  await page.getByRole('button', { name: '课堂记录' }).click();
  await expect(page.locator('[title="新建班级"]'), '班级面板没打开').toBeVisible();
  await page.getByText(cls, { exact: true }).first().click();
}

const TODAY = new Date().toISOString().split('T')[0];
let CLS = '';   // serial 连贯：E25 建班，E26/E27 沿用

test.describe('M5b-7 课堂记录域', () => {
  test.describe.configure({ mode: 'serial' }); // 共用 e2e_teacher 的班级空间 + 三测连贯（建→覆盖→删）

  test('E25 新建当日记录：点名三态 → 保存 → 列表可见 → 刷新从 V2 读回', async ({ page, request }) => {
    await resetClasses(request);
    const cls = `e2e记-${Date.now().toString(36)}`;
    CLS = cls;
    await apiClassWithStudent(request, cls);

    await loginAs(page, TCHR, TCHR_PW);
    await openClass(page, cls);

    // 点名 → 弹窗
    await page.getByRole('button', { name: '点名' }).click();
    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal.getByText('课堂记录', { exact: true }), '点名弹窗没出现').toBeVisible();

    // 三态切换：出勤 → 缺勤
    await modal.locator('button[title="出勤"]').click();
    await expect(modal.locator('button[title="缺勤"]'), '三态没切到缺勤').toBeVisible();

    // 逐生内容 + 计划
    await modal.getByPlaceholder('学了什么…').first().fill('循环结构入门');
    await modal.getByPlaceholder('下节课计划…').first().fill('函数基础');
    await modal.getByRole('button', { name: '保存', exact: true }).click();

    // 列表出现当日记录（出勤 0/1 = 唯一学生缺勤）
    await expect(page.getByText(TODAY, { exact: true }).first(), '保存后列表没出现当日记录').toBeVisible();
    await expect(page.getByText(/0\/1 出勤/), '出勤摘要不对').toBeVisible();
    await expect(page.getByText('循环结构入门'), '学生内容没上列表').toBeVisible();
    await expect(page.getByText('本月课时'), '本月统计没出现').toBeVisible();

    // 刷新读回（V2 持久化 + D27 JSON 解析）：列表有卡、弹窗里读回下节课计划
    await page.reload();
    await openClass(page, cls);
    await expect(page.getByText(TODAY, { exact: true }).first(), '刷新后记录没从 V2 读回').toBeVisible();
    await page.getByText(TODAY, { exact: true }).first().click();
    const m2 = page.locator('div.fixed.inset-0.z-50');
    await expect(m2.getByPlaceholder('下节课计划…').first(), '下节课计划没读回').toHaveValue('函数基础');
  });

  test('E26 同日覆盖：再存同日 → 仍一条、内容为新版', async ({ page }) => {
    await loginAs(page, TCHR, TCHR_PW);
    await openClass(page, CLS);
    await page.getByText(TODAY, { exact: true }).first().click();   // 点记录卡 → 编辑弹窗

    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal.getByText('课堂记录', { exact: true }), '编辑弹窗没出现').toBeVisible();
    await modal.getByPlaceholder('学了什么…').first().fill('改成新内容');
    await modal.getByRole('button', { name: '保存', exact: true }).click();

    // 同日只有一条 + 内容是新版
    await expect(page.getByText(TODAY, { exact: true }), '同日应只剩一条记录').toHaveCount(1);
    await expect(page.getByText('改成新内容'), '新版内容没上列表').toBeVisible();
    await expect(page.getByText('循环结构入门'), '旧内容该被覆盖').toHaveCount(0);
  });

  test('E27 删记录：列表消失、空态回来', async ({ page }) => {
    await loginAs(page, TCHR, TCHR_PW);
    await openClass(page, CLS);

    const card = page.locator('div.group').filter({ hasText: TODAY });
    await card.hover();
    page.on('dialog', d => d.accept());
    await card.locator('button').last().click();   // 悬停操作区的删除（垃圾桶）

    await expect(page.getByText(TODAY, { exact: true }), '删除后记录该消失').toHaveCount(0);
    await expect(page.getByText('本月还没有课堂记录'), '空态没回来').toBeVisible();
  });
});
