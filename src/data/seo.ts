import { EMAIL, SOCIAL } from './pricing';

export const siteIdentity = {
  name: 'sapphire blue.',
  alternateNames: ['Sapphire Blue', 'Sapphire Blue Studio', 'sapphireblue.studio'],
  title: 'Sapphire Blue Studio | Small Business Marketing',
  description: 'Sapphire Blue Studio provides websites, social media management and email marketing for US small businesses. Monthly marketing plans with tools included.',
  email: 'hello@sapphireblue.studio',
  profiles: [
    'https://www.facebook.com/sapphireblue.studio/',
    'https://www.instagram.com/sapphireblue.studio/',
  ],
};

// These answers summarize the existing, visible FAQ. No invented business facts.
const faq = [
  ['What is included in the price?', 'Everything listed in your plan, plus the tools to run it. Scheduling, analytics and email platform costs are already covered, so there are no extra subscriptions to pay. Every plan comes with a report. Prices are monthly, in USD.'],
  ['How does the website process work?', 'It starts with a conversation about your business. You get a brand-new site or an update of your current one. Delivery usually takes 1 to 2 weeks. Every site includes custom design, mobile-first layouts, SEO setup and forms that send leads straight to your inbox.'],
  ['Can I change plans?', 'Yes. You can move up or down between levels as your business changes. Changes apply the following month.'],
  ['How does billing work?', 'Plans are billed monthly in USD at a set price. Pay by card or any other method Stripe supports. Hire both social media and email marketing and you get 10% off those two plans.'],
  ['Do you handle hosting and maintenance after launch?', 'Yes. Hosting and maintenance are billed monthly, separate from the website build.'],
  ['Can I approve posts before they go live?', "Yes. You can review and approve every post before it's published, or leave it to us."],
];

export function createSiteGraph(siteUrl: string) {
  const organization = { '@id': `${siteUrl}#org` };
  const service = (name: string, section: string) => ({
    '@type': 'Service',
    name,
    url: `${siteUrl}#${section}`,
    provider: organization,
  });
  const plans = [
    { label: 'Social media', data: SOCIAL },
    { label: 'Email marketing', data: EMAIL },
  ].flatMap(({ label, data }) => Object.entries(data).map(([id, plan]) => ({
    '@type': 'Offer',
    '@id': `${siteUrl}#${label === 'Social media' ? 'social' : 'email'}-${id}`,
    name: `${label} ${plan.name}`,
    url: `${siteUrl}#plans`,
    seller: organization,
    price: plan.price,
    priceCurrency: 'USD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: plan.price,
      priceCurrency: 'USD',
      unitText: 'month',
      billingDuration: 'P1M',
    },
    itemOffered: {
      ...service(`${label} ${plan.name}`, 'plans'),
      description: plan.features.join('. '),
    },
  })));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}#website`,
        url: siteUrl,
        name: siteIdentity.name,
        alternateName: siteIdentity.alternateNames,
        inLanguage: 'en-US',
        publisher: organization,
      },
      {
        // Organization, not LocalBusiness: no physical address has been supplied.
        '@type': 'Organization',
        ...organization,
        name: siteIdentity.name,
        alternateName: siteIdentity.alternateNames,
        url: siteUrl,
        logo: `${siteUrl}assets/sapphire-blue-logo.svg`,
        image: `${siteUrl}social-preview-v2.jpg`,
        email: siteIdentity.email,
        description: siteIdentity.description,
        areaServed: { '@type': 'Country', name: 'United States' },
        sameAs: siteIdentity.profiles,
        makesOffer: [
          { '@type': 'Offer', itemOffered: service('Website design', 'websites') },
          { '@type': 'Offer', itemOffered: service('Social media management', 'plans') },
          { '@type': 'Offer', itemOffered: service('Email marketing', 'plans') },
          { '@type': 'Offer', itemOffered: service('Meta ads management', 'addons') },
        ],
        hasOfferCatalog: { '@id': `${siteUrl}#marketing-plans` },
      },
      {
        '@type': 'WebPage',
        '@id': `${siteUrl}#webpage`,
        url: siteUrl,
        name: siteIdentity.title,
        description: siteIdentity.description,
        inLanguage: 'en-US',
        isPartOf: { '@id': `${siteUrl}#website` },
        about: organization,
        mainEntity: organization,
      },
      {
        '@type': 'OfferCatalog',
        '@id': `${siteUrl}#marketing-plans`,
        name: 'Monthly social media and email marketing plans',
        url: `${siteUrl}#plans`,
        itemListElement: plans,
      },
      {
        '@type': 'FAQPage',
        '@id': `${siteUrl}#faq`,
        isPartOf: { '@id': `${siteUrl}#webpage` },
        mainEntity: faq.map(([name, text]) => ({
          '@type': 'Question',
          name,
          acceptedAnswer: { '@type': 'Answer', text },
        })),
      },
    ],
  };
}
