import { EMAIL, SOCIAL } from './pricing';
import { faqEntries } from './faq';

// Add only real, indexable HTML pages here, not fragments or discovery files.
export const indexablePaths = ['/'] as const;

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
        mainEntity: faqEntries.map(({ question, paragraphs }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: paragraphs.join(' ') },
        })),
      },
    ],
  };
}
