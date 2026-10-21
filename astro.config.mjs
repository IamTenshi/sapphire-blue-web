import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.sapphireblue.studio',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
});
