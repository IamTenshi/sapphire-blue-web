import { expect, test } from './fixtures';
import { cors, endpoint, events, fillContact, mockProduction, origin, preference, seed } from './tracking-helpers';
import { createServer } from 'node:http';

test('confirmed success only, independently authorized conversions, no concurrent duplicates or replay', async ({ page, request, baseURL }) => {
  const { traffic } = await mockProduction(page, request, baseURL!);
  await page.goto(origin);
  let submissions = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(endpoint, async route => {
    submissions++;
    await gate;
    return route.fulfill({ headers: cors, body: 'ok' });
  });
  await fillContact(page);
  await page.locator('#form button[type="submit"]').click();
  await expect(page.locator('#form')).toHaveAttribute('aria-busy', 'true');
  await page.locator('#form').evaluate(form => { (form as HTMLFormElement).requestSubmit(); (form as HTMLFormElement).requestSubmit(); });
  expect(submissions).toBe(1);
  expect(events(traffic, 'Lead')).toHaveLength(0);
  expect(events(traffic, 'generate_lead')).toHaveLength(0);
  release();
  await expect(page.locator('#sent')).toBeVisible();
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await expect.poll(() => events(traffic, 'page_view').length).toBe(1);
  expect(events(traffic, 'Lead')).toHaveLength(0);
  expect(events(traffic, 'generate_lead')).toHaveLength(0);
  await page.locator('#again').click();
  await fillContact(page);
  await page.locator('#form button[type="submit"]').click();
  await expect(page.locator('#sent')).toBeVisible();
  await expect.poll(() => events(traffic, 'Lead').length).toBe(1);
  await expect.poll(() => events(traffic, 'generate_lead').length).toBe(1);
  expect(submissions).toBe(2);
  expect(JSON.stringify(traffic)).not.toMatch(/private-test|Private test|PRIVATE message|12025550123/);
});

for (const [analytics, advertising] of [[true, false], [false, true], [false, false]]) {
  test(`lead checks permission at response: analytics=${analytics}, advertising=${advertising}`, async ({ page, request, baseURL }) => {
    await seed(page, preference(analytics, advertising));
    const { traffic } = await mockProduction(page, request, baseURL!);
    await page.route(endpoint, route => route.fulfill({ headers: cors, body: 'ok' }));
    await page.goto(origin);
    if (analytics) await expect.poll(() => events(traffic, 'page_view').length).toBe(1);
    if (advertising) await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
    await fillContact(page);
    await page.locator('#form button[type="submit"]').click();
    await expect(page.locator('#sent')).toBeVisible();
    if (analytics) await expect.poll(() => events(traffic, 'generate_lead').length).toBe(1);
    if (advertising) await expect.poll(() => events(traffic, 'Lead').length).toBe(1);
    expect(events(traffic, 'generate_lead')).toHaveLength(analytics ? 1 : 0);
    expect(events(traffic, 'Lead')).toHaveLength(advertising ? 1 : 0);
  });
}

for (const response of [
  { name: 'HTTP 400', status: 400, body: 'ok' },
  { name: 'HTTP 500', status: 500, body: 'ok' },
  { name: 'empty response', status: 200, body: '' },
  { name: 'ambiguous response', status: 200, body: 'success' },
  { name: 'error HTML', status: 200, body: '<html>Error</html>' },
  { name: 'unreadable CORS', status: 200, body: 'ok', origin: 'https://wrong.example' },
  { name: 'network failure', status: 0, body: '' },
]) {
  test(`no conversion for ${response.name}`, async ({ page, request, baseURL }) => {
    await seed(page, preference(true, true));
    const { traffic } = await mockProduction(page, request, baseURL!);
    await page.route(endpoint, route => response.status ? route.fulfill({ status: response.status, headers: { 'access-control-allow-origin': response.origin ?? '*' }, body: response.body }) : route.abort());
    await page.goto(origin);
    await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
    await fillContact(page);
    await page.locator('#form button[type="submit"]').click();
    await expect(page.locator('#submitError')).toBeVisible();
    await expect(page.locator('#sent')).toBeHidden();
    expect(events(traffic, 'Lead')).toHaveLength(0);
    expect(events(traffic, 'generate_lead')).toHaveLength(0);
  });
}

test('a changed preference during an in-flight request is checked again at confirmation', async ({ page, request, baseURL }) => {
  await seed(page, preference(true, true));
  const { traffic } = await mockProduction(page, request, baseURL!);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(endpoint, async route => { await gate; return route.fulfill({ headers: cors, body: 'ok' }); });
  await page.goto(origin);
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await fillContact(page);
  await page.locator('#form button[type="submit"]').click();
  // No storage event in this document: exercise the event-time check before the poll.
  await page.evaluate(() => localStorage.removeItem('sapphire.tracking-preferences'));
  release();
  await expect(page.locator('#sent')).toBeVisible();
  expect(events(traffic, 'Lead')).toHaveLength(0);
  expect(events(traffic, 'generate_lead')).toHaveLength(0);
});

test('missing or blocked measurement does not break confirmed inquiry', async ({ page, request, baseURL }) => {
  await seed(page, preference(true, true));
  await mockProduction(page, request, baseURL!);
  await page.route('https://www.googletagmanager.com/**', route => route.abort());
  await page.route('https://www.facebook.com/**', route => route.abort());
  await page.route(endpoint, route => route.fulfill({ headers: cors, body: 'ok' }));
  await page.goto(origin);
  await fillContact(page);
  await page.locator('#form button[type="submit"]').click();
  await expect(page.locator('#sent')).toBeVisible();
  await expect(page.locator('#submitError')).toBeHidden();
});

test('an unconfirmed timeout never emits a conversion', async ({ page, request, baseURL }) => {
  await seed(page, preference(true, true));
  const { traffic } = await mockProduction(page, request, baseURL!);
  await page.route(endpoint, () => {});
  await page.goto(origin);
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await page.clock.install();
  await fillContact(page);
  await page.locator('#form button[type="submit"]').click();
  await expect(page.locator('#form')).toHaveAttribute('aria-busy', 'true');
  await page.clock.fastForward(15_001);
  await expect(page.locator('#submitError')).toBeVisible();
  expect(events(traffic, 'Lead')).toHaveLength(0);
  expect(events(traffic, 'generate_lead')).toHaveLength(0);
});

test('the unchanged form POST follows a readable ContentService-style redirect without preflight', async ({ page }) => {
  const methods: string[] = [];
  let payload = '';
  const confirmation = createServer((request, response) => {
    methods.push(request.method!);
    response.writeHead(200, { ...cors, 'content-type': 'text/plain' });
    response.end('ok');
  });
  await new Promise<void>(resolve => confirmation.listen(0, '127.0.0.1', resolve));
  const confirmationPort = (confirmation.address() as { port: number }).port;
  const upstream = createServer((request, response) => {
    methods.push(request.method!);
    request.on('data', chunk => { payload += chunk.toString(); });
    request.on('end', () => {
      response.writeHead(302, { ...cors, location: `http://127.0.0.1:${confirmationPort}/confirmation` });
      response.end();
    });
  });
  try {
    await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
    const port = (upstream.address() as { port: number }).port;
    await page.goto('/');
    await page.evaluate(url => {
      const originalFetch = window.fetch;
      window.fetch = (input, init) => originalFetch(typeof input === 'string' && input.startsWith('https://script.google.com/') ? url : input, init);
    }, `http://127.0.0.1:${port}/exec`);
    await fillContact(page);
    await page.locator('#form button[type="submit"]').click();
    await expect(page.locator('#sent')).toBeVisible();
    expect(methods).toEqual(['POST', 'GET']);
    expect([...new URLSearchParams(payload).keys()]).toEqual(['name', 'business', 'email', 'phone', 'message', 'needs']);
  } finally {
    await Promise.all([upstream, confirmation].map(server => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))));
  }
});
