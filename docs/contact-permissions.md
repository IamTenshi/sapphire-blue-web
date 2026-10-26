# Contact inquiries and optional marketing permissions

## Current release: inquiries only

Email marketing and SMS marketing are separate optional checkboxes, unchecked and disabled. `marketingAvailability.email` and `.sms` in `src/data/business.ts` are independently configured and currently false. The form explains why neither channel is available: consent persistence and the associated unsubscribe/sending operations have **not been verified**. This is not a claim that a subscription service is already working.

`contactPermissionAvailability()` also applies an explicit code-level delivery gate in `src/data/contact-permissions.ts`. Both channel implementations are unverified. Changing the business flags or environment variables alone cannot activate permissions; there are no environment enable switches. Do not replace the gate with a blanket true flag. A future change must implement and verify each channel's actual mapping and operational requirements first.

An inquiry never requires marketing consent, optional cookies, or a phone number. A local-format phone remains acceptable when SMS is unselected. Permission to answer the inquiry is not newsletter/SMS permission. Selecting the **Email marketing** service need asks about that business service; it does not opt the visitor into our own newsletter. Brevo is the planned SMS delivery provider, not a checkbox asking visitors to “accept Brevo.” The SMS permission does not authorize calls or WhatsApp.

The public notice links are `/privacy` and `/sms-terms`. The optional email copy covers a newsletter every two weeks and commercial offers. SMS copy describes automated marketing via Brevo, optional consent not conditioned on purchase, variable frequency, possible message/data charges, STOP and HELP. Notice versions come from `noticeVersions` in the shared business module.

## The live delivery contract is unchanged

`src/scripts/site.ts` sends only these keys, in this order, using `URLSearchParams`:

```text
name, business, email, phone, message, needs
```

The existing Apps Script URL, POST method, CORS mode, followed redirect, omitted credentials and exact trimmed `ok` success response remain unchanged. No custom headers, consent fields, request ID, timestamp, notice versions or tracking consent are added to the POST. No Apps Script or backend contract changes are included here.

`prepareContactPermissions(input, availability)` returns a typed, local-only snapshot, not a saved permission or subscription. It records independent selections, the email address, an SMS phone only when selected, the source, provider and notice versions. Its availability argument is injectable so future enabled-channel validation can be tested without enabling the live UI. In production it receives the gated business availability.

The handler reads checkbox `.checked` properties even when disabled. Stale or tampered unavailable selections block the entire attempt with a visible error; they are not silently discarded. Visitors must deliberately clear the selection or reload before sending only the inquiry. The handler explicitly calls `form.checkValidity()` to guard synthetic submits. Selected SMS in enabled test fixtures requires `+` followed by 8–15 digits, starting with a nonzero country code; local numbers, guessed prefixes and extensions are rejected. Unselected SMS imposes no new phone validation.

The exact inquiry payload and the permission snapshot are captured before disabling form controls in flight. The controls' prior disabled states are restored after success/failure, so unavailable permissions stay unavailable. Success confirms **only the inquiry**, explicitly not an email or SMS subscription. It does not establish consent persistence.

Each valid network attempt creates one `crypto.randomUUID()` ID in memory, not in the payload or storage. The handler calls `recordConfirmedLead(id)` once, only after the successful HTTP response and exact `ok` confirmation. The coordinator-owned tracking module checks cookie categories at confirmation time, suppresses duplicate IDs and does not queue/replay denied events. Permission selections, contact details, messages and notice versions are not passed to measurement hooks.

## Future additive mapping — proposal only, NOT sent today

The following names are a proposed explicit mapping for a reviewed future backend contract; they are **not** appended by the current code and are **not** evidence of supported persistence:

| Proposed field | Local source | Required meaning |
| --- | --- | --- |
| `consent_submission_id` | Attempt UUID | Correlate saved inquiry/permission records; enforce idempotency server-side. |
| `email_marketing` | `permissions.email.selected` | Explicit independent boolean, never inferred from an inquiry or service need. |
| `sms_marketing` | `permissions.sms.selected` | Explicit independent boolean, never inferred from providing a phone. |
| `consent_email` | `permissions.email.address` | Address associated with the email selection. |
| `consent_sms_phone` | `permissions.sms.phone` | Validated international number, only for a selected SMS permission. |
| `consent_source` | `permissions.source` | `website_contact_form`. |
| `privacy_notice_version` | `permissions.privacyNoticeVersion` | Privacy notice shown; this is not a mandatory privacy-acceptance permission. |
| `email_notice_version` | `permissions.email.noticeVersion` | Exact email permission wording/version shown. |
| `sms_notice_version` | `permissions.sms.noticeVersion` | Exact SMS permission wording/version shown. |
| `consent_prepared_at` | Future client snapshot time | Informational client UTC time, not authoritative proof of receipt. |

The receiver must validate independently and persist a trusted server timestamp, action/withdrawal history and channel-specific outcome with the actual wording/version. Keep unchecked/not-requested distinct from affirmative consent; an unchecked inquiry is not a request to unsubscribe an existing subscriber. Consent records must not be inferred from logs, receipt emails, an accepted extra request field, a browser snapshot or a generic inquiry `ok` response.

### Per-channel release gate

Before changing **either** channel's code-level delivery gate and its corresponding business flag:

1. Agree and implement the additive mapping with the receiver owner, including schema, server validation, idempotency and distinct channel-specific persisted outcomes. Preserve the existing inquiry path. This work does not change Apps Script.
2. Submit controlled non-production test records for every independent selection combination and inspect the **actual durable records** after reload/retrieval. Verify address/phone, boolean intent, source, server time, submission ID and the exact notice versions/wording. Receiving extra fields is not proof of saving them. Verify no permission is recorded as affirmative for unchecked boxes.
3. Verify failures and partial successes. Never claim a subscription from the inquiry's generic `ok`; require a separately verifiable channel confirmation and honest per-channel UI outcomes. Keep the inquiry usable without marketing even if subscription operations fail.
4. For email, verify the sender identity, valid postal address configured in Brevo and included in commercial emails, subscription handling, applicable confirmation flow, working unsubscribe and suppression, plus the promised every-two-weeks newsletter/commercial scope.
5. For SMS, verify Brevo account/channel and US sender registration/approval for the intended route, permitted recipients/countries, automated marketing scope, identification, STOP/HELP handling, delivery and opt-out suppression, frequency/rate notices, and privacy/SMS terms. Obtain any required business/operator information; do not fabricate an address. Verify that email and SMS withdrawal remain independent.
6. Review access controls, retention/deletion, provider arrangements and operational ownership. Obtain legal/compliance approval for the actual audience and destination markets. Update copy/versions if the purposes or wording change.
7. Implement the reviewed mapping and channel-specific confirmation in code, extend tests with persisted-record evidence and error cases, and remove the inquiry-only subscription disclaimer **only** where a real confirmed subscription is reported. Activate email and SMS independently; never a single switch for both.

## Test safety and integration

`tests/form-privacy.spec.ts` intercepts all nonlocal browser requests before navigation and only mocks Apps Script responses. It must not send real contacts, Brevo messages, analytics or conversions. Pure enabled-availability fixtures do not change live flags. The suite covers default disabled choices, exact payloads, optional/local phone inquiries, tampering, synthetic validation bypasses, in-flight controls, inquiry-only success, footer links and pure SMS/independence validation.

The shared business module, legal routes and the `recordConfirmedLead(submissionId: string): void` tracking API are provided by the other workstreams. Integrate those before the full build and browser test run. Footer anchors remain `#section` on the homepage and `/#section` on other routes. The footer's `data-cookie-settings` button is handled by the coordinator's global cookie controller; without JavaScript the button is hidden and the fallback explains that optional tracking stays off.
