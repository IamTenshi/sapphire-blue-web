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
    { srcPrefix: '/_astro/social-media-bubble.', width: 110, height: 96, aspectRatio: '551/480' },
    { srcPrefix: '/assets/sapphire-blue-wordmark.svg', width: 948, height: 143, aspectRatio: '948/143' },
  ];
  for (const { srcPrefix, width, height, aspectRatio } of expectedImages) {
    const image = images.find(tag => tag.includes(`src="${srcPrefix}`) && tag.includes('loading="lazy"'));
    expect(image).toBeDefined();
    expect(image).toContain(`width="${width}"`);
    expect(image).toContain(`height="${height}"`);
    expect(image).toContain(`[aspect-ratio:${aspectRatio}]`);
    expect(html).toContain(`aspect-ratio:${aspectRatio}`);
  }
});

for (const density of [1, 2, 3]) {
  test.describe(`social media icon at ${density}x density`, () => {
    test.use({ deviceScaleFactor: density });

    test('loads a correctly sized WebP instead of the original PNG', async ({ page, request }) => {
      const originalRequests: string[] = [];
      page.on('request', request => {
        if (new URL(request.url()).pathname === '/assets/social-media-bubble.png') {
          originalRequests.push(request.url());
        }
      });
      await page.goto('/');
      const icon = page.locator('#services img');
      await expect(icon).toHaveAttribute('alt', '');
      await expect(icon).toHaveAttribute('loading', 'lazy');
      await expect(icon).toHaveAttribute('sizes', '110px');
      const { currentSrc, candidates, width, height } = await icon.evaluate(async element => {
        const image = element as HTMLImageElement;
        image.loading = 'eager';
        await image.decode();
        const rect = image.getBoundingClientRect();
        return {
          currentSrc: image.currentSrc,
          candidates: image.srcset.split(',').map(candidate => candidate.trim().split(/\s+/)),
          width: rect.width,
          height: rect.height,
        };
      });
      expect(candidates.map(([, descriptor]) => descriptor)).toEqual(['110w', '220w', '330w']);
      const candidate = candidates.find(([, descriptor]) => descriptor === `${110 * density}w`);
      expect(currentSrc).toBe(new URL(candidate![0], page.url()).href);
      expect(width).toBe(110);
      expect(height).toBeCloseTo(110 * 480 / 551, 1);
      const response = await request.get(currentSrc);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/webp');
      expect((await response.body()).length).toBeLessThan(8 * 1024);
      const dimensions = await page.evaluate(async src => {
        const image = await createImageBitmap(await (await fetch(src)).blob());
        const dimensions = { width: image.width, height: image.height };
        image.close();
        return dimensions;
      }, currentSrc);
      expect(dimensions).toEqual({ width: 110 * density, height: 96 * density });
      expect(originalRequests).toEqual([]);
    });
  });
}

test('SEO and public asset URLs remain intact', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Sapphire Blue Studio | Small Business Marketing');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.sapphireblue.studio/');
  const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  expect(graph['@graph'].map((entry: { '@type': string }) => entry['@type'])).toEqual(['WebSite', 'Organization', 'WebPage', 'OfferCatalog', 'FAQPage']);
  for (const path of ['/og-image.png', '/assets/social-media-bubble.png', '/robots.txt', '/sitemap.xml']) {
    expect((await request.get(path)).status()).toBe(200);
  }
  // Off-screen lazy images need an explicit load before their decode can be
  // validated. Don't assume that page.goto() fetched the entire long page.
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images, image => {
      image.loading = 'eager';
      return image.decode();
    }));
  });
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
  await page.route('https://connect.facebook.net/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('https://www.facebook.com/**', route => route.abort());
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('https://script.google.com/**', async route => {
    payload = route.request().postData() ?? '';
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: 'ok' });
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
