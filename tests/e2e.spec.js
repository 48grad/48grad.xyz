// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.TEST_URL || 'http://localhost:8080';

test.describe('48grad.xyz', () => {
  test('homepage loads with HTTP 200', async ({ page }) => {
    const res = await page.goto(BASE_URL);
    expect(res.status()).toBe(200);
  });

  test('page title is correct', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle('48grad.xyz');
  });

  test('sidebar renders with tree and search', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('#search-input')).toBeVisible();
    await expect(page.locator('#tree')).toBeVisible();
  });

  test('theme toggle switches dark/light', async ({ page }) => {
    await page.goto(BASE_URL);
    const btn = page.locator('#theme-btn');
    const html = page.locator('html');

    const initial = await html.getAttribute('class');
    await btn.click();
    const toggled = await html.getAttribute('class');
    expect(initial).not.toBe(toggled);
  });

  test('data.json loads and tree populates', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => {
      const tree = document.getElementById('tree');
      return tree && tree.children.length > 0 && !tree.textContent.includes('Loading');
    }, { timeout: 10000 });
    const treeItems = page.locator('.tree-file, .tree-folder');
    await expect(treeItems.first()).toBeVisible();
  });

  test('README.md loads in main panel', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.content', { timeout: 10000 });
    const content = page.locator('#main .content');
    await expect(content).toBeVisible();
  });

  test('search filters results', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => {
      const tree = document.getElementById('tree');
      return tree && tree.children.length > 0 && !tree.textContent.includes('Loading');
    }, { timeout: 10000 });

    await page.locator('#search-input').fill('linux');
    await page.waitForTimeout(300);
    const results = page.locator('.tree-file');
    const count = await results.count();
    // Either results or "No results." message
    const noResults = page.locator('text=No results.');
    const hasResults = count > 0;
    const hasNoResults = await noResults.isVisible().catch(() => false);
    expect(hasResults || hasNoResults).toBe(true);
  });

  test('mobile menu button visible on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await expect(page.locator('.menu-btn').first()).toBeVisible();
  });

  test('app.js is served', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/app.js`);
    expect(res.status()).toBe(200);
  });

  test('data.json is served', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/data.json`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('tree');
    expect(body).toHaveProperty('contents');
  });
});
