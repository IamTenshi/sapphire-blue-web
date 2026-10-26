import type { AdId, PlanId, PlanSelection } from '../data/pricing';

interface MarketingEvents {
  contact_click: { source: 'plan' | 'calculator' | 'website' | 'link' };
  email_click: Record<string, never>;
  plan_selected: { service: 'social' | 'email'; plan: PlanId };
  plan_built: { social: PlanSelection; email: PlanSelection; extra_platforms: number; ads: AdId };
  form_submit: { needs: string };
  form_success: { needs: string };
  form_error: { reason: 'network_timeout_or_rejection' };
}

// Only call after Apps Script's success response, never on a click or attempt.
export function recordMetaLead() {
  const pixelWindow = window as Window & { fbq?: (command: 'track', event: 'Lead') => void };
  try {
    pixelWindow.fbq?.('track', 'Lead');
  } catch {
    // A blocked or broken pixel must not turn a confirmed submission into an error.
  }
}

// Use the same confirmed-success path as Meta; never track form starts or attempts.
export function recordGoogleLead() {
  const analyticsWindow = window as Window & { gtag?: (command: 'event', event: 'generate_lead') => void };
  try {
    analyticsWindow.gtag?.('event', 'generate_lead');
  } catch {
    // Analytics failures must not affect the form or other tracking providers.
  }
}

// Local integration hook only by default: no storage, cookies or new requests.
// Never pass form fields, email addresses, free text or URL parameters here.
export function recordMarketingEvent<Name extends keyof MarketingEvents>(name: Name, properties: MarketingEvents[Name]) {
  document.dispatchEvent(new CustomEvent('sapphire:marketing', { detail: { name, properties } }));

  // Vercel custom events require Pro/Enterprise. Opt in only after confirming
  // plan support and privacy requirements; ordinary Hobby analytics is unchanged.
  if (document.documentElement.dataset.customEvents === 'true') {
    void import('@vercel/analytics').then(({ track }) => track(name, properties)).catch(() => {
      // Measurement must never prevent navigation or a contact request.
    });
  }
}
