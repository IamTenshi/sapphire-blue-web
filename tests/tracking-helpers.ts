import type { APIRequestContext, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { TRACKING_ORIGIN, TRACKING_STORAGE_KEY, TRACKING_TTL_MS, TRACKING_VERSION } from '../src/data/tracking';

export { TRACKING_ORIGIN as origin };
export const endpoint = 'https://script.google.com/**';
export const cors = { 'access-control-allow-origin': '*' };

export function preference(analytics: boolean, advertising: boolean, savedAt = Date.now()) {
  return { version: TRACKING_VERSION, savedAt, expiresAt: savedAt + TRACKING_TTL_MS, analytics, advertising };
}

export async function seed(page: Page, value: unknown) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)), { key: TRACKING_STORAGE_KEY, value });
}

export async function fillContact(page: Page) {
  await page.locator('input[name="name"]').fill('Private test person');
  await page.locator('input[name="email"]').fill('private-test@example.com');
  await page.locator('input[name="phone"]').fill('+12025550123');
  await page.locator('textarea[name="message"]').fill('PRIVATE message never for measurement');
}

// A controlled substitute, not a claim of vendor ingestion. It exercises script
// loading, initialization, queued events and resulting browser network requests.
const googleMock = `(() => {
  let config = {};
  function command(...args) {
    (window.googleCommands ||= []).push(args);
    if (args[0] === 'config') config = args[2];
    if (args[0] === 'event') {
      const q = new URLSearchParams({en:args[1], dl:config.page_location, dr:config.page_referrer, ...args[2]});
      fetch('https://www.google-analytics.com/g/collect?' + q, {mode:'no-cors',credentials:'omit',referrerPolicy:'no-referrer'});
    }
  }
  const queue = [...(window.dataLayer || [])];
  window.gtag = command;
  window.dataLayer.push = args => command(...args);
  queue.forEach(args => command(...args));
})();`;

const metaMock = `(() => {
  const pixel = window.fbq;
  const command = (...args) => {
    (window.metaCommands ||= []).push(args);
    if (args[0] !== 'track') return;
    const q = new URLSearchParams({id:'1053877131029984', ev:args[1], dl:location.href, ...args[2]});
    fetch('https://www.facebook.com/tr/?' + q, {mode:'no-cors',credentials:'omit',referrerPolicy:'no-referrer'});
  };
  pixel.callMethod = command;
  const queue = [...pixel.queue]; pixel.queue.length = 0;
  queue.forEach(args => command(...args));
})();`;

const analyticsMock = `(() => {
  let before;
  const send = (type, data) => {
    if (type === 'beforeSend') { before = data; return; }
    const event = before?.({type:type === 'pageview' ? 'pageview' : 'event',url:location.href + '?PRIVATE=bad#secret'});
    if (event) fetch('/_vercel/insights/view', {method:'POST',body:JSON.stringify({...event,referrer:document.referrer,data}),referrerPolicy:'no-referrer'});
  };
  const queue = [...(window.vaq || [])];
  window.va = send;
  queue.forEach(args => send(...args));
})();`;

const speedMock = `(() => {
  let before;
  window.si = (type, fn) => { if (type === 'beforeSend') before = fn; };
  (window.siq || []).forEach(args => window.si(...args));
  const event = before?.({type:'vital',url:location.href + '?PRIVATE=bad#secret'});
  if (event) fetch('/_vercel/speed-insights/vitals', {method:'POST',body:JSON.stringify(event),referrerPolicy:'no-referrer'});
})();`;

export interface MeasurementRequest { url: string; body: string; headers: Record<string, string>; }

export async function mockProduction(page: Page, _request: APIRequestContext, _baseURL: string, mode: 'production' | 'preview' | 'development' = 'production') {
  const traffic: MeasurementRequest[] = [];
  const scripts: string[] = [];
  await page.route(`${TRACKING_ORIGIN}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/_vercel/')) {
      if (url.pathname.endsWith('/script.js')) {
        scripts.push(url.pathname);
        return route.fulfill({ contentType: 'application/javascript', body: url.pathname.includes('speed-insights') ? speedMock : analyticsMock });
      }
      traffic.push({ url: url.href, body: route.request().postData() ?? '', headers: await route.request().allHeaders() });
      return route.fulfill({ status: 204 });
    }
    // Mirror the fresh static build directly. A consent-triggered reload can
    // otherwise outlive the test's APIRequestContext and race its disposal.
    const root = resolve('dist');
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    let status = 200;
    let body: Buffer;
    try {
      if (!file.startsWith(root + sep) && file !== root) throw new Error('Outside build');
      if (!extname(file)) file = resolve(file, 'index.html');
      body = await readFile(file);
    } catch {
      file = resolve(root, '404.html');
      body = await readFile(file);
      status = 404;
    }
    const contentType = ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml', '.md': 'text/plain' } as Record<string, string>)[extname(file)] ?? 'application/octet-stream';
    if (mode !== 'production' && contentType === 'text/html') {
      body = Buffer.from(body.toString().replace('data-tracking-production="true"', 'data-tracking-production="false"').replace('data-production="true"', 'data-production="false"'));
    }
    return route.fulfill({ status, contentType, body });
  });
  await page.route('https://www.googletagmanager.com/**', route => {
    scripts.push(route.request().url());
    return route.fulfill({ contentType: 'application/javascript', body: googleMock });
  });
  await page.route('https://connect.facebook.net/**', route => {
    scripts.push(route.request().url());
    return route.fulfill({ contentType: 'application/javascript', body: metaMock });
  });
  await page.route(/https:\/\/(?:www\.facebook\.com|[^/]*google-analytics\.com)\//, async route => {
    traffic.push({ url: route.request().url(), body: route.request().postData() ?? '', headers: await route.request().allHeaders() });
    return route.fulfill({ status: 204, headers: cors });
  });
  // Even tests which do not submit the form fail closed at both Google hosts.
  await page.route(endpoint, route => route.abort('blockedbyclient'));
  await page.route('https://script.googleusercontent.com/**', route => route.abort('blockedbyclient'));
  return { traffic, scripts };
}

export function events(traffic: MeasurementRequest[], name: string) {
  return traffic.filter(item => {
    const url = new URL(item.url);
    return url.searchParams.get('ev') === name || url.searchParams.get('en') === name;
  });
}
