// Changes to the meaning of a preference require a new version (and a new choice).
export const TRACKING_VERSION = 1;
export const TRACKING_TTL_MS = 180 * 24 * 60 * 60 * 1000;
export const TRACKING_STORAGE_KEY = 'sapphire.tracking-preferences';
export const TRACKING_ORIGIN = 'https://www.sapphireblue.studio';

export interface TrackingPreferences {
  version: typeof TRACKING_VERSION;
  savedAt: number;
  expiresAt: number;
  analytics: boolean;
  advertising: boolean;
}

export function parsePreferences(raw: string | null, now = Date.now()): TrackingPreferences | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const p = value as Record<string, unknown>;
    if (Object.keys(p).sort().join(',') !== 'advertising,analytics,expiresAt,savedAt,version'
      || p.version !== TRACKING_VERSION || typeof p.analytics !== 'boolean' || typeof p.advertising !== 'boolean'
      || typeof p.savedAt !== 'number' || !Number.isSafeInteger(p.savedAt) || p.savedAt < 0 || p.savedAt > now
      || typeof p.expiresAt !== 'number' || !Number.isSafeInteger(p.expiresAt)
      || p.expiresAt <= now || p.expiresAt <= p.savedAt || p.expiresAt - p.savedAt !== TRACKING_TTL_MS) return null;
    return p as unknown as TrackingPreferences;
  } catch {
    return null;
  }
}

// Never use arbitrary paths, parameters, fragments, referrers or form values in telemetry.
export function measurementPath(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/';
  return ['/', '/privacy', '/sms-terms'].includes(path) ? path : '/404';
}

export function safeMeasurementUrl(input: string): string {
  try {
    return TRACKING_ORIGIN + measurementPath(new URL(input, TRACKING_ORIGIN).pathname);
  } catch {
    return TRACKING_ORIGIN + '/404';
  }
}

// Vercel's middleware exposes URL, but not every automatically collected field
// (notably referrer). Do not load its SDKs at all on untrusted URL contexts.
export function safeVercelContext(current: string, referrer: string): boolean {
  const safe = (input: string, allowHash: boolean) => {
    try {
      const url = new URL(input);
      return url.origin === TRACKING_ORIGIN && !url.username && !url.password && !url.search
        && measurementPath(url.pathname) !== '/404'
        && (!url.hash || (allowHash && /^#(?:top|services|websites|plans|faq|contact|build|addons)$/.test(url.hash)));
    } catch { return false; }
  };
  return safe(current, true) && (!referrer || safe(referrer, false));
}
