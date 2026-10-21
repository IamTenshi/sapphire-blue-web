import type { APIRoute } from 'astro';
import { ADS, EMAIL, SOCIAL } from '../data/pricing';

export const GET: APIRoute = ({ site }) => {
  const home = new URL('/', site).href;
  const plans = [
    { label: 'Social media management', data: SOCIAL },
    { label: 'Email marketing', data: EMAIL },
  ].map(({ label, data }) => `## ${label}\n\n` + Object.values(data).map(plan =>
    `### ${plan.name}\n\n- Price: ${plan.price} USD per month.\n${plan.features.map(feature => `- ${feature}`).join('\n')}`
  ).join('\n\n')).join('\n\n');
  const text = `# Sapphire Blue Studio — Pricing

Official plans: ${home}#plans

Prices are in USD, billed monthly. Scheduling, analytics and email platform costs are included in the applicable plans. This document is generated from the same data as the website's plan cards and calculator.

${plans}

## Add-ons and discounts

- Extra social platform: 199 USD per month each, added to a social media plan.
- Social media plus email marketing: 10% off those two plans only. Extra platforms and ads management are excluded from that discount.

## Instagram and Facebook ads management

Ad spend is separate from the management fee and paid directly to Meta.

${ADS.filter(ad => ad.id !== 'none').map(ad => `- Monthly ad spend ${ad.label}: ${ad.custom ? 'custom management quote' : `${ad.price} USD per month management fee`}.`).join('\n')}

## Website design

Website builds are quoted individually. Hosting and maintenance are billed monthly, separately from the website build. Typical delivery is 1 to 2 weeks, depending on complexity.

Website details: ${home}#websites
Questions and billing: ${home}#faq
Request a quote: ${home}#contact
`;
  return new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
