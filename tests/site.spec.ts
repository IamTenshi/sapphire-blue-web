import { expect, test } from '@playwright/test';
import { calculate, type PlanSelection, type AdId } from '../src/data/pricing';

test('production styles and fonts avoid render-blocking stylesheet requests', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).not.toMatch(/<link\b[^>]*\brel=["']stylesheet["']/i);
  expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  expect(html).toMatch(/<style\b[^>]*>[\s\S]*?@font-face/);
  expect(html).toMatch(/<link\b[^>]*\brel="preload"[^>]*\bhref="\/fonts\/manrope-latin-wght-400-800\.woff2"[^>]*\bcrossorigin/);
  const font = await request.get('/fonts/manrope-latin-wght-400-800.woff2');
  expect(font.status()).toBe(200);
  expect((await font.body()).subarray(0, 4).toString()).toBe('wOF2');
});

test('local builds do not initialize Vercel collection scripts', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).not.toMatch(/<vercel-(?:analytics|speed-insights)\b/i);
});

test('lazy images with an auto dimension reserve their intrinsic aspect ratio', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  const images = html.match(/<img\b[^>]*>/g) ?? [];
  const expectedImages = [
    { src: '/assets/social-media-bubble.png', width: 551, height: 480 },
    { src: '/assets/sapphire-blue-wordmark.svg', width: 948, height: 143 },
  ];
  for (const { src, width, height } of expectedImages) {
    const image = images.find(tag => tag.includes(`src="${src}"`) && tag.includes('loading="lazy"'));
    expect(image).toBeDefined();
    expect(image).toContain(`width="${width}"`);
    expect(image).toContain(`height="${height}"`);
    expect(image).toContain(`[aspect-ratio:${width}/${height}]`);
    expect(html).toContain(`aspect-ratio:${width}/${height}`);
  }
});

test('SEO and public asset URLs remain intact', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Sapphire Blue Studio | Small Business Marketing');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.sapphireblue.studio/');
  const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  expect(graph['@graph'].map((entry: { '@type': string }) => entry['@type'])).toEqual(['WebSite', 'Organization', 'WebPage', 'OfferCatalog', 'FAQPage']);
  for (const path of ['/og-image.png', '/robots.txt', '/sitemap.xml']) {
    expect((await request.get(path)).status()).toBe(200);
  }
  expect(await page.locator('img').evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  expect(errors).toEqual([]);
});

test('all pricing combinations retain the original formula', () => {
  const choices: PlanSelection[] = ['none', 'starter', 'growth', 'full'];
  const prices = { none: 0, starter: 659, growth: 1099, full: 1759 };
  const email = { none: 0, starter: 529, growth: 1059, full: 1759 };
  const ads: Record<AdId, number> = { none: 0, t1: 529, t2: 799, t3: 1059, t4: 0 };
  for (const cs of choices) for (const ce of choices) for (const ad of Object.keys(ads) as AdId[]) {
    for (let nets = 0; nets <= 5; nets++) {
      const result = calculate({ cs, ce, nets, ads: ad });
      const saving = cs !== 'none' && ce !== 'none' ? Math.round((prices[cs] + email[ce]) * 10) / 100 : 0;
      const expected = prices[cs] + email[ce] - saving + (cs === 'none' ? 0 : nets * 199) + ads[ad];
      expect(Number(result.total.replace(/[$,]/g, ''))).toBeCloseTo(expected, 2);
      expect(result.custom).toBe(ad === 't4');
    }
  }
});

test('tabs, calculator, prefilling and FAQ', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#total')).toHaveText('$1,942.20');
  await page.locator('[data-tabbtn="email"]').click();
  await expect(page.locator('[data-pane="social"]').last()).toBeHidden();
  await expect(page.locator('[data-pane="email"]').last()).toBeVisible();
  await page.locator('[data-plan="email:starter"]').click();
  await expect(page.locator('textarea')).toHaveValue("Hi! I'd like to get started with the Email Marketing Starter plan ($529/month).");
  await page.locator('#netsInc').click();
  await expect(page.locator('#total')).toHaveText('$2,141.20');
  await page.locator('#optAds button').last().click();
  await expect(page.locator('#customAds')).toBeVisible();
  await page.locator('#getPlan').click();
  await expect(page.locator('textarea')).toHaveValue(/Monthly total: \$2,141.20\/month plus a custom quote for ads\./);
  await page.locator('#faqList button').nth(1).click();
  await expect(page.locator('#faqList .faq').nth(0)).not.toHaveClass(/open/);
  await expect(page.locator('#faqList button').nth(1)).toHaveAttribute('aria-expanded', 'true');
});

test('mobile menu retains its original breakpoint and navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#burger').click();
  await expect(page.locator('#mmenu')).toBeVisible();
  await page.locator('#mmenu a[href="#services"]').click();
  await expect(page.locator('#mmenu')).toBeHidden();
});

test('form preserves validation, payload and success/reset behavior without sending real leads', async ({ page }) => {
  let payload = '';
  await page.route('https://script.google.com/**', async route => {
    payload = route.request().postData() ?? '';
    await route.fulfill({ status: 200, body: '' });
  });
  await page.goto('/');
  await page.locator('input[name="name"]').fill('Migration test');
  await page.locator('input[name="email"]').fill('test@example.com');
  await page.locator('[data-need="website"]').click();
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#needError')).toBeVisible();
  await page.locator('[data-need="social"]').click();
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#sent')).toBeVisible();
  await expect.poll(() => new URLSearchParams(payload).get('needs')).toBe('Social media');
  expect(new URLSearchParams(payload).get('email')).toBe('test@example.com');
  await page.locator('#again').click();
  await expect(page.locator('#form')).toBeVisible();
  await expect(page.locator('input[name="name"]')).toHaveValue('');
});
