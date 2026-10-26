import type { AdId, PlanId, PlanSelection } from '../data/pricing';
import { sendConfirmedLead, sendVercelEvent } from './tracking';

interface MarketingEvents {
  contact_click: { source: 'plan' | 'calculator' | 'website' | 'link' };
  email_click: Record<string, never>;
  plan_selected: { service: 'social' | 'email'; plan: PlanId };
  plan_built: { social: PlanSelection; email: PlanSelection; extra_platforms: number; ads: AdId };
  form_submit: { needs: string };
  form_success: { needs: string };
  form_error: { reason: 'network_timeout_or_rejection' };
}

const confirmed = new Set<string>();
// Called once on the confirmed response path, not on clicks, attempts or errors.
// Mark consumed even when tracking is off: there is deliberately no replay queue.
export function recordConfirmedLead(submissionId: string) {
  if (confirmed.has(submissionId)) return;
  confirmed.add(submissionId);
  try { sendConfirmedLead(submissionId); }
  catch { /* A blocked provider cannot change the form's result. */ }
}

// Local integration hook only by default: no storage, cookies or new requests.
// Never pass form fields, email addresses, free text or URL parameters here.
export function recordMarketingEvent<Name extends keyof MarketingEvents>(name: Name, properties: MarketingEvents[Name]) {
  document.dispatchEvent(new CustomEvent('sapphire:marketing', { detail: { name, properties } }));

  // Vercel custom events require Pro/Enterprise. Opt in only after confirming
  // plan support and privacy requirements; ordinary Hobby analytics is unchanged.
  void sendVercelEvent(name, properties);
}
