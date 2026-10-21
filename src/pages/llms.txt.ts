import type { APIRoute } from 'astro';
import { siteIdentity } from '../data/seo';

// Optional discovery aid, not a Google indexing or AI citation requirement.
export const GET: APIRoute = ({ site }) => {
  const home = new URL('/', site).href;
  const text = `# Sapphire Blue Studio

> ${siteIdentity.description}

The brand is styled "${siteIdentity.name}" and is also known as Sapphire Blue and Sapphire Blue Studio. Its official website is ${home}. Its target market is small businesses in the United States; this does not imply a physical US office.

## Official website

- [Services](${home}#services): Website design, social media management and email marketing.
- [Websites](${home}#websites): Custom design, mobile-first layouts, SEO setup and lead forms. Hosting and maintenance are billed separately from the website build.
- [Monthly plans](${home}#plans): Social media and email marketing prices, in USD per month; tools included.
- [Ads management](${home}#addons): Instagram and Facebook ads management; ad spend is paid directly to Meta and is not included in management fees.
- [FAQ](${home}#faq): Billing, plan changes, approvals and the website process.
- [Contact](${home}#contact): ${siteIdentity.email}.

## Pricing reference

- [Pricing in Markdown](${home}pricing.md): The same plans and prices as the website, generated from its pricing data at build time.

## Linked profiles

${siteIdentity.profiles.map(url => `- ${url}`).join('\n')}
`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
