import { expect, test, type Page } from '@playwright/test';
import { createServer } from 'node:http';

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
    expect(await page.locator('body > noscript').allTextContents()).toContainEqual(
      expect.stringContaining('https://www.facebook.com/tr?id=1053877131029984&amp;ev=PageView&amp;noscript=1'),
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

const contactEndpoint = 'https://script.google.com/**';
const corsHeaders = { 'access-control-allow-origin': '*' };

async function fillContact(page: Page) {
  await page.locator('input[name="name"]').fill('Pixel test');
  await page.locator('input[name="email"]').fill('pixel-test@example.com');
}

async function leadEvents(page: Page) {
  return page.evaluate(() => {
    const pixel = (window as unknown as { fbq?: { queue?: IArguments[] } }).fbq;
    return (pixel?.queue ?? []).map(args => Array.from(args)).filter(args => args[0] === 'track' && args[1] === 'Lead');
  });
}

test.describe('Meta Pixel Lead', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://connect.facebook.net/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.route('https://www.facebook.com/**', route => route.abort());
    await page.route('https://www.googletagmanager.com/**', route => route.abort());
    // Fail closed unless a test explicitly mocks the contact response.
    await page.route(contactEndpoint, route => route.abort());
    await page.route('https://script.googleusercontent.com/**', route => route.abort());
    await page.goto('/');
  });

  test('tracks once only after confirmation, prevents concurrent duplicates and allows another lead', async ({ page }) => {
    let submissions = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(contactEndpoint, async route => {
      submissions++;
      await gate;
      await route.fulfill({ status: 200, headers: corsHeaders, body: 'ok' });
    });
    await fillContact(page);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#form')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#sent')).toBeHidden();
    expect(await leadEvents(page)).toEqual([]);
    await page.locator('#form').evaluate(form => {
      (form as HTMLFormElement).requestSubmit();
      (form as HTMLFormElement).requestSubmit();
    });
    await expect.poll(() => submissions).toBe(1);
    release();
    await expect(page.locator('#sent')).toBeVisible();
    expect(await leadEvents(page)).toEqual([['track', 'Lead']]);
    await page.locator('#again').click();
    await fillContact(page);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#sent')).toBeVisible();
    expect(submissions).toBe(2);
    expect(await leadEvents(page)).toEqual([['track', 'Lead'], ['track', 'Lead']]);
  });

  test('reads the ContentService redirect without a preflight or changes to the form payload', async ({ page }) => {
    const methods: string[] = [];
    let payload = '';
    // Browser routing does not intercept the target of a mocked redirect. Use
    // local upstreams so the browser follows a real cross-origin redirect.
    const confirmation = createServer((request, response) => {
      methods.push(request.method!);
      response.writeHead(200, { ...corsHeaders, 'content-type': 'text/plain' });
      response.end('ok');
    });
    await new Promise<void>(resolve => confirmation.listen(0, '127.0.0.1', resolve));
    const confirmationPort = (confirmation.address() as { port: number }).port;
    const endpoint = createServer((request, response) => {
      methods.push(request.method!);
      request.on('data', chunk => { payload += chunk.toString(); });
      request.on('end', () => {
        response.writeHead(302, { ...corsHeaders, location: `http://127.0.0.1:${confirmationPort}/confirmation` });
        response.end();
      });
    });
    try {
      await new Promise<void>(resolve => endpoint.listen(0, '127.0.0.1', resolve));
      const port = (endpoint.address() as { port: number }).port;
      await page.evaluate(url => {
        const originalFetch = window.fetch;
        window.fetch = (input, init) => originalFetch(
          typeof input === 'string' && input.startsWith('https://script.google.com/') ? url : input,
          init,
        );
      }, `http://127.0.0.1:${port}/exec`);
      await fillContact(page);
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('#sent')).toBeVisible();
      expect(methods).toEqual(['POST', 'GET']);
      expect(new URLSearchParams(payload).get('email')).toBe('pixel-test@example.com');
      expect(new URLSearchParams(payload).get('needs')).toBe('Website');
      expect(await leadEvents(page)).toEqual([['track', 'Lead']]);
    } finally {
      await Promise.all([endpoint, confirmation].map(server => new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
      })));
    }
  });

  test('does not track or send empty fields, invalid email or missing needs', async ({ page }) => {
    let submissions = 0;
    await page.route(contactEndpoint, async route => {
      submissions++;
      await route.fulfill({ status: 200, headers: corsHeaders, body: 'ok' });
    });
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#sent')).toBeHidden();
    expect(await leadEvents(page)).toEqual([]);
    await page.locator('input[name="name"]').fill('Pixel test');
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#sent')).toBeHidden();
    expect(await leadEvents(page)).toEqual([]);
    await page.locator('input[name="email"]').fill('pixel-test@example.com');
    await page.locator('[data-need="website"]').click();
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#needError')).toBeVisible();
    expect(submissions).toBe(0);
    expect(await leadEvents(page)).toEqual([]);
  });

  for (const response of [
    { name: 'HTTP 400 even with ok', status: 400, body: 'ok' },
    { name: 'HTTP 500 even with ok', status: 500, body: 'ok' },
    { name: 'empty HTTP 200', status: 200, body: '' },
    { name: 'application error with HTTP 200', status: 200, body: 'error' },
    { name: 'Google error page with HTTP 200', status: 200, body: '<html><body>Script error</body></html>' },
  ]) {
    test(`does not track ${response.name}`, async ({ page }) => {
      await page.route(contactEndpoint, route => route.fulfill({ status: response.status, headers: corsHeaders, body: response.body }));
      await fillContact(page);
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('#submitError')).toBeVisible();
      await expect(page.locator('#sent')).toBeHidden();
      await expect(page.locator('input[name="email"]')).toHaveValue('pixel-test@example.com');
      expect(await leadEvents(page)).toEqual([]);
    });
  }

  test('does not track an unreadable CORS response', async ({ page }) => {
    await page.route(contactEndpoint, route => route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': 'https://different-origin.example' },
      body: 'ok',
    }));
    await fillContact(page);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#submitError')).toBeVisible();
    await expect(page.locator('#sent')).toBeHidden();
    expect(await leadEvents(page)).toEqual([]);
  });

  test('does not track a network failure and tracks only the confirmed retry', async ({ page }) => {
    await fillContact(page);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#submitError')).toBeVisible();
    expect(await leadEvents(page)).toEqual([]);
    await page.route(contactEndpoint, route => route.fulfill({ status: 200, headers: corsHeaders, body: 'ok' }));
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#sent')).toBeVisible();
    await expect(page.locator('#submitError')).toBeHidden();
    expect(await leadEvents(page)).toEqual([['track', 'Lead']]);
  });

  test('does not track a timeout', async ({ page }) => {
    await page.clock.install();
    await page.route(contactEndpoint, () => {});
    await fillContact(page);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#form')).toHaveAttribute('aria-busy', 'true');
    await page.clock.fastForward(15001);
    await expect(page.locator('#submitError')).toBeVisible();
    expect(await leadEvents(page)).toEqual([]);
  });

  for (const state of ['missing', 'throwing']) {
    test(`a ${state} pixel does not break a confirmed submission`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.evaluate(state => {
        const pixelWindow = window as Window & { fbq?: () => void };
        if (state === 'missing') delete pixelWindow.fbq;
        else pixelWindow.fbq = () => { throw new Error('Pixel unavailable'); };
      }, state);
      await page.route(contactEndpoint, route => route.fulfill({ status: 200, headers: corsHeaders, body: 'ok' }));
      await fillContact(page);
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('#sent')).toBeVisible();
      await expect(page.locator('#submitError')).toBeHidden();
      await expect(page.locator('button[type="submit"]')).toBeEnabled();
      expect(errors).toEqual([]);
    });
  }
});
