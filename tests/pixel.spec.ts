import { expect, test } from '@playwright/test';

for (const path of ['/', '/404.html']) {
  test(`Meta Pixel initializes once and queues PageView on ${path}`, async ({ page }) => {
    let loads = 0;
    await page.route('https://connect.facebook.net/**', route => {
      loads++;
      return route.fulfill({ contentType: 'application/javascript', body: '' });
    });
    await page.route('https://www.facebook.com/**', route => route.abort());
    await page.goto(path);
    const queue = await page.evaluate(() => {
      const pixel = (window as unknown as { fbq: { queue: IArguments[] } }).fbq;
      return pixel.queue.map(args => Array.from(args));
    });
    expect(queue).toEqual([
      ['init', '1053877131029984'],
      ['track', 'PageView'],
    ]);
    expect(loads).toBe(1);
    expect(await page.locator('body > noscript').textContent()).toContain(
      'https://www.facebook.com/tr?id=1053877131029984&ev=PageView&noscript=1',
    );
  });
}

test('Meta Pixel has a hidden PageView fallback without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const requests: string[] = [];
  await page.route('https://www.facebook.com/**', route => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto(baseURL!);
  const image = page.locator('noscript img');
  await expect(image).toHaveAttribute('alt', '');
  await expect(image).toBeHidden();
  expect(requests).toEqual([
    'https://www.facebook.com/tr?id=1053877131029984&ev=PageView&noscript=1',
  ]);
  await context.close();
});
