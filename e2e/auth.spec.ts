import { test, expect, type Page } from '@playwright/test';

/** M5a 登录链 4 条（V2 /api/auth/*）——手工验收后固化，验收单先红后绿的"绿"基准 */

const ADMIN = 'admin';
const ADMIN_PW = '111111';

/** 打开主页并拉起登录面板（侧栏 rail/展开两模式通吃） */
async function openLoginPanel(page: Page) {
  await page.goto('/');
  await page
    .locator('[data-tip="登录"]')
    .or(page.getByRole('button', { name: '登录', exact: true }))
    .first()
    .click();
  await expect(page.getByText('登入', { exact: true })).toBeVisible();
}

/** 填表并点「进入」 */
async function submitLogin(page: Page, username: string, password: string) {
  await page.getByLabel(/用户名/).fill(username);
  await page.getByLabel(/密码/).fill(password);
  await page.getByRole('button', { name: '进入' }).click();
}

test.describe('M5a 登录链', () => {
  test('① 错密码 → 报「账号或密码错误」', async ({ page }) => {
    await openLoginPanel(page);
    await submitLogin(page, ADMIN, 'wrong-password');
    await expect(page.getByText('账号或密码错误')).toBeVisible();
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('② admin 登录 → 进入 dashboard', async ({ page }) => {
    await openLoginPanel(page);
    await submitLogin(page, ADMIN, ADMIN_PW);
    await page.waitForURL('**/dashboard');
    await expect(page.locator('[title="退出登录"]')).toBeVisible();
  });

  test('③ F5 刷新 → 会话保持', async ({ page }) => {
    await openLoginPanel(page);
    await submitLogin(page, ADMIN, ADMIN_PW);
    await page.waitForURL('**/dashboard');

    await page.reload();
    // useAuth 用 /api/auth/me 校验 localStorage 里的 token，仍在 dashboard = 会话保持
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('[title="退出登录"]')).toBeVisible();
  });

  test('④ 登出 → 回到未登录态', async ({ page }) => {
    await openLoginPanel(page);
    await submitLogin(page, ADMIN, ADMIN_PW);
    await page.waitForURL('**/dashboard');

    await page.locator('[title="退出登录"]').click();
    // useAuth.logout 清 localStorage，App 重渲染回主页「登录」入口（侧栏 rail/展开两模式通吃）
    await expect(
      page.locator('[data-tip="登录"]').or(page.getByRole('button', { name: '登录' })),
    ).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
