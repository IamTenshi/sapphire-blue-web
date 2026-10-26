import { TRACKING_STORAGE_KEY, TRACKING_TTL_MS, TRACKING_VERSION } from './tracking';

// Human-confirmed business facts. Do not infer identity or contact details from
// deployment configuration, provider accounts, or the site's service area.
export const business = {
  brand: 'Sapphire Blue',
  operator: 'Asor Jehovalina Garcia Diaz',
  operatorDescription: 'an independent professional based in the Dominican Republic',
  email: 'hello@sapphireblue.studio',
  initialAudience: 'business and professional users, initially in the United States',
  authorizedAccess: {
    people: 2,
    countries: ['Dominican Republic', 'United States'],
  },
} as const;

export const noticeVersions = {
  privacy: '2026-10-26',
  email: 'email-2026-10-25',
  sms: 'sms-2026-10-25',
} as const;

// A build flag or an available API key is NOT permission to launch marketing.
// Keep both false until human verification, working consent records, provider
// setup, and the channel-specific launch checks in docs/business-privacy.md.
export const marketingAvailability: { email: boolean; sms: boolean } = {
  email: false,
  sms: false,
};

// Browser tracking preferences are not a verifiable marketing-consent register.
export const trackingPreferences = {
  key: TRACKING_STORAGE_KEY,
  version: TRACKING_VERSION,
  ttlDays: TRACKING_TTL_MS / (24 * 60 * 60 * 1000),
} as const;

export const providers = {
  contact: {
    name: 'Google Apps Script, Google Sheets and email (MailApp)',
    status: 'Active — inquiry handling',
    purpose: 'Receive contact requests, store inquiry details in a spreadsheet and send an email notification.',
    information: 'The contact and business information you submit with your request.',
  },
  hosting: {
    name: 'Vercel hosting',
    status: 'Active — website delivery',
    purpose: 'Host and deliver this website.',
    information: 'Technical request information, which may include an IP address, requested URL and browser information.',
  },
  googleMeasurement: {
    name: 'Google Analytics',
    status: 'Optional — analytics preference',
    purpose: 'Understand website usage and selected interactions when analytics is allowed.',
    information: 'Page and interaction information, approved campaign parameters, browser identifiers and cookies, and technical information.',
  },
  vercelMeasurement: {
    name: 'Vercel Web Analytics and Speed Insights',
    status: 'Optional — analytics preference',
    purpose: 'Measure website usage and page performance when analytics is allowed.',
    information: 'Page, device, browser and performance information.',
  },
  advertising: {
    name: 'Meta Pixel',
    status: 'Optional — advertising preference',
    purpose: 'Measure advertising-related visits and selected interactions when advertising is allowed.',
    information: 'Page and interaction information, approved campaign and click identifiers, browser identifiers and cookies, and technical information.',
  },
  marketing: {
    name: 'Brevo',
    status: 'Planned only — email and SMS disabled',
    purpose: 'Deliver separately requested marketing email and automated promotional SMS if those programs are launched.',
    information: 'The relevant email address or phone number and subscription preferences, only if the program is launched.',
  },
} as const;

// Intended retention targets, not a deployed deletion schedule. Provider copies
// and applicable record-preservation obligations require separate review.
export const retentionPolicy = {
  prospects: {
    record: 'Prospect inquiries',
    period: 'Six months after the last interaction.',
  },
  clients: {
    record: 'Client contact details',
    period: 'One year after the relationship ends, except records needed for applicable fiscal or accounting obligations.',
  },
  accounting: {
    record: 'Fiscal and accounting records',
    period: 'At least 10 years, subject to applicable fiscal and accounting obligations.',
  },
  permissions: {
    record: 'Separate, minimal permission and opt-out records',
    period: 'For as long as needed to document permissions and honor opt-outs; a fixed period has not yet been finalized.',
  },
} as const;

export const marketingPrograms = {
  email: {
    purpose: 'Newsletters and commercial email about Sapphire Blue services and offers.',
    frequency: 'Approximately every two weeks.',
  },
  sms: {
    purpose: 'Optional automated marketing text messages about Sapphire Blue services and offers.',
    frequency: 'Message frequency would vary.',
    charges: 'Message and data rates may apply, according to your mobile carrier and plan.',
  },
} as const;
