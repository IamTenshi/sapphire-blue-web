# Consent-gated official measurement SDKs

## Current architecture — 26 October 2026

The isolated iframe and manually constructed Meta requests have been removed.
The official Google tag (`G-L07HB79EBQ`) and Meta browser SDK
(`1053877131029984`) execute in the main document only after the corresponding
permission, in the canonical Vercel production deployment. Development, previews,
JavaScript-disabled pages and missing/invalid preferences never load them.

Preferences are now **version 2**, valid for **180 days**. Version 1 authorized a
different, isolated architecture and is rejected; visitors must make a new choice.
Analytics and advertising remain independent. GPC vetoes advertising, never grants
analytics, and does not enroll anyone in email or SMS. Persistence is verified
before permission becomes effective. The existing denial-only safeguards cover
failed withdrawals across ordinary site navigation.

## Measurement and attribution after permission

- **Google:** basic consent mode. There is no Google SDK or denied-consent ping
  before analytics permission. After the choice, defaults and the consent update
  are queued before configuration and SDK loading. `analytics_storage` is granted; Google
  ad storage, ad user data and ad personalization remain denied. Signals and ad
  personalization are disabled. No fresh `client_id` is forced and no
  `client_storage: none` override is used: Google can maintain its ordinary
  first-party browser/session identifiers. An explicit `page_view` is queued once
  per document with automatic initial pageview disabled.
- **Meta:** the official `fbevents.js` bootstrap, `init` and `PageView` run after
  advertising permission only. `autoConfig` is disabled before initialization.
  No advanced-matching fields or contact data are passed to `init` or `Lead`.
  Ordinary SDK cookies/click identifiers may now participate in attribution.
  There is still no Conversion API or noscript fallback.
- **Attribution context:** recognized page paths and an allowlist of campaign/click
  parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, `utm_term`,
  `utm_content`, `gclid`, `gbraid`, `wbraid`, `fbclid`) may be measured. Values have
  bounded lengths and restricted characters. Unexpected queries, private paths,
  fragments or referrers suppress SDK initialization rather than relying on event
  overrides: SDKs can read the actual document. Campaign values must never contain
  personal information. Standard identifiers do not guarantee perfect attribution.

**The SDKs are no longer isolated from the DOM, form or browser storage.** Tests
cannot certify arbitrary vendor code or remote account configuration. Before
publication, review/disable Google enhanced measurement of forms, user-provided
data collection, unwanted automatic events, Meta automatic events/advanced
matching, account advertising links and other unapproved collection. Provider
configuration is not silently changed by this repository. Re-review the public
notice if enabling additional features. No claim of anonymity is made.

## Confirmed conversions, withdrawal and failures

The existing inquiry POST and HTTP-success + text `ok` contract are unchanged.
At confirmation, `Lead` requires current advertising permission and
`generate_lead` current analytics permission. Consumed submission IDs prevent
duplicate calls, including when no permission exists. There is no lead buffering
or replay after a later grant or SDK load. A blocked/slow SDK can lose a conversion;
measurement failures never change inquiry success. Google and Meta failures are
handled independently.

Withdrawal, expiration and changes from another tab are rechecked on events,
navigation, focus and a lightweight GPC poll. A loaded SDK triggers a full-page
restart after Google measurement is disabled and Meta consent is revoked. The new
document rechecks permission before loading anything. Unsaved form input can be
lost on restart. Earlier requests cannot be recalled. Provider cookies/records are
not automatically erased by withdrawal; browser/provider controls remain separate.

## Vercel

Vercel Analytics and Speed Insights retain their stricter existing safe-context
gate, including suppression on campaign queries or unsafe referrers. Both require
analytics permission, recheck it before sending, and sanitize URLs. Custom events
also require `PUBLIC_ENABLE_CUSTOM_EVENTS=true` and a supported plan; the example
remains false. Hosting/security logs are separate from optional analytics.

## Verification and external activation gates

Browser fixtures block external traffic and replace SDKs/endpoints with controlled
substitutes. Tests exercise loading, initialization options, independent choices,
attribution parameters, withdrawal, version migration, conversion gating and
failures. They do **not** prove vendor ingestion, real cookies, session attribution,
matching quality, campaign optimization or remote account settings. No real
contacts, subscriptions, SMS or conversions are needed for these tests.

Owner-controlled verification in Google and Meta is required before relying on the
statistics. Further live testing requires authorization and must avoid synthetic
production conversions. Sheets/Brevo permission persistence and channel launch
gates remain separate, unchanged work; see `contact-permissions.md`.
