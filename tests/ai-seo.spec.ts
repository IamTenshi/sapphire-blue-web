import { expect, test } from './fixtures';
import { EMAIL, SOCIAL } from '../src/data/pricing';

const home = 'https://www.sapphireblue.studio/';

for (const userAgent of ['Googlebot', 'OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot']) {
  test(`brand identity is in the initial HTML for ${userAgent}`, async ({ request }) => {
    const response = await request.get('/', { headers: { 'User-Agent': userAgent } });
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag'] ?? '').not.toMatch(/noindex|nosnippet/i);
    const html = await response.text();
    expect(html).toContain('<title>Sapphire Blue Studio | Small Business Marketing</title>');
    expect(html).toContain(`<link rel="canonical" href="${home}">`);
    const tag = html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    expect(tag).not.toBeNull();
    const graph = JSON.parse(tag![1])['@graph'];
    const organization = graph.find((entry: { '@type': string }) => entry['@type'] === 'Organization');
    expect(organization['@id']).toBe(`${home}#org`);
    expect(organization.alternateName).toContain('Sapphire Blue Studio');
    expect(organization.areaServed).toEqual({ '@type': 'Country', name: 'United States' });
    expect(organization).not.toHaveProperty('address');
    expect(organization).not.toHaveProperty('aggregateRating');
    expect(organization).not.toHaveProperty('founder');
    expect(organization.url).toBe(home);
    for (const offer of organization.makesOffer) {
      expect(offer.itemOffered.provider['@id']).toBe(organization['@id']);
      const fragment = new URL(offer.itemOffered.url).hash.slice(1);
      expect(html).toContain(`id="${fragment}"`);
    }
    const catalog = graph.find((entry: { '@type': string }) => entry['@type'] === 'OfferCatalog');
    expect(catalog.itemListElement).toHaveLength(6);
    for (const [kind, data] of [['social', SOCIAL], ['email', EMAIL]] as const) {
      for (const [id, plan] of Object.entries(data)) {
        const offer = catalog.itemListElement.find((entry: { '@id': string }) => entry['@id'] === `${home}#${kind}-${id}`);
        expect(offer.price).toBe(plan.price);
        expect(offer.priceCurrency).toBe('USD');
        expect(offer.priceSpecification).toMatchObject({ price: plan.price, unitText: 'month', billingDuration: 'P1M' });
        expect(offer.itemOffered.description).toBe(plan.features.join('. '));
      }
    }
    const faq = graph.find((entry: { '@type': string }) => entry['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(6);
    for (const question of faq.mainEntity) {
      expect(html).toContain(`<span>${question.name}</span>`);
    }
    const page = graph.find((entry: { '@type': string }) => entry['@type'] === 'WebPage');
    expect(page.mainEntity['@id']).toBe(organization['@id']);
  });
}

test('optional machine-readable references reflect the published plans', async ({ request }) => {
  const llms = await request.get('/llms.txt');
  expect(llms.status()).toBe(200);
  expect(llms.headers()['content-type']).toContain('text/plain');
  const overview = await llms.text();
  expect(overview).toContain(`${home}pricing.md`);
  expect(overview).toContain(`${home}#services`);
  expect(overview).toContain('Sapphire Blue Studio');

  const pricing = await request.get('/pricing.md');
  expect(pricing.status()).toBe(200);
  expect(pricing.headers()['content-type']).toContain('text/markdown');
  const text = await pricing.text();
  for (const data of [SOCIAL, EMAIL]) {
    for (const plan of Object.values(data)) {
      expect(text).toContain(`### ${plan.name}`);
      expect(text).toContain(`Price: ${plan.price} USD per month`);
      for (const feature of plan.features) expect(text).toContain(feature);
    }
  }
  expect(text).toContain('Ad spend is separate');
  expect(text).toContain('10% off those two plans only');
  expect(text).toContain('Hosting and maintenance are billed monthly, separately');
});

test('search discovery stays open and the sitemap uses the canonical host', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  const policy = await robots.text();
  expect(policy).toContain('User-agent: *\nAllow: /');
  expect(policy).toContain(`Sitemap: ${home}sitemap.xml`);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain(`<loc>${home}</loc>`);
});
