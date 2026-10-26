import { noticeVersions } from './business';

export interface MarketingAvailability {
  readonly email: boolean;
  readonly sms: boolean;
}

// This is a code-level release gate, not an environment/configuration toggle.
// The existing inquiry endpoint has no verified consent persistence contract.
// Replace each false only alongside its verified delivery implementation; see
// docs/contact-permissions.md. Changing business availability alone cannot opt in.
const verifiedConsentDelivery: MarketingAvailability = { email: false, sms: false };

export function contactPermissionAvailability(configured: MarketingAvailability): MarketingAvailability {
  return {
    email: configured.email && verifiedConsentDelivery.email,
    sms: configured.sms && verifiedConsentDelivery.sms,
  };
}

export interface ContactPermissionInput {
  readonly email_marketing: boolean;
  readonly sms_marketing: boolean;
  readonly email: string;
  readonly phone: string;
}

// A local preparation snapshot, NOT a saved consent record or a subscription.
export interface PreparedContactPermissions {
  readonly source: 'website_contact_form';
  readonly privacyNoticeVersion: string;
  readonly email: {
    readonly selected: boolean;
    readonly address: string;
    readonly noticeVersion: string;
  };
  readonly sms: {
    readonly selected: boolean;
    readonly phone: string | null;
    readonly noticeVersion: string;
    readonly provider: 'Brevo';
  };
}

export type ContactPermissionResult =
  | { readonly ok: true; readonly permissions: PreparedContactPermissions }
  | {
    readonly ok: false;
    readonly field: 'email_marketing' | 'sms_marketing' | 'phone';
    readonly error: string;
  };

// Require an explicit international prefix and 8–15 digits, with a nonzero
// country-code start. No guessing country codes or accepting local numbers.
const internationalSmsNumber = /^\+[1-9]\d{7,14}$/;

// Pure and injectable: future channel validation can be tested without enabling
// either live channel. Callers must not infer persistence from an ok result.
export function prepareContactPermissions(
  input: ContactPermissionInput,
  availability: MarketingAvailability,
): ContactPermissionResult {
  if (input.email_marketing && !availability.email) {
    return {
      ok: false,
      field: 'email_marketing',
      error: 'Email marketing is unavailable. No email subscription was created. Clear the email marketing selection or reload the page to send only your inquiry.',
    };
  }
  if (input.sms_marketing && !availability.sms) {
    return {
      ok: false,
      field: 'sms_marketing',
      error: 'SMS marketing is unavailable. No SMS subscription was created. Clear the SMS marketing selection or reload the page to send only your inquiry.',
    };
  }
  const phone = input.phone.trim();
  if (input.sms_marketing && !internationalSmsNumber.test(phone)) {
    return {
      ok: false,
      field: 'phone',
      error: 'For SMS marketing, enter an international phone number beginning with + and containing 8–15 digits, for example +14155552671.',
    };
  }
  return {
    ok: true,
    permissions: {
      source: 'website_contact_form',
      privacyNoticeVersion: noticeVersions.privacy,
      email: {
        selected: input.email_marketing,
        address: input.email.trim(),
        noticeVersion: noticeVersions.email,
      },
      sms: {
        selected: input.sms_marketing,
        phone: input.sms_marketing ? phone : null,
        noticeVersion: noticeVersions.sms,
        provider: 'Brevo',
      },
    },
  };
}
