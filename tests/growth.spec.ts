import { expect, test, type Page } from '@playwright/test';
import { indexablePaths } from '../src/data/seo';

const home = 'https://www.sapphireblue.studio/';
const endpoint = 'https://script.google.com/**';

test.beforeEach(async ({ page }) => {
  // Successful form tests must never send real Meta conversions.
  await page.route('https://connect.facebook.net/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('https://www.facebook.com/**', route => route.abort());
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
});

async function fillContact(page: Page) {
  await page.locator('input[name="name"]').fill('Private test person');
  await page.locator('input[name="email"]').fill('private-test@example.com');
  await page.locator('textarea[name="message"]').fill('Private message not for analytics');
}

test('campaign parameters never change the canonical or social URL', async ({ page }) => {
  await page.goto('/?utm_source=chatgpt&utm_campaign=test');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', home);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', home);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /max-snippet:-1/);
  await expect(page.locator('link[rel="sitemap"]')).toHaveAttribute('href', `${home}sitemap.xml`);
});

test('sitemap URLs are unique, indexable, self-canonical HTML pages', async ({ request, page }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('xml');
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(urls).toEqual(indexablePaths.map(path => new URL(path, home).href));
  expect(new Set(urls).size).toBe(urls.length);
  expect(xml).not.toMatch(/<lastmod>|404|llms\.txt|pricing\.md/);
  for (const url of urls) {
    const result = await page.goto(new URL(url).pathname);
    expect(result?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', url);
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/);
    await expect(page.locator('h1')).toHaveCount(1);
  }
});

test('all internal links and controlled elements have valid targets', async ({ page, request }) => {
  await page.goto('/');
  const targets = await page.locator('a[href^="#"], [aria-controls], [aria-labelledby], [aria-describedby]').evaluateAll(elements => elements.flatMap(element => {
    const values = ['aria-controls', 'aria-labelledby', 'aria-describedby'].flatMap(name => element.getAttribute(name)?.split(/\s+/) ?? []);
    const href = element.getAttribute('href');
    if (href?.startsWith('#')) values.push(href.slice(1));
    return values.map(id => ({ id, exists: document.getElementById(id) !== null }));
  }));
  expect(targets.filter(target => !target.exists)).toEqual([]);
  const ids = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  const paths = await page.locator('a[href^="/"]').evaluateAll(elements => elements.map(element => new URL((element as HTMLAnchorElement).href).pathname));
  for (const path of new Set(paths)) expect((await request.get(path)).status()).toBe(200);
});

test('unknown URLs return a real, branded, non-indexable 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle('Page not found | Sapphire Blue Studio');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page isn’t here.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL('/');
});

test('structured FAQ answers exactly match the page text', async ({ page }) => {
  await page.goto('/');
  const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText())['@graph'];
  const faq = graph.find((entry: { '@type': string }) => entry['@type'] === 'FAQPage');
  for (const question of faq.mainEntity) {
    const button = page.getByRole('button', { name: question.name, exact: true });
    if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
    const answer = page.locator(`#${await button.getAttribute('aria-controls')}`);
    await expect(answer).toBeVisible();
    expect((await answer.locator('p').allTextContents()).join(' ')).toBe(question.acceptedAnswer.text);
  }
});

test('keyboard users can skip navigation and operate the pricing tabs', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const social = page.getByRole('tab', { name: 'Social media' });
  const email = page.getByRole('tab', { name: 'Email marketing' });
  await social.focus();
  await page.keyboard.press('ArrowRight');
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute('aria-selected', 'true');
  await expect(social).toHaveAttribute('tabindex', '-1');
  await expect(page.getByRole('tabpanel', { name: 'Email marketing' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(social).toBeFocused();
  await page.keyboard.press('End');
  await expect(email).toBeFocused();
  await page.keyboard.press('Home');
  await expect(social).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(email).toBeFocused();
});

test('calculator controls retain keyboard focus and expose selection state', async ({ page }) => {
  await page.goto('/');
  const starter = page.locator('#optSocial button[data-value="starter"]');
  await starter.focus();
  await page.keyboard.press('Enter');
  await expect(starter).toBeFocused();
  await expect(starter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#optSocial button[data-value="growth"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#netsDec')).toBeDisabled();
  await page.locator('#optSocial button[data-value="none"]').click();
  await expect(page.locator('#netsInc')).toBeDisabled();
  await starter.click();
  for (let i = 0; i < 5; i++) await page.locator('#netsInc').click();
  await expect(page.locator('#netsInc')).toBeDisabled();
  await expect(page.locator('#nets')).toHaveText('5');
});

test('mobile menu resets on navigation, Escape, outside click and breakpoint changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const burger = page.locator('#burger');
  await burger.click();
  await page.keyboard.press('Escape');
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
  await expect(burger).toBeFocused();
  await burger.click();
  await page.locator('#mmenu a[href="#services"]').click();
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
  await burger.click();
  await page.locator('h1').click();
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
  await burger.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#mmenu')).toBeHidden();
});

test('content and contact remain useful without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await expect(page.locator('#plans-social')).toBeVisible();
    await expect(page.locator('#plans-email')).toBeVisible();
    await expect(page.locator('.plan')).toHaveCount(6);
    for (const answer of await page.locator('.faq .ans').all()) await expect(answer).toBeVisible();
    await expect(page.locator('#mmenu')).toBeVisible();
    await expect(page.locator('#burger')).toBeHidden();
    await expect(page.locator('#form')).toBeHidden();
    await expect(page.locator('#total')).toBeHidden();
    await expect(page.locator('#contact-form noscript p')).toBeVisible();
    await expect(page.locator('#contact-form noscript p')).toContainText('Please use the email link to send your request.');
    await expect(page.locator('#contact a[href="mailto:hello@sapphireblue.studio"]').first()).toBeVisible();
  } finally {
    await context.close();
  }
});

test('submission waits for the network, prevents duplicates and resets all needs', async ({ page }) => {
  let submissions = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(endpoint, async route => {
    submissions++;
    await gate;
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: 'ok' });
  });
  await page.goto('/');
  await fillContact(page);
  await page.locator('[data-need="social"]').click();
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  await expect(page.locator('#form')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#sent')).toBeHidden();
  await page.locator('#form').evaluate(form => (form as HTMLFormElement).requestSubmit());
  await expect.poll(() => submissions).toBe(1);
  release();
  await expect(page.locator('#sent')).toBeVisible();
  await expect(page.locator('#sent')).toContainText('Your request has been received.');
  await expect(page.locator('#sent-heading')).toBeFocused();
  await page.locator('#again').click();
  await expect(page.locator('[data-need="website"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-need="social"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('input[name="name"]')).toBeFocused();
});

test('network failure preserves the form and permits a deliberate retry', async ({ page }) => {
  await page.route(endpoint, route => route.abort('failed'));
  await page.goto('/');
  await fillContact(page);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#submitError')).toBeVisible();
  await expect(page.locator('#sent')).toBeHidden();
  await expect(page.locator('input[name="name"]')).toHaveValue('Private test person');
  await expect(page.locator('textarea')).toHaveValue('Private message not for analytics');
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  await expect(page.locator('#form')).not.toHaveAttribute('aria-busy');
  await page.route(endpoint, route => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: 'ok' }));
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#sent')).toBeVisible();
  await expect(page.locator('#submitError')).toBeHidden();
});

test('stalled submissions time out without losing the visitor’s details', async ({ page }) => {
  await page.clock.install();
  await page.route(endpoint, () => {});
  await page.goto('/');
  await fillContact(page);
  await page.locator('button[type="submit"]').click();
  await page.clock.fastForward(15001);
  await expect(page.locator('#submitError')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveValue('private-test@example.com');
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
});

test('marketing events distinguish attempts from delivery and exclude personal data', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).marketingEvents = [];
    document.addEventListener('sapphire:marketing', event => {
      (window as any).marketingEvents.push((event as CustomEvent).detail);
    });
  });
  const analyticsRequests: string[] = [];
  page.on('request', request => {
    if (/\/_vercel\/insights|google-analytics\.com/.test(request.url())) analyticsRequests.push(request.url());
  });
  await page.route(endpoint, route => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: 'ok' }));
  await page.goto('/');
  await page.locator('[data-plan="social:starter"]').click();
  await fillContact(page);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#sent')).toBeVisible();
  const events = await page.evaluate(() => (window as any).marketingEvents);
  expect(events).toContainEqual({ name: 'plan_selected', properties: { service: 'social', plan: 'starter' } });
  expect(events).toContainEqual({ name: 'contact_click', properties: { source: 'plan' } });
  expect(events).toContainEqual({ name: 'form_submit', properties: { needs: 'social' } });
  expect(events).toContainEqual({ name: 'form_success', properties: { needs: 'social' } });
  expect(JSON.stringify(events)).not.toMatch(/Private|private-test|example\.com|utm_/);
  expect(analyticsRequests).toEqual([]);
});
