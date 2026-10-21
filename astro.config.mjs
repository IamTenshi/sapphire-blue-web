import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.sapphireblue.studio',
  output: 'static',
  // This small static site keeps critical CSS in the document. Multiple page
  // entrypoints must not turn the shared stylesheet into a blocking request.
  build: { inlineStylesheets: 'always' },
  vite: { plugins: [tailwindcss()] },
});
