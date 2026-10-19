import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://sapphireblue.studio',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
});
