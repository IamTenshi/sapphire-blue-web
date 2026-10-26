# Business identity, privacy and marketing launch gates

Content/data implementation dated **2026-10-25**. This is an operational handoff, not a legal opinion or a claim of universal compliance.

## Ownership and integration

This change owns only:

- `src/data/business.ts`
- `src/data/seo.ts`
- `src/layouts/LegalLayout.astro`
- `src/pages/privacy.astro`
- `src/pages/sms-terms.astro`
- `docs/business-privacy.md`

The consent-manager and form owners must integrate their changes before deployment. **Do not deploy this content-only branch in isolation:** at base `24bba3d`, `BaseLayout.astro` loads Google Analytics and Meta Pixel without consent (including a Meta noscript request), and loads Vercel measurement independently of the new preferences. Those files are deliberately not modified here. The public notice describes the coordinated release, not a claim that the base layout has already been fixed.

The shared Footer is imported by `LegalLayout.astro`; its owner must provide root-relative home-section links, `/privacy`, `/sms-terms`, and an accessible **Privacy settings** control on both legal routes. The legal layout has its own root-relative navigation, one `h1`, and `main#top[tabindex="-1"]`. The SEO route list adds both real legal pages, and `siteIdentity.email` reads `business.email`.

**Canonical URL integration follow-up:** the inherited `BaseLayout` emits Astro's generated `/privacy/` and `/sms-terms/` canonical URLs, while the agreed `indexablePaths` entries and resulting sitemap use `/privacy` and `/sms-terms`. Keep the route contract and have the layout owner align the canonical URL policy during integration (for example, normalize the canonical pathname to no trailing slash except `/`). This branch does not modify the shared layout or hosting redirects.

## Central facts and fixed contracts

`src/data/business.ts` is the shared source for:

- Brand: **Sapphire Blue**.
- Operator: **Asor Jehovalina Garcia Diaz**, **an independent professional based in the Dominican Republic**. No company incorporation, US establishment or certification is asserted.
- Contact and manual rights requests: **hello@sapphireblue.studio**, addressed to Asor.
- Initial audience: adult business/professional users, initially in the US. A service area is not a postal address or an operator establishment.
- Two authorized people with access on the operator's side, located in the Dominican Republic and the US. This does not mean providers have no access.
- Provider descriptions, intended retention targets, and planned email/SMS purposes.

Exports consumed by the form owner remain:

```ts
export const business = {
  brand: 'Sapphire Blue',
  operator: 'Asor Jehovalina Garcia Diaz',
  operatorDescription: 'an independent professional based in the Dominican Republic',
  email: 'hello@sapphireblue.studio',
  // Other centrally maintained facts.
};
export const noticeVersions = {
  privacy: '2026-10-25',
  email: 'email-2026-10-25',
  sms: 'sms-2026-10-25',
};
export const marketingAvailability: { email: boolean; sms: boolean } = {
  email: false,
  sms: false,
};
```

**Both availability flags must stay false.** Environment variables, installed SDKs, a working inquiry form, notice version labels, checked browser controls or an API key cannot establish verified marketing permission. A human must review the launch gates and update the notice and program terms before enabling a channel.

## What is active, optional or only planned

| Service | Status / evidence boundary |
| --- | --- |
| Google Apps Script → Sheets + MailApp | Existing contact POST integration. The processing description is supplied by the business/contract context. This task does not inspect the deployed script, spreadsheet, recipient mailbox or Google admin settings. Do not infer retention, access controls or guarantees from the front-end POST. |
| Vercel hosting | Active hosting; technical requests are necessary to deliver the website. This is separate from optional Vercel analytics/performance SDKs. Logs, account settings and provider retention have not been directly verified. |
| Google Analytics `G-L07HB79EBQ` | Optional analytics only in the coordinated consent-manager release. |
| Vercel Web Analytics + Speed Insights | SDKs are installed; optional analytics only in the coordinated release. No cookies, anonymization, region, plan entitlement or certification claim is made here. |
| Meta Pixel `1053877131029984` | Optional advertising only in the coordinated release; a detected GPC signal opposes advertising, not analytics. |
| Brevo email | Planned newsletters and commercial messages approximately every two weeks. **Disabled.** No Brevo integration or verified consent register exists in the current code. Selling email-marketing services does not activate Sapphire Blue's own newsletter. |
| Brevo automated SMS | Planned, optional, independently chosen marketing texts from Sapphire Blue; variable frequency and possible carrier charges. **Disabled.** No operational sender/number, STOP or HELP workflow is established for this site. |

The provider descriptions are a notice, not evidence that account-level contracts, a data-processing agreement, transfer mechanism, certifications, security controls or the provider's processing countries have been verified. No such guarantees are added.

## Tracking release contract

The coordinator owns the implementation and integration tests for these statements in the public notice:

- Optional Google, Vercel and Meta scripts/requests must be blocked before the appropriate choice; analytics and advertising are separate choices.
- Preference storage: `localStorage['sapphire.tracking-preferences']`, schema version **1**, valid for **180 days**. No valid choice means no optional tools until permission. Clearing storage removes the saved preference.
- No optional measurement with JavaScript off, in development or on previews. Remove the unconditional Meta noscript pixel.
- GPC blocks/objects to **advertising**; it must not be represented as an automatic analytics rejection. Users can independently reject analytics.
- The footer's **Privacy settings** control must work on the homepage and legal pages and allow withdrawal/change. Withdrawal stops future optional collection; it cannot recall past provider disclosures.
- No form/contact data or sensitive URL values should become event properties, page URLs, referrers or titles sent to optional tools. Unknown or unsafe paths must not be exposed to measurement. Suppression is preferable to leaking data; the notice explicitly does not promise to count every visit.
- Browser preference storage is not a server-side, verifiable email/SMS permission register. Marketing enrollment must not be inferred from a tracking preference.

Any change to this contract must be reconciled with the public notice before deployment. The data export `trackingPreferences` records the agreed constants; it does not itself implement the consent manager.

## Intended retention, not an automated deletion promise

The shared data and privacy page state these targets:

| Record | Intended retention |
| --- | --- |
| Prospects | Six months after the last interaction. |
| Clients | One year after the relationship ends, except relevant fiscal/accounting records. |
| Fiscal/accounting | At least ten years, subject to applicable obligations. Confirm the applicable records and period with the responsible business/accounting/legal adviser; no statute-specific legal basis is invented. |
| Minimal permission / opt-out records | Separate from marketing contact lists; as long as needed to document permission and honor opt-outs. A fixed duration has not been finalized. |

There is no implemented deletion scheduler or verifiable marketing-permission register. Provider copies, mailboxes, spreadsheet copies, backups and record-preservation requirements need their own review. The notice does not promise automatic deletion, immediate provider-wide erasure or a fixed retention period for every provider.

Suggested manual implementation work, **not claimed as completed**: identify record owners and locations, timestamp the last interaction/end of relationship, review records against the targets, distinguish tax/accounting exceptions, carry out and record appropriate deletions, and keep suppression evidence separate and minimal. Do not delete opt-out evidence in a way that silently reactivates a contact.

## Manual privacy requests

Asor handles requests via `hello@sapphireblue.studio`. The public wording allows reasonable verification and describes rights conditionally on applicable rules, without inventing a universal legal basis, response SLA or automated request system. Applicable response obligations still require review and handling.

Before operational sign-off, confirm a manual process for finding records across Sheets, email and provider accounts, verifying requests proportionately, assessing exceptions, responding and recording the outcome. Do not request sensitive identity documents through the ordinary inquiry form. None of these administrative controls has been independently inspected by this change.

## External blockers and launch checks

### Missing business mailing address

**A real, appropriate postal/mailing address has not been provided. This is an external blocker for commercial email launch and any other notice, registration or messaging requirement that needs an address.** Do not publish a placeholder, infer a US address from the target audience, or reuse postal code `30078`. The public pages intentionally contain no invented street address or postal code. Obtain and verify the actual address and assess whether it must be disclosed in the privacy notice or other business notices before publication/launch.

### Before either marketing channel can be enabled

- [ ] Human verification of actual business/contact details, required mailing address and applicable jurisdiction-specific requirements.
- [ ] Brevo account, contracts, applicable transfer arrangements, processing locations and administrative settings reviewed; no assurance is inferred from vendor branding.
- [ ] Working, verifiable, channel-specific permission records (who, channel, wording/version, when/how, source and subsequent withdrawal), with reasonable data minimization and access controls. The exact schema/implementation still needs a separate design and verification; this change does not implement one.
- [ ] Independent optional choices; no preselection, bundling with an inquiry, cross-enrollment between email/SMS, or purchase/quote condition.
- [ ] A tested withdrawal/suppression process and an identified operator responsible for requests and retention.
- [ ] Human review of the public notices against the actual program; update versions and wording before launch. Notice labels alone are not evidence of permission.

### Additional email gates

- [ ] Sender/domain configuration, sender identity, mailing-address inclusion and a functioning unsubscribe mechanism verified for the actual email program.
- [ ] Approximately fortnightly newsletters/commercial email matches the wording presented at opt-in. No newsletter audience is inferred from existing inquiry contacts.

### Additional SMS gates

- [ ] Operational sender/number, sender identity and any required registrations/approvals verified for the intended destinations and audience.
- [ ] Automated Sapphire Blue promotional texts via Brevo match the independently selected SMS wording, variable-frequency statement and carrier-charge disclosure.
- [ ] Tested STOP withdrawal and HELP workflow, with actual contact/help details and suppression handling. STOP is an intended future mechanism, **not operational support advertised today**.
- [ ] Revise `/sms-terms` from a planned-program description to accurate active-program terms. No active enrollment until this review is complete.

### Coordinated website release checks

- [ ] Merge the consent-manager and form changes; verify the public notice's behavior, including no optional noscript requests, no preview/dev measurement and safe handling of unknown URLs.
- [ ] Verify both Footer legal links and Privacy settings on `/`, `/privacy` and `/sms-terms`.
- [ ] Verify form wording links to the notice and never treats a business inquiry, phone entry or tracking choice as a marketing opt-in; both availability flags remain false.
- [ ] Check production-like markup, keyboard access, mobile layout, canonical URLs and sitemap entries for both legal pages. No home-only organization/service graph should be copied to the legal routes.
- [ ] Align inherited trailing-slash canonical URLs with the slashless legal entries in `indexablePaths`/the sitemap and the actual hosting URL policy.
- [ ] Review the missing-address question, actual provider arrangements and applicable rules with the responsible human before publication. These pages are not a compliance certification.

## Validation commands

Use dependencies installed in this worktree, without changing the main worktree:

```sh
pnpm install --frozen-lockfile --offline
pnpm check
pnpm build
```

The first command uses the existing package store without downloading or changing the lockfile. Build/check success alone does not establish that provider administration, consent capture, retention, rights handling or marketing launch gates work. The coordinator must run the integrated consent/form/browser checks after merging the independently owned changes.

### Results in this worktree

- Offline dependency installation succeeded; the lockfile was unchanged and the main worktree's dependency tree was not used or modified.
- `pnpm check`: **0 errors, 0 warnings, 0 hints** (36 files).
- `pnpm build`: succeeded; both new legal pages and their sitemap entries are generated.
- Existing `tests/ai-seo.spec.ts` and `tests/sharing.spec.ts`: **15 passed**, with the command below. No test sources were modified.
- Additional one-off local Playwright checks: **12 passed combinations** (two legal pages × 320/390/1440px × JavaScript on/off). Checks covered HTTP success, a single `h1`, focusable `main#top`, skip-link keyboard focus, current-page legal navigation, email links, imported Footer, indexable metadata and no horizontal overflow. Static checks covered the fixed business/notice/availability/storage contracts, legal sitemap entries, no invented postal code and no home-only JSON-LD graph. Canonical URLs were checked after removing the inherited trailing slash; the policy mismatch above is still an integration follow-up.
- All external requests were aborted in the additional browser checks; no contact form was submitted and no Google, Meta or Brevo administrative action was performed. These checks intentionally do **not** certify the still-pending consent-manager or Footer integration.

The initial browser launch failed because `libnspr4.so` was not on the loader path. Reusing libraries already present in the approved temporary directory fixed the local runtime without installing system packages or changing another worktree:

```sh
TMPDIR=/tmp/opencode LD_LIBRARY_PATH=/tmp/opencode/chromium-libs/usr/lib/x86_64-linux-gnu PLAYWRIGHT_PORT=4378 pnpm exec playwright test tests/ai-seo.spec.ts tests/sharing.spec.ts
```
