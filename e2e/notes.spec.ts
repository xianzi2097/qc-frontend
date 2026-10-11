import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/** M5b-4 笔记域 4 条（E15~E18）——先红后绿；P3 拍板：标题不带 .md（V2 零文件） */

const ADMIN = 'admin';
const ADMIN_PW = '111111';
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

/** 学生自己的 token（V2 API 直连做前置数据用） */
async function studentToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { username: STUDENT, password: STUDENT_PW } });
  const body = await res.json();
  expect(body.code, '学生登录失败').toBe(0);
  return body.data.token;
}

/** 清场：删光该学生的笔记本（删本级联清光笔记），保证每条用例从干净状态起跑 */
async function resetNotebooks(request: APIRequestContext): Promise<void> {
  await ensureStudent(request);
  const h = { Authorization: 'Bearer ' + await studentToken(request) };
  const list = await (await request.get('/api/notebooks', { headers: h })).json();
  for (const nb of list.data.items as { id: string }[]) {
    await request.delete(`/api/notebooks/${nb.id}`, { headers: h });
  }
}

/** 建本 + 建 n 篇笔记（V2 API 直发，做 UI 用例的前置数据） */
async function apiSeed(
  request: APIRequestContext,
  nbName: string,
  titles: string[],
): Promise<void> {
  const h = { Authorization: 'Bearer ' + await studentToken(request) };
  const nbRes = await request.post('/api/notebooks', { headers: h, data: { name: nbName } });
  const nbBody = await nbRes.json();
  expect(nbBody.code, '建本失败').toBe(0);
  for (const t of titles) {
    const res = await request.post('/api/notes', {
      headers: h,
      data: { notebook_id: nbBody.data.id, title: t, content: `# ${t}\n\n正文` },
    });
    expect((await res.json()).code, `建笔记「${t}」失败`).toBe(0);
  }
}

/** 触碰一篇笔记的 updated_at（内容微调 → updated_at 提到最新） */
async function apiTouchNote(request: APIRequestContext, notebookId: string, title: string): Promise<void> {
  const h = { Authorization: 'Bearer ' + await studentToken(request) };
  const list = await (await request.get(`/api/notes?notebook=${notebookId}&page_size=100`, { headers: h })).json();
  const note = (list.data.items as { id: string; title: string }[]).find(n => n.title === title);
  expect(note, `没找到笔记「${title}」`).toBeTruthy();
  await request.patch(`/api/notes/${note!.id}`, { headers: h, data: { content: `# ${title}\n\n改过的正文` } });
}

async function apiNotebookId(request: APIRequestContext, nbName: string): Promise<string> {
  const h = { Authorization: 'Bearer ' + await studentToken(request) };
  const list = await (await request.get('/api/notebooks', { headers: h })).json();
  const nb = (list.data.items as { id: string; name: string }[]).find(n => n.name === nbName);
  expect(nb, `没找到笔记本「${nbName}」`).toBeTruthy();
  return nb!.id;
}

/** UI 登录（与 messages.spec 同款） */
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

/** 打开学生端笔记本模块（默认模块即笔记本，未展开时点 Dock 按钮） */
async function openNotebook(page: Page) {
  const newNbBtn = page.locator('[title="新建笔记本"]'); // 只有笔记本面板里才有
  if (!(await newNbBtn.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: '笔记本', exact: true }).click();
  }
  await expect(newNbBtn, '笔记本面板没打开').toBeVisible();
}

/** 展开某本（已展开则先收起再展开，强制重新拉笔记列表） */
async function expandNotebook(page: Page, nbName: string) {
  const row = page.locator('div.group').filter({ hasText: nbName }).first();
  await row.click();
}

test.describe('M5b-4 笔记域', () => {
  // 顺序执行：共用 e2e_student 的笔记本空间，并行会互相污染
  test.describe.configure({ mode: 'serial' });

  test('E15 建本 → 建笔记（标题无 .md）→ 编辑保存 → 刷新读回', async ({ page, request }) => {
    await resetNotebooks(request);
    await loginAs(page, STUDENT, STUDENT_PW);
    await openNotebook(page);

    // 建笔记本
    const nbName = `e2e本-${Date.now().toString(36)}`;
    await page.locator('[title="新建笔记本"]').click();
    await page.getByPlaceholder('笔记本名，如 Python学习').fill(nbName);
    await page.getByPlaceholder('笔记本名，如 Python学习').press('Enter');
    await expect(page.getByText(nbName, { exact: true }).first(), '新建笔记本没出现').toBeVisible();

    // 建笔记（P3：标题纯文本，不拼 .md）——先点开本，"新建笔记"按钮在展开的本里
    await expandNotebook(page, nbName);
    const noteTitle = `e2e笔记-${Date.now().toString(36)}`;
    await page.getByRole('button', { name: '新建笔记', exact: true }).click();
    await page.getByPlaceholder('笔记名').fill(noteTitle);
    await page.getByPlaceholder('笔记名').press('Enter');
    await expect(page.getByText(noteTitle, { exact: true }).first(), '新笔记没出现在列表').toBeVisible();
    await expect(page.getByText(`${noteTitle}.md`), 'P3：列表不得出现 .md 后缀').toHaveCount(0);
    await expect(page.getByText(`${noteTitle}.md`), 'P3：顶栏不得出现 .md 后缀').toHaveCount(0);

    // 编辑 → Ctrl+S 保存 → 未保存标记消失
    const body = `正文-${Date.now().toString(36)}`;
    const textarea = page.locator('textarea');
    await textarea.click();
    await page.keyboard.type(body);
    await expect(page.getByText('未保存'), '打字后应有未保存标记').toBeVisible();
    await textarea.press('Control+s');
    await expect(page.getByText('未保存'), '保存后标记应消失').toHaveCount(0);

    // 刷新读回
    await page.reload();
    await openNotebook(page);
    await expandNotebook(page, nbName);
    await page.getByText(noteTitle, { exact: true }).first().click();
    await expect(page.locator('textarea'), '刷新后笔记区没出来').toBeVisible();
    await expect(page.locator('textarea'), '刷新后内容没读回').toHaveValue(new RegExp(body));
  });

  test('E16 重命名：笔记 + 本 → 列表即变、正在编辑的笔记不丢', async ({ page, request }) => {
    const ts = Date.now().toString(36);
    const nbName = `e2e改-${ts}`;
    await resetNotebooks(request);
    await apiSeed(request, nbName, [`原名-${ts}`]);

    await loginAs(page, STUDENT, STUDENT_PW);
    await openNotebook(page);
    await expandNotebook(page, nbName);
    await page.getByText(`原名-${ts}`, { exact: true }).first().click();
    await expect(page.locator('textarea')).toBeVisible();

    // 重命名笔记（行内改名 → 顶栏/列表同步换新名，不带 .md）
    const newNote = `新名-${ts}`;
    const noteRow = page.locator('div.group[class*="pl-9"]').filter({ hasText: `原名-${ts}` }).first();
    await noteRow.hover();
    await noteRow.locator('[title="重命名"]').click();
    // 输入框渲染后旧标题被顶掉，noteRow 的 hasText 不再匹配 → 按面板内 input 定位
    const renameInput = page.locator('div.group input').first();
    await renameInput.fill(newNote); // 行内输入框默认带旧名，必须清空重填
    await renameInput.press('Enter');
    await expect(page.getByText(newNote, { exact: true }).first(), '列表没换成新名').toBeVisible();
    await expect(page.getByText(`${newNote}.md`), 'P3：改名后不得有 .md').toHaveCount(0);

    // 重命名笔记本 → 选中态不丢、里面的笔记还在（id 制指针稳定）
    const folderRow = page.locator('div.group').filter({ hasText: nbName }).first();
    await folderRow.hover();
    await folderRow.locator('[title="重命名"]').click();
    const newNb = `新本-${ts}`;
    const folderInput = page.locator('div.group input').first();
    await folderInput.fill(newNb);
    await folderInput.press('Enter');
    await expect(page.getByText(newNb, { exact: true }).first(), '本没改成新名').toBeVisible();
    await expect(page.getByText(newNote, { exact: true }).first(), '改本名后笔记丢了').toBeVisible();
    await expect(page.locator('textarea'), '改本名后正在编辑的笔记丢了').toBeVisible();
  });

  test('E17 删除：笔记「不可恢复」真删 + 删本「含全部笔记」级联光', async ({ page, request }) => {
    const ts = Date.now().toString(36);
    const nbName = `e2e删-${ts}`;
    const noteTitle = `待删-${ts}`;
    await resetNotebooks(request);
    await apiSeed(request, nbName, [noteTitle, `陪删-${ts}`]);

    await loginAs(page, STUDENT, STUDENT_PW);
    await openNotebook(page);
    await expandNotebook(page, nbName);

    // 删笔记：确认弹窗必含「不可恢复」（spec §7）→ 真删
    const noteRow = page.locator('div.group[class*="pl-9"]').filter({ hasText: noteTitle }).first();
    await noteRow.hover();
    await noteRow.locator('button').last().click();
    const dialog = page.locator('div.fixed.inset-0.z-50');
    await expect(dialog, '删笔记弹窗没出现').toBeVisible();
    await expect(dialog.getByText(/不可恢复/), '删笔记确认必含「不可恢复」').toBeVisible();
    await dialog.getByRole('button', { name: '确认' }).click();
    await expect(page.getByText(noteTitle, { exact: true }), '删了还在').toHaveCount(0);

    // 删本：确认文案必含「含全部笔记」（基件 folderDeleteNote，M5b-4 补）→ 级联光
    const folderRow = page.locator('div.group').filter({ hasText: nbName }).first();
    await folderRow.hover();
    await folderRow.locator('[title="删除"]').click();
    await expect(dialog, '删本弹窗没出现').toBeVisible();
    await expect(dialog.getByText(/含全部笔记/), '删本确认必含「含全部笔记」（§7 级联语义）').toBeVisible();
    await dialog.getByRole('button', { name: '确认' }).click();
    await expect(page.getByText(nbName, { exact: true }), '删本后还在').toHaveCount(0);
  });

  test('E18 列表按最近编辑置顶 + 全程无 JS 报错', async ({ page, request }) => {
    const ts = Date.now().toString(36);
    const nbName = `e2e序-${ts}`;
    const A = `甲-${ts}`;
    const B = `乙-${ts}`;
    const C = `丙-${ts}`;
    await resetNotebooks(request);
    await apiSeed(request, nbName, [A, B, C]);
    // 隔离秒级时间戳：等 1.1s 再触碰 A → A 的 updated_at 确定晚于 B/C，
    // V2 列表按 updated_at 倒序应置顶（否则同秒内排序不稳定）
    await new Promise(r => setTimeout(r, 1100));
    await apiTouchNote(request, await apiNotebookId(request, nbName), A);

    const jsErrors: string[] = [];
    page.on('pageerror', e => jsErrors.push(String(e)));

    await loginAs(page, STUDENT, STUDENT_PW);
    await openNotebook(page);
    await expandNotebook(page, nbName);

    const rows = page.locator('div.group[class*="pl-9"]');
    await expect(rows.first(), '最近编辑的笔记应排第一').toContainText(A);
    // B/C 同秒创建（后端同秒按 id 倒序，次序不定）→ 只断言都在列，不钉死相对顺序
    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: B })).toHaveCount(1);
    await expect(rows.filter({ hasText: C })).toHaveCount(1);

    // 切换本/笔记点一圈，不该有未捕获异常
    await page.getByText(B, { exact: true }).first().click();
    await expect(page.locator('textarea')).toBeVisible();
    await page.getByText(C, { exact: true }).first().click();
    await expect(page.locator('textarea')).toBeVisible();
    expect(jsErrors, '切换笔记期间有 JS 报错').toEqual([]);
  });
});
