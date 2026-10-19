export type PlanId = 'starter' | 'growth' | 'full';
export type PlanSelection = PlanId | 'none';
export type Need = 'website' | 'social' | 'email' | 'ads';
export type AdId = 'none' | 't1' | 't2' | 't3' | 't4';

interface Plan {
  name: string;
  price: number;
  tag: string;
  features: string[];
}

export const SOCIAL: Record<PlanId, Plan & { nets: number }> = {
  starter: { name: 'Starter', price: 659, nets: 2, tag: 'Show up every week without lifting a finger.', features: ['2 social platforms of your choice', '12 posts a month, reels included', 'Basic report'] },
  growth: { name: 'Growth', price: 1099, nets: 3, tag: 'Grow your audience and keep the conversation going.', features: ['3 social platforms of your choice', '16 posts a month, up to 4 reels', '8 stories', 'Community management: replies to messages and comments', 'Monthly report'] },
  full: { name: 'Full', price: 1759, nets: 4, tag: 'Be everywhere your customers scroll.', features: ['4 social platforms of your choice', '24 posts a month, up to 8 reels', '16 stories', 'Community management', 'Monthly report plus a strategy call'] },
};

export const EMAIL: Record<PlanId, Plan> = {
  starter: { name: 'Starter', price: 529, tag: 'Stay on your customers’ radar.', features: ['2 campaigns a month', 'Up to 500 contacts', 'Basic report'] },
  growth: { name: 'Growth', price: 1059, tag: 'Turn one-time jobs into repeat clients.', features: ['4 campaigns a month', '2 automations', 'Up to 2,500 contacts', 'Basic segmentation', 'Monthly report'] },
  full: { name: 'Full', price: 1759, tag: 'Your whole inbox strategy, handled.', features: ['8 campaigns a month', '4 automations', 'Up to 5,000 contacts', 'Advanced segmentation', 'Monthly report with recommendations'] },
};

export const ADS: { id: AdId; label: string; price?: number; custom?: boolean }[] = [
  { id: 'none', label: 'No ads' },
  { id: 't1', label: 'Up to $1,500', price: 529 },
  { id: 't2', label: '$1,500 to $3,500', price: 799 },
  { id: 't3', label: '$3,500 to $6,000', price: 1059 },
  { id: 't4', label: 'Above $6,000', custom: true },
];

export const NEEDS: Record<Need, string> = { website: 'Website', social: 'Social media', email: 'Email marketing', ads: 'Ads' };

export const fmt = (n: number): string => '$' + (Number.isInteger(n)
  ? n.toLocaleString('en-US')
  : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export interface Selection {
  cs: PlanSelection;
  ce: PlanSelection;
  nets: number;
  ads: AdId;
}

export type SummaryLine = [label: string, price: string, discount?: number];

export function calculate(selection: Selection) {
  const sp = selection.cs === 'none' ? undefined : SOCIAL[selection.cs];
  const ep = selection.ce === 'none' ? undefined : EMAIL[selection.ce];
  const ad = ADS.find(a => a.id === selection.ads);
  const nets = sp ? selection.nets : 0;
  const lines: SummaryLine[] = [];
  if (sp) lines.push(['Social media ' + sp.name, fmt(sp.price)]);
  if (ep) lines.push(['Email marketing ' + ep.name, fmt(ep.price)]);
  const combo = !!(sp && ep);
  const saving = combo ? Math.round((sp.price + ep.price) * 10) / 100 : 0;
  if (combo) lines.push(['Combo discount (10%)', '-' + fmt(saving), 1]);
  if (nets) lines.push([nets + ' extra social platform' + (nets > 1 ? 's' : ''), fmt(nets * 199)]);
  if (ad?.price) lines.push(['Ads management (' + ad.label + ' spend)', fmt(ad.price)]);
  if (ad?.custom) lines.push(['Ads management (' + ad.label + ' spend)', 'Custom quote']);
  const total = (sp?.price ?? 0) + (ep?.price ?? 0) - saving + nets * 199 + (ad?.price ?? 0);
  return {
    sp, nets, combo, saving, lines, total: fmt(total), custom: !!ad?.custom,
    needs: { social: !!sp, email: !!ep, ads: !!ad && ad.id !== 'none' },
  };
}
