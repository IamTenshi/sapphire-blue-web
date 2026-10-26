import { expect, test } from './fixtures';
import { readFileSync } from 'node:fs';

const siteUrl = 'https://www.sapphireblue.studio/';
const imageUrl = `${siteUrl}social-preview-v2.jpg`;

// Request the raw HTML: social crawlers do not need to execute JavaScript.
for (const userAgent of [
  'WhatsApp/2.24.1',
  'facebookexternalhit/1.1',
  'Twitterbot/1.0',
  'LinkedInBot/1.0',
  'TelegramBot (like TwitterBot)',
  'Slackbot-LinkExpanding 1.0',
  'Discordbot/2.0',
]) {
  test(`share metadata is available to ${userAgent}`, async ({ request }) => {
    const response = await request.get('/', { headers: { 'User-Agent': userAgent } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).not.toContain('https://sapphireblue.studio');
    const meta = (key: string) => {
      const tag = html.match(new RegExp(`<meta\\b[^>]*(?:property|name)="${key}"[^>]*>`))?.[0];
      expect(tag, key).toBeTruthy();
      return tag?.match(/content="([^"]*)"/)?.[1];
    };
    expect(html).toContain(`<link rel="canonical" href="${siteUrl}">`);
    expect(meta('og:url')).toBe(siteUrl);
    expect(meta('og:type')).toBe('website');
    expect(meta('og:locale')).toBe('en_US');
    expect(meta('og:title')).toBe(meta('twitter:title'));
    expect(meta('og:description')).toBe(meta('twitter:description'));
    expect(meta('og:image')).toBe(imageUrl);
    expect(meta('og:image:secure_url')).toBe(imageUrl);
    expect(meta('og:image:type')).toBe('image/jpeg');
    expect(meta('og:image:width')).toBe('1200');
    expect(meta('og:image:height')).toBe('630');
    expect(meta('og:image:alt')).toBeTruthy();
    expect(meta('twitter:card')).toBe('summary_large_image');
    expect(meta('twitter:image')).toBe(imageUrl);
    expect(meta('twitter:image:alt')).toBe(meta('og:image:alt'));

    const image = await request.get(new URL(imageUrl).pathname, {
      headers: { 'User-Agent': userAgent },
    });
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/jpeg');
    const body = await image.body();
    expect(body.length).toBeLessThan(200_000);
    expect(body.subarray(0, 3).toString('hex')).toBe('ffd8ff');
  });
}

test('Vercel redirects only the apex host to the canonical www domain', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  expect(config.redirects).toEqual([
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'sapphireblue.studio' }],
      destination: `${siteUrl}:path*`,
      permanent: true,
    },
  ]);
});

test('social image decodes at its declared dimensions', async ({ page }) => {
  await page.goto('/social-preview-v2.jpg');
  const image = page.locator('img');
  await expect(image).toBeVisible();
  expect(await image.evaluate(async element => {
    const img = element as HTMLImageElement;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  })).toEqual([1200, 630]);
});
