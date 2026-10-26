import { test, expect } from './fixtures';
import { business, marketingAvailability } from '../src/data/business';

for (const width of [390, 1440]) {
  for (const [path, title] of [['/privacy', 'Privacy & Cookies'], ['/sms-terms', 'SMS Terms'], ['/not-found', 'This page isn’t here.']]) {
    test(`legal coverage and accessible navigation ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('footer a[href="/privacy"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('footer [data-cookie-settings]').click();
      await expect(page.getByRole('dialog', { name: 'Cookie settings' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('footer [data-cookie-settings]')).toBeFocused();
      expect(errors).toEqual([]);
    });
  }
}

test('legal notices describe the actual operator, planned retention and unconfigured channels', async ({ page }) => {
  expect(marketingAvailability).toEqual({ email: false, sms: false });
  await page.goto('/privacy');
  const article = page.locator('article');
  await expect(article).toContainText(business.operator);
  await expect(article).toContainText(business.email);
  await expect(article).toContainText('Dominican Republic');
  await expect(article).toContainText('United States');
  for (const text of ['Six months', 'One year', 'At least 10 years', 'a deletion schedule has not been implemented', 'Brevo is not part of the current contact flow', 'marketing email is disabled', 'automated marketing SMS is disabled']) {
    await expect(article).toContainText(text);
  }
  await expect(article).not.toContainText('30078');
  await page.goto('/sms-terms');
  for (const text of ['planned program', 'not accepting subscriptions', 'STOP', 'HELP', 'no configured program number', 'Message and data rates may apply']) {
    await expect(page.locator('article')).toContainText(text);
  }
});
