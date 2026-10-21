import { defineConfig } from '@playwright/test';

// Keep tests separate from the dev server and never silently test a stale build.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4322);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL,
    browserName: 'chromium',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${port} --ignore-lock`,
    // Waiting for stdout avoids a preflight HTTP probe of a closed local port,
    // which can hang on WSL/firewall setups before Playwright starts the server.
    wait: { stdout: new RegExp(`http://127\\.0\\.0\\.1:${port}(?:/|\\s)`) },
    timeout: 30000,
  },
});
