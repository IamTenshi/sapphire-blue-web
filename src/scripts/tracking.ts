import {
  TRACKING_ORIGIN, TRACKING_STORAGE_KEY, TRACKING_TTL_MS, TRACKING_VERSION,
  measurementPath, parsePreferences, safeMeasurementUrl, safeVercelContext,
  type TrackingPreferences,
} from '../data/tracking';

const denied = { analytics: false, advertising: false };
let initialized = false;
let frame: HTMLIFrameElement | undefined;
let port: MessagePort | undefined;
let ready = false;
let loaded = { ...denied };
let vercelStarted = false;
let restarting = false;
let storageFailed = false;
let expiryTimer: number | undefined;
const SAFETY_KEY = 'sapphire.tracking-blocked';
const SAFETY_COOKIE = 'sapphire_tracking_blocked';
const SAFETY_PARAM = 'sapphire-tracking-off';

function readStored(): TrackingPreferences | null {
  try { return parsePreferences(localStorage.getItem(TRACKING_STORAGE_KEY)); }
  catch { return null; }
}

function safetyBlocked(): boolean {
  if (storageFailed || new URLSearchParams(location.search).has(SAFETY_PARAM)) return true;
  try { if (sessionStorage.getItem(SAFETY_KEY) === '1') return true; } catch { /* URL fallback */ }
  try { if (document.cookie.split(';').some(cookie => cookie.trim() === `${SAFETY_COOKIE}=1`)) return true; } catch { /* URL fallback */ }
  return false;
}

function read(): TrackingPreferences | null {
  return safetyBlocked() ? null : readStored();
}

function markInternalLinks(blocked: boolean) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const url = new URL(link.href);
    if (url.origin !== location.origin) continue;
    if (blocked) url.searchParams.set(SAFETY_PARAM, '1');
    else url.searchParams.delete(SAFETY_PARAM);
    link.setAttribute('href', url.pathname + url.search + url.hash);
  }
}

function blockAfterStorageFailure() {
  storageFailed = true;
  // Denial-only, technically necessary safeguards. Neither is an analytics grant.
  try { sessionStorage.setItem(SAFETY_KEY, '1'); } catch { /* URL/link fallback */ }
  try { document.cookie = `${SAFETY_COOKIE}=1; Path=/; Max-Age=${TRACKING_TTL_MS / 1000}; SameSite=Lax; Secure`; } catch { /* URL/link fallback */ }
  markInternalLinks(true);
}

function clearSafetyBlock() {
  try { sessionStorage.removeItem(SAFETY_KEY); } catch { /* may be unavailable */ }
  try { document.cookie = `${SAFETY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`; } catch { /* may be unavailable */ }
  markInternalLinks(false);
  const url = new URL(location.href);
  url.searchParams.delete(SAFETY_PARAM);
  if (url.href !== location.href) history.replaceState(history.state, '', url);
  if (safetyBlocked()) throw new Error('Safety denial could not be cleared');
}

function gpc(): boolean {
  try { return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true; }
  catch { return true; }
}

function production(): boolean {
  return document.documentElement.dataset.trackingProduction === 'true' && location.origin === TRACKING_ORIGIN;
}

export function effectiveTracking() {
  const preferences = read();
  if (!preferences || !production() || restarting) return { ...denied };
  return { analytics: preferences.analytics, advertising: preferences.advertising && !gpc() };
}

function restart() {
  if (restarting) return;
  restarting = true;
  ready = false;
  port?.close();
  port = undefined;
  frame?.remove();
  frame = undefined;
  // Vercel has no supported full SDK teardown. The new document re-checks storage
  // and GPC before loading anything. Never keep a live SDK after withdrawal.
  if (storageFailed) {
    // If saving a withdrawal fails while an old grant is still readable, the
    // reload must not resurrect it. This URL contains no submitted form data.
    const url = new URL(location.href);
    url.searchParams.set(SAFETY_PARAM, '1');
    location.replace(url);
  } else location.reload();
}

function vercelAllowed() {
  return effectiveTracking().analytics && safeVercelContext(location.href, document.referrer);
}

async function startVercel() {
  if (vercelStarted || !vercelAllowed()) return;
  vercelStarted = true;
  const [analytics, speed] = await Promise.allSettled([import('@vercel/analytics'), import('@vercel/speed-insights')]);
  // The visitor may have withdrawn permission while chunks were loading.
  if (!vercelAllowed()) return;
  if (analytics.status === 'fulfilled') {
    analytics.value.inject({
      mode: 'production', debug: false, disableAutoTrack: true,
      beforeSend: event => vercelAllowed() ? { ...event, url: safeMeasurementUrl(event.url) } : null,
    });
    analytics.value.pageview({ path: measurementPath(location.pathname) });
  }
  if (speed.status === 'fulfilled') {
    speed.value.injectSpeedInsights({
      debug: false, route: measurementPath(location.pathname),
      beforeSend: event => vercelAllowed() ? { ...event, url: safeMeasurementUrl(event.url), route: measurementPath(location.pathname) } : null,
    });
  }
}

function apply() {
  const next = effectiveTracking();
  if (vercelStarted && !safeVercelContext(location.href, document.referrer)) {
    restart();
    return;
  }
  if ((loaded.analytics && !next.analytics) || (loaded.advertising && !next.advertising)) {
    restart();
    return;
  }
  if (next.analytics || next.advertising) {
    loaded = { ...next };
    if (!frame) {
      frame = document.createElement('iframe');
      frame.hidden = true;
      frame.title = 'Optional measurement';
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.referrerPolicy = 'no-referrer';
      frame.src = '/measurement';
      frame.addEventListener('load', () => {
        const current = effectiveTracking();
        if (!current.analytics && !current.advertising) return;
        const channel = new MessageChannel();
        port = channel.port1;
        port.onmessage = ({ data }) => {
          if (data?.type === 'ready') {
            ready = true;
            port?.postMessage({ type: 'enable', ...effectiveTracking() });
          }
        };
        frame?.contentWindow?.postMessage({ type: 'sapphire:connect', page: measurementPath(location.pathname), ...current }, '*', [channel.port2]);
      }, { once: true });
      document.body.append(frame);
    } else if (ready) {
      port?.postMessage({ type: 'enable', ...next });
    }
    if (next.analytics) void startVercel();
  }
  window.clearTimeout(expiryTimer);
  const preferences = read();
  if (preferences) expiryTimer = window.setTimeout(refresh, Math.min(preferences.expiresAt - Date.now() + 1, 60_000));
}

// No buffering: accepting a category later must never replay an earlier lead.
export function sendConfirmedLead(id: string) {
  const current = effectiveTracking();
  if (ready && !restarting && (current.analytics || current.advertising)) port?.postMessage({ type: 'lead', id, ...current });
}

export async function sendVercelEvent(name: string, properties: Record<string, string | number | boolean>) {
  if (document.documentElement.dataset.customEvents !== 'true' || !vercelStarted || !vercelAllowed()) return;
  try {
    const { track } = await import('@vercel/analytics');
    if (vercelAllowed()) track(name, properties);
  } catch { /* Measurement cannot break an inquiry. */ }
}

function refresh() {
  apply();
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.hidden = read() !== null;
  const ads = document.querySelector<HTMLInputElement>('#cookie-advertising');
  if (ads) {
    ads.disabled = gpc();
    if (ads.disabled) ads.checked = false;
  }
  const gpcNote = document.getElementById('cookie-gpc');
  if (gpcNote) gpcNote.hidden = !gpc();
  const safetyNote = document.getElementById('cookie-safety');
  if (safetyNote) safetyNote.hidden = !safetyBlocked();
}

export function initializeTracking() {
  if (initialized) return;
  initialized = true;
  const dialog = document.querySelector<HTMLDialogElement>('#cookie-dialog');
  const analytics = document.querySelector<HTMLInputElement>('#cookie-analytics');
  const advertising = document.querySelector<HTMLInputElement>('#cookie-advertising');
  const error = document.getElementById('cookie-error');
  if (!dialog || !analytics || !advertising || !error) return;
  let opener: HTMLElement | null = null;
  function open() {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const p = read();
    analytics!.checked = p?.analytics ?? false;
    advertising!.checked = (p?.advertising ?? false) && !gpc();
    error!.hidden = true;
    refresh();
    if (!dialog!.open) dialog!.showModal();
  }
  function save(analytics: boolean, advertising: boolean) {
    const wasBlocked = safetyBlocked();
    const savedAt = Date.now();
    const preference: TrackingPreferences = { version: TRACKING_VERSION, savedAt, expiresAt: savedAt + TRACKING_TTL_MS, analytics, advertising: advertising && !gpc() };
    try {
      storageFailed = false;
      localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(preference));
      // Verification must bypass the effective safety veto, not the schema or
      // persistence checks. Only a freshly verified choice may clear that veto.
      const persisted = readStored();
      if (!persisted || persisted.savedAt !== savedAt || persisted.analytics !== preference.analytics || persisted.advertising !== preference.advertising) throw new Error('Storage verification failed');
      if (wasBlocked) clearSafetyBlock();
      dialog!.close();
    } catch {
      // Do not grant a session-only permission when persistence cannot be verified.
      try { localStorage.removeItem(TRACKING_STORAGE_KEY); } catch { /* unavailable */ }
      blockAfterStorageFailure();
      open();
      error!.hidden = false;
    }
    refresh();
  }
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target) return;
    if (target.hasAttribute('data-cookie-settings')) open();
    if (target.hasAttribute('data-consent-accept')) save(true, true);
    if (target.hasAttribute('data-consent-reject')) save(false, false);
  });
  document.getElementById('cookie-save')?.addEventListener('click', () => save(analytics.checked, advertising.checked));
  document.getElementById('cookie-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  const banner = document.getElementById('cookie-banner');
  if (banner && 'ResizeObserver' in window) {
    new ResizeObserver(() => {
      if (!banner.hidden) document.documentElement.style.setProperty('--cookie-banner-space', `${banner.getBoundingClientRect().height + 32}px`);
    }).observe(banner);
  }
  window.addEventListener('storage', event => { if (event.key === TRACKING_STORAGE_KEY || event.key === null) refresh(); });
  window.addEventListener('focus', refresh);
  window.addEventListener('hashchange', refresh);
  // Install before any optional SDK. This site uses full-document navigation;
  // unexpected history changes must not expose a private URL to Vercel.
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History[typeof method]>) => { original(args[0], args[1], args[2]); refresh(); };
  }
  document.addEventListener('visibilitychange', refresh);
  // GPC has no standardized change event. Check on use, focus and a lightweight
  // poll; expiration also has its own timer. One subscription per document.
  window.setInterval(refresh, 1000);
  // Preserve a failed withdrawal on ordinary links, including opening a new tab,
  // even if cookies AND session storage are unavailable. Direct manual removal
  // of all browser state cannot be made durable by a static site.
  if (safetyBlocked()) markInternalLinks(true);
  refresh();
}
