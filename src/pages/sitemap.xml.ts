import type { APIRoute } from 'astro';
import { indexablePaths } from '../data/seo';

export const GET: APIRoute = ({ site }) => {
  const urls = indexablePaths.map(path => `  <url><loc>${new URL(path, site).href}</loc></url>`).join('\n');
  // Don't fabricate lastmod dates on every build. Add them only when an actual
  // content-modification date is available; changefreq/priority are unnecessary.
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
