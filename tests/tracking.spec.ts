import { expect, test } from './fixtures';
import { TRACKING_STORAGE_KEY, TRACKING_TTL_MS, parsePreferences, safeMeasurementUrl, safeVercelContext } from '../src/data/tracking';
import { events, mockProduction, origin, preference, seed } from './tracking-helpers';

test('preference schema is versioned, bounded and strict', () => {
  const now = Date.now();
  const valid = preference(true, false, now);
  expect(parsePreferences(JSON.stringify(valid), now)).toEqual(valid);
  for (const value of [null, {}, [], 'oops', { ...valid, analytics: 'true' }, { ...valid, version: 2 }, { ...valid, savedAt: now + 1 }, { ...valid, expiresAt: now }, { ...valid, expiresAt: now + TRACKING_TTL_MS + 1 }, { ...valid, extra: true }]) {
    expect(parsePreferences(typeof value === 'string' ? value : JSON.stringify(value), now)).toBeNull();
  }
  expect(safeMeasurementUrl(origin + '/private/person@example.com?phone=secret#message')).toBe(origin + '/404');
  expect(safeMeasurementUrl(origin + '/privacy?email=secret#message')).toBe(origin + '/privacy');
  expect(safeVercelContext(origin + '/?secret=x', '')).toBe(false);
  expect(safeVercelContext(origin, origin + '/?secret=x')).toBe(false);
});

for (const path of ['/', '/privacy', '/sms-terms', '/private/person@example.com']) {
  test(`no optional loads before a choice on ${path}`, async ({ page, request, baseURL }) => {
    const { traffic, scripts } = await mockProduction(page, request, baseURL!);
    await page.goto(origin + path);
    await expect(page.locator('#cookie-banner')).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
    expect(traffic).toEqual([]);
    expect(scripts).toEqual([]);
    await expect(page.locator('noscript img')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reject optional', exact: true }).first().click();
    await expect(page.locator('#cookie-banner')).toBeHidden();
    expect(traffic).toEqual([]);
  });
}

for (const [analytics, advertising] of [[true, false], [false, true], [true, true]]) {
  test(`independent categories and idempotent configure: ${analytics}/${advertising}`, async ({ page, request, baseURL }) => {
    const { traffic, scripts } = await mockProduction(page, request, baseURL!);
    await page.goto(origin);
    await page.getByRole('button', { name: 'Configure', exact: true }).click();
    await page.locator('#cookie-analytics').setChecked(analytics);
    await page.locator('#cookie-advertising').setChecked(advertising);
    await page.getByRole('button', { name: 'Save choices', exact: true }).click();
    if (analytics) await expect.poll(() => events(traffic, 'page_view').length).toBe(1);
    if (advertising) await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
    for (let i = 0; i < 2; i++) {
      await page.locator('footer [data-cookie-settings]').click();
      await page.getByRole('button', { name: 'Save choices', exact: true }).click();
    }
    expect(events(traffic, 'page_view')).toHaveLength(analytics ? 1 : 0);
    expect(events(traffic, 'PageView')).toHaveLength(advertising ? 1 : 0);
    expect(scripts.filter(url => url.includes('googletagmanager'))).toHaveLength(analytics ? 1 : 0);
    expect(scripts.filter(url => url.includes('/_vercel/'))).toHaveLength(analytics ? 2 : 0);
    const frame = page.frames().find(frame => frame.url().endsWith('/measurement'))!;
    expect(await frame.evaluate(() => { try { return !!parent.document; } catch { return false; } })).toBe(false);
  });
}

for (const [name, bad] of [
  ['malformed', 'not-json'],
  ['unknown version', JSON.stringify({ ...preference(true, true), version: 99 })],
  ['expired', JSON.stringify(preference(true, true, Date.now() - TRACKING_TTL_MS - 1000))],
]) {
  test(`invalid or expired storage stays off: ${name}`, async ({ page, request, baseURL }) => {
    await seed(page, bad);
    const { traffic, scripts } = await mockProduction(page, request, baseURL!);
    await page.goto(origin);
    await expect(page.locator('#cookie-banner')).toBeVisible();
    expect(traffic).toEqual([]);
    expect(scripts).toEqual([]);
  });
}

test('unavailable storage cannot grant consent', async ({ page, request, baseURL }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Unavailable'); } }));
  const { traffic, scripts } = await mockProduction(page, request, baseURL!);
  await page.goto(origin);
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await expect(page.locator('#cookie-error')).toBeVisible();
  expect(traffic).toEqual([]);
  expect(scripts).toEqual([]);
});

for (const analytics of [false, true]) {
  test(`GPC overrides stored advertising without granting analytics (${analytics})`, async ({ page, request, baseURL }) => {
    await seed(page, preference(analytics, true));
    await page.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }));
    const { traffic } = await mockProduction(page, request, baseURL!);
    await page.goto(origin);
    await page.locator('footer [data-cookie-settings]').click();
    await expect(page.locator('#cookie-advertising')).toBeDisabled();
    await expect(page.locator('#cookie-advertising')).not.toBeChecked();
    await expect(page.locator('#cookie-gpc')).toBeVisible();
    if (analytics) await expect.poll(() => events(traffic, 'page_view').length).toBe(1);
    expect(events(traffic, 'PageView')).toHaveLength(0);
    expect(events(traffic, 'page_view')).toHaveLength(analytics ? 1 : 0);
  });
}

test('withdrawal reloads without optional SDKs and keeps a rejection', async ({ page, request, baseURL }) => {
  const { traffic, scripts } = await mockProduction(page, request, baseURL!);
  await page.goto(origin);
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await expect.poll(() => scripts.length).toBe(3);
  await page.locator('footer [data-cookie-settings]').click();
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Reject optional', exact: true }).last().click(),
  ]);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('#cookie-banner')).toBeHidden();
  expect(scripts).toHaveLength(3);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), TRACKING_STORAGE_KEY);
  expect(saved.analytics).toBe(false);
  expect(saved.advertising).toBe(false);
  const count = traffic.length;
  await page.reload();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(traffic).toHaveLength(count);
});

test('URLs, fragments and unknown paths cannot leak into optional requests', async ({ page, request, baseURL }) => {
  await seed(page, preference(true, true));
  const { traffic, scripts } = await mockProduction(page, request, baseURL!);
  await page.goto(origin + '/?email=PRIVATE@example.com#PRIVATE-message');
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await expect.poll(() => events(traffic, 'page_view').length).toBe(1);
  expect(scripts.filter(url => url.includes('/_vercel/'))).toHaveLength(0);
  expect(JSON.stringify(traffic)).not.toContain('PRIVATE');
  for (const item of traffic) {
    expect(item.headers.referer).toBeUndefined();
    expect(item.headers.cookie).toBeUndefined();
  }
  await page.goto(origin + '/private/PRIVATE@example.com');
  await expect.poll(() => events(traffic, 'PageView').length).toBe(2);
  expect(new URL(events(traffic, 'PageView')[1].url).searchParams.get('dl')).toBe(origin + '/404');
  expect(JSON.stringify(traffic)).not.toContain('PRIVATE');
});

test('Vercel middleware sanitizes automatic URLs, once per document', async ({ page, request, baseURL }) => {
  await seed(page, preference(true, false));
  const { traffic } = await mockProduction(page, request, baseURL!);
  await page.goto(origin + '/privacy');
  await expect.poll(() => traffic.filter(item => item.url.includes('/_vercel/')).length).toBe(2);
  expect(JSON.stringify(traffic)).not.toContain('PRIVATE');
  await page.getByRole('link', { name: 'SMS Terms', exact: true }).first().click();
  await expect.poll(() => events(traffic, 'page_view').length).toBe(2);
  expect(traffic.filter(item => item.url.includes('/insights/view'))).toHaveLength(2);
});

for (const mode of ['preview', 'development'] as const) {
  test(`${mode} output does not track even on the canonical origin with saved consent`, async ({ page, request, baseURL }) => {
    await seed(page, preference(true, true));
    const { traffic, scripts } = await mockProduction(page, request, baseURL!, mode);
    await page.goto(origin);
    await page.locator('footer [data-cookie-settings]').click();
    await page.getByRole('button', { name: 'Save choices', exact: true }).click();
    expect(traffic).toEqual([]);
    expect(scripts).toEqual([]);
  });
}

test('without JavaScript there are no optional requests, including direct measurement page', async ({ browser, request, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  const page = await context.newPage();
  const { traffic, scripts } = await mockProduction(page, request, baseURL!);
  try {
    for (const path of ['/', '/privacy', '/sms-terms', '/404.html', '/measurement']) {
      await page.goto(origin + path);
      await expect(page.locator('noscript img, iframe, script[src*="googletagmanager"]')).toHaveCount(0);
    }
    expect(traffic).toEqual([]);
    expect(scripts).toEqual([]);
  } finally { await context.close(); }
});

test('measurement document opened directly is inert', async ({ page, request, baseURL }) => {
  const { traffic, scripts } = await mockProduction(page, request, baseURL!);
  await page.goto(origin + '/measurement');
  expect(traffic).toEqual([]);
  expect(scripts).toEqual([]);
});

test('an active preference expires and unloads measurement', async ({ page, request, baseURL }) => {
  const now = Date.now();
  await seed(page, preference(true, true, now - TRACKING_TTL_MS + 10_000));
  const { traffic, scripts } = await mockProduction(page, request, baseURL!);
  await page.clock.install({ time: now });
  await page.goto(origin);
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await page.clock.fastForward(10_001);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('#cookie-banner')).toBeVisible();
  expect(scripts.filter(url => url.includes('googletagmanager'))).toHaveLength(1);
});

test('storage changes from another tab revoke a loaded category', async ({ page, request, baseURL }) => {
  const { traffic } = await mockProduction(page, request, baseURL!);
  await page.goto(origin);
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await page.evaluate(key => {
    localStorage.removeItem(key);
    dispatchEvent(new StorageEvent('storage', { key }));
  }, TRACKING_STORAGE_KEY);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('#cookie-banner')).toBeVisible();
});

test('settings dialog supports keyboard dismissal and restores focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Reject optional', exact: true }).first().click();
  const settings = page.locator('footer [data-cookie-settings]');
  await settings.click();
  await expect(page.getByRole('dialog', { name: 'Cookie settings' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#cookie-dialog')).not.toBeVisible();
  await expect(settings).toBeFocused();
});

test('withdrawing advertising preserves analytics independently', async ({ page, request, baseURL }) => {
  const { traffic } = await mockProduction(page, request, baseURL!);
  await page.goto(origin);
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await expect.poll(() => events(traffic, 'page_view').length).toBe(1);
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await page.locator('footer [data-cookie-settings]').click();
  await page.locator('#cookie-advertising').uncheck();
  await page.getByRole('button', { name: 'Save choices', exact: true }).click();
  await expect.poll(() => events(traffic, 'page_view').length).toBe(2);
  expect(events(traffic, 'PageView')).toHaveLength(1);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), TRACKING_STORAGE_KEY);
  expect(saved.analytics).toBe(true);
  expect(saved.advertising).toBe(false);
});

test('GPC changing during a visit removes a previously authorized advertising frame', async ({ page, request, baseURL }) => {
  // Persist the simulated browser signal across the safety reload, as a real
  // browser privacy signal would persist. Do not re-seed a withdrawn preference.
  await page.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => localStorage.getItem('test-gpc') === 'true' }));
  const { traffic } = await mockProduction(page, request, baseURL!);
  await page.goto(origin);
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await page.evaluate(() => { localStorage.setItem('test-gpc', 'true'); dispatchEvent(new Event('focus')); });
  await page.locator('footer [data-cookie-settings]').click();
  await expect(page.locator('#cookie-advertising')).toBeDisabled();
  await expect(page.locator('#cookie-advertising')).not.toBeChecked();
  expect(events(traffic, 'PageView')).toHaveLength(1);
});

for (const fallbackStorage of [true, false]) {
  test(`a failed withdrawal stays denied across links and can recover (fallback storage ${fallbackStorage})`, async ({ page, request, baseURL }) => {
    await page.addInitScript(({ stored, fallbackStorage }) => {
      const set = Storage.prototype.setItem;
      const remove = Storage.prototype.removeItem;
      const key = 'sapphire.tracking-preferences';
      if (!localStorage.getItem(key)) set.call(localStorage, key, JSON.stringify(stored));
      Storage.prototype.setItem = function (key, value) {
        if (!fallbackStorage || this === localStorage) throw new Error('Read-only storage');
        return set.call(this, key, value);
      };
      Storage.prototype.removeItem = function (key) {
        if (!fallbackStorage || this === localStorage) throw new Error('Read-only storage');
        return remove.call(this, key);
      };
      if (!fallbackStorage) Object.defineProperty(document, 'cookie', { configurable: true, get: () => '', set: () => {} });
      (window as any).restoreStorage = () => { Storage.prototype.setItem = set; Storage.prototype.removeItem = remove; };
    }, { stored: preference(true, true), fallbackStorage });
    const { traffic } = await mockProduction(page, request, baseURL!);
    await page.goto(origin);
    await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
    await page.locator('footer [data-cookie-settings]').click();
    await page.getByRole('button', { name: 'Reject optional', exact: true }).last().click();
    await expect(page).toHaveURL(/sapphire-tracking-off=1/);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('#cookie-safety')).toBeVisible();
    await page.locator('footer a').filter({ hasText: 'Privacy & Cookies' }).click();
    await expect(page).toHaveURL(/\/privacy\?sapphire-tracking-off=1/);
    await expect(page.locator('iframe')).toHaveCount(0);
    expect(events(traffic, 'PageView')).toHaveLength(1);
    if (fallbackStorage) {
      // The denial-only necessary cookie/session guard also covers an unmarked
      // direct navigation, not just rewritten links.
      await page.goto(origin + '/sms-terms');
      await expect(page.locator('iframe')).toHaveCount(0);
      await expect(page.locator('#cookie-safety')).toBeVisible();
    }
    await page.evaluate(() => (window as any).restoreStorage());
    await page.getByRole('button', { name: 'Reject optional', exact: true }).first().click();
    await expect(page.locator('#cookie-banner')).toBeHidden();
    await expect(page.locator('#cookie-error')).toBeHidden();
    expect(new URL(page.url()).searchParams.has('sapphire-tracking-off')).toBe(false);
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), TRACKING_STORAGE_KEY);
    expect(stored.analytics).toBe(false);
    expect(stored.advertising).toBe(false);
    expect(events(traffic, 'PageView')).toHaveLength(1);
  });
}

test('a sensitive incoming referrer suppresses Vercel and is not forwarded to the isolated providers', async ({ page, request, baseURL }) => {
  await seed(page, preference(true, true));
  const { traffic, scripts } = await mockProduction(page, request, baseURL!);
  await page.goto(origin + '/privacy', { referer: origin + '/?email=PRIVATE@example.com' });
  expect(await page.evaluate(() => document.referrer)).toContain('PRIVATE');
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await expect.poll(() => events(traffic, 'page_view').length).toBe(1);
  expect(scripts.filter(url => url.includes('/_vercel/'))).toHaveLength(0);
  expect(JSON.stringify(traffic)).not.toContain('PRIVATE');
  for (const item of traffic) expect(item.headers.referer).toBeUndefined();
});

test('an unsafe history change restarts without Vercel and keeps provider URLs sanitized', async ({ page, request, baseURL }) => {
  await seed(page, preference(true, true));
  const { traffic, scripts } = await mockProduction(page, request, baseURL!);
  await page.goto(origin);
  await expect.poll(() => scripts.filter(url => url.includes('/_vercel/')).length).toBe(2);
  await expect.poll(() => events(traffic, 'PageView').length).toBe(1);
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(() => history.pushState({}, '', '/?email=PRIVATE@example.com#PRIVATE-message')),
  ]);
  await expect.poll(() => events(traffic, 'PageView').length).toBe(2);
  expect(scripts.filter(url => url.includes('/_vercel/'))).toHaveLength(2);
  expect(JSON.stringify(traffic)).not.toContain('PRIVATE');
});
