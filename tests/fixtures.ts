import { test as base, expect } from '@playwright/test';

// Fail closed for every browser test, including visual/no-JS tests and redirected
// form requests. Test-specific routes may only fulfill controlled simulations.
export const test = base.extend<{ networkSafety: void }>({
  networkSafety: [async ({ context }, use) => {
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort('blockedbyclient');
    });
    await use();
  }, { auto: true }],
});
export { expect };
