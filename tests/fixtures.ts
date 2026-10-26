import { test as base, expect } from '@playwright/test';

// Fail closed for every browser test, including visual/no-JS tests and redirected
// form requests. Test-specific routes may only fulfill controlled simulations.
export const test = base.extend<{ networkSafety: void }>({
  networkSafety: [async ({ context }, use) => {
    const unexpected: string[] = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
      unexpected.push(url.origin + url.pathname);
      return route.abort('blockedbyclient');
    });
    await use();
    expect(unexpected, 'An external request escaped the controlled mocks').toEqual([]);
  }, { auto: true }],
});
// Finish local mirror callbacks while the API request fixture is still alive.
// A consent withdrawal can navigate while the browser is loading assets.
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });
export { expect };
