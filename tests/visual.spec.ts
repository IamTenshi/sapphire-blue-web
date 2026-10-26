import { expect, test } from './fixtures';

// Historic original-* and privacy-* files are preserved. The inquiry-* references
// record the intentionally shorter form without replacing previous baselines.
for (const width of [390, 819, 820, 1440]) {
  test(`privacy additions preserve the surrounding design at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(process.env.BASELINE_URL ?? '/');
    await page.getByRole('button', { name: 'Reject optional', exact: true }).first().click();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all(Array.from(document.images, image => {
      image.loading = 'eager';
      return image.decode();
    })));
    expect(await page.evaluate(() => document.fonts.check('800 48px Manrope'))).toBe(true);
    await expect(page.locator('#total')).toHaveText('$1,942.20');
    await expect(page).toHaveScreenshot(`inquiry-home-${width}.png`, {
      fullPage: true,
      animations: 'disabled',
      threshold: 0,
      maxDiffPixels: 0,
      timeout: 15000,
    });
  });
}

for (const width of [390, 1440]) {
  test(`email plans and configured calculator at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(process.env.BASELINE_URL ?? '/');
    await page.getByRole('button', { name: 'Reject optional', exact: true }).first().click();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all(Array.from(document.images, image => {
      image.loading = 'eager';
      return image.decode();
    })));
    await page.locator('[data-tabbtn="email"]').click();
    await page.locator('#netsInc').click();
    await page.locator('#optAds button').last().click();
    await page.mouse.move(0, 0);
    await expect(page.locator('#plans')).toHaveScreenshot(`configured-plans-${width}.png`, {
      animations: 'disabled', threshold: 0, maxDiffPixels: 0, timeout: 15000,
    });
  });
}

for (const width of [390, 1440]) {
  test(`accessible privacy controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`privacy-banner-${width}.png`, { animations: 'disabled', threshold: 0, maxDiffPixels: 0 });
    await page.getByRole('button', { name: 'Configure', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Cookie settings' })).toBeVisible();
    await expect(page).toHaveScreenshot(`privacy-settings-${width}.png`, { animations: 'disabled', threshold: 0, maxDiffPixels: 0 });
  });
}
