# Optional measurement architecture

## Invariants

- No optional vendor script, beacon, preconnect or iframe before a valid choice.
- Necessary local storage `sapphire.tracking-preferences` is not marketing consent.
- Schema version **1**, lifetime **180 days** from `savedAt`, exact millisecond expiry. A version change, malformed data, future timestamp, extra fields, expired preference or failed read denies both categories. Save is read back before applying. No implicit session-only grant on storage failure.
- `analytics` authorizes Google Analytics and eligible Vercel measurement; `advertising` authorizes Meta Pixel. Neither authorizes email or SMS. GPC vetoes advertising, including a stored grant, and never grants analytics.
- Production requires all of: Astro production build, `VERCEL=1`, `VERCEL_ENV=production`, and runtime origin `https://www.sapphireblue.studio`. No wildcard hosts, public preview override or test opt-in in shipped code.
- Banner does not take keyboard focus. Native modal settings have labelled independent checkboxes, Escape/Close, keyboard focus containment and return. Footer settings remain available on content routes and 404. No JavaScript means no optional measurement.

## Containing automatic data collection

`src/pages/measurement.astro` is an inert noindex document. Only the manager creates a hidden `sandbox="allow-scripts"` iframe with `referrerpolicy="no-referrer"`. **No `allow-same-origin`**: providers cannot read the parent URL, referrer, fields, DOM, cookies or local storage. Direct visits do not initialize providers. A source/origin-checked handshake transfers a private MessagePort; only allowlisted page paths, independent booleans and random submission IDs cross it. No names, emails, phones, messages, query strings, fragments or user-defined properties.

`public/measurement-frame.js` is a classic script (not an opaque-origin ES module). It initializes each authorized category once per document:

- Google `G-L07HB79EBQ`: gtag loaded only with analytics permission; no parent forms or links to auto-capture. Explicit sanitized `page_location`, empty `page_referrer`, generic title, disabled signals/ad personalization, automatic initial pageview disabled. `client_storage: none`, denied vendor storage and a fresh nonpersistent client ID deliberately avoid persistent Google cookies; analytics will not have normal cross-page session attribution. Explicit `page_view` and `generate_lead` only. CSP restricts collection destinations. No advanced consent-mode pings before site permission: gtag itself is absent.
- Meta `1053877131029984`: the previous `fbevents.js` SDK and noscript pixel are removed. JS uses the browser Pixel GET transport `/tr/` with an explicit, allowlisted document location, empty referrer, optional random event ID and no credentials. **No Meta automatic event detection, advanced matching, fbp/fbc, browser SDK or Conversion API**. Only `PageView` and confirmed `Lead`. This intentionally limits attribution and must be reviewed by the operator before publication. Mocked tests verify outgoing requests, not Meta acceptance, deduplication in its account, billing or attribution accuracy. No real conversion was sent during this project.

Google/Meta route context is `/`, `/privacy`, `/sms-terms` or the constant `/404`; unknown paths never become telemetry. The iframe URL is fixed, without user parameters. Responses or error messages from the contact endpoint never cross the port.

## Vercel

The installed `@vercel/analytics` and `@vercel/speed-insights` packages are dynamically imported and injected only with analytics permission. No unconditional Astro components remain. Web Analytics `disableAutoTrack: true` plus one explicit pageview avoids duplicate views. Before-send middleware checks current permission again and rewrites URLs/routes to the fixed allowlist; denial returns null. Custom events additionally require `PUBLIC_ENABLE_CUSTOM_EVENTS=true` and a supported Vercel plan; the example stays false.

Before-send does not expose all automatic fields (notably referrer). Therefore neither Vercel SDK is loaded when the initial location has a query, unknown path, unapproved fragment, or an unsafe/noncanonical referrer. This **suppresses measurement**, not user content or inquiries. A later unsafe history/hash change restarts the document; the next document suppresses Vercel. Safe page fragments are limited to existing section IDs. HTTP referrers for the document are suppressed by a referrer meta policy. Hosting access/security logs are distinct from optional analytics and cannot be controlled by this browser manager.

## Withdrawal, expiration and races

Preferences are read again for every conversion/custom event, when dynamic imports resolve, on storage/focus/visibility/hash/history changes, and by a single 1-second GPC monitor. Expiry has a bounded timer. Only additions enable a category without restarting; existing categories do not reinitialize or repeat pageviews. Any effective withdrawal removes the frame/port synchronously and reloads because Vercel has no supported complete teardown. Remaining authorized categories may record the new document's pageview, not a replayed lead. Previously transmitted requests cannot be recalled.

If writing a withdrawal fails while a prior SDK was loaded, a nonpersonal `sapphire-tracking-off=1` query marker keeps the replacement document fail-closed even if the browser still exposes an old grant. This document remains off; remove the marker only after storage works and choices can be saved. No claim is made that third-party cookies can be deleted. Withdrawal does not automatically erase vendor records.

Only the confirmed CORS HTTP-success + trimmed text `ok` path calls `recordConfirmedLead(uuid)`. A consumed-ID set prevents duplicate calls, even when no category is allowed. No conversion buffering or retrospective replay. A provider not ready at confirmation may lose a measurement; delivery of an inquiry never depends on measurement success. There is no claim of cross-retry Apps Script idempotency.

## Verification without external effects

`tests/fixtures.ts` aborts nonlocal browser requests by default, before navigation. Canonical-origin tests mirror a **local** static build and fulfill Google/Meta/Vercel scripts/endpoints with deterministic substitutes; Apps Script and its redirect host are blocked unless explicitly mocked. No test sends real contacts, subscriptions, SMS or conversions. Service workers are disabled. Tests inspect script initialization, sandbox boundaries, request URLs, bodies and headers—not just UI callbacks.

Production-shaped test HTML is compiled with Vercel build flags and custom events enabled in the local web server only; runtime origin checks still deny localhost. Preview/development policy is tested with disabled build flags, plus actual separate build inspections during integration. This is not a deployment or proof of provider-side account configuration. Changes to SDK versions, CSP, transports or account automatic-event settings require renewed review.

See `docs/contact-permissions.md` for the separate, currently disabled commercial-channel gates. Legal review should assess US SMS sender rules, email identification/postal address/unsubscribe requirements, applicable Dominican/US privacy duties, international access and retention obligations; this code makes no universal compliance claim.
