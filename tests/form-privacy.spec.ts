import { expect, test, type Page, type Route } from '@playwright/test';
import { noticeVersions } from '../src/data/business';
import {
  contactPermissionAvailability,
  prepareContactPermissions,
  type ContactPermissionInput,
} from '../src/data/contact-permissions';

const endpoint = 'https://script.google.com/**';
const confirmation = { status: 200, headers: { 'access-control-allow-origin': '*' }, body: 'ok' };

test.beforeEach(async ({ context, baseURL }) => {
  // Install before goto; fail closed for ALL external requests, including
  // Apps Script redirects and every analytics/conversion provider.
  const origin = new URL(baseURL!).origin;
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue()
    : route.abort('blockedbyclient'));
});

async function fillInquiry(page: Page) {
  await page.locator('[name="name"]').fill('Private inquiry test');
  await page.locator('[name="business"]').fill('Test business');
  await page.locator('[name="email"]').fill('inquiry@example.com');
  await page.locator('[name="message"]').fill('This message is not marketing consent.');
}

test('email and SMS permissions are separate, unchecked, optional and honestly unavailable', async ({ page }) => {
  await page.goto('/');
  for (const name of ['email_marketing', 'sms_marketing']) {
    const checkbox = page.locator(`[name="${name}"]`);
    await expect(checkbox).not.toBeChecked();
    await expect(checkbox).toBeDisabled();
    await expect(checkbox).not.toHaveAttribute('required');
    expect(await checkbox.getAttribute('checked')).toBeNull();
  }
  await expect(page.locator('#email-marketing-status')).toContainText('not verified email consent storage');
  await expect(page.locator('#sms-marketing-status')).toContainText('not verified SMS consent storage');
  await expect(page.locator('.marketing-permissions')).toContainText('every two weeks and commercial offers');
  await expect(page.locator('.marketing-permissions')).toContainText('automated marketing SMS');
  await expect(page.locator('.marketing-permissions')).toContainText('via Brevo');
  await expect(page.locator('#sms-marketing-terms')).toContainText('STOP');
  await expect(page.locator('#sms-marketing-terms')).toContainText('HELP');
  await expect(page.locator('#contact-privacy-notice a')).toHaveAttribute('href', '/privacy');
  await expect(page.locator('#sms-marketing-terms a[href="/sms-terms"]')).toBeVisible();
  await expect(page.locator('#contact-privacy-notice')).toContainText('No marketing permission or optional cookies are required');
  await expect(page.locator('[name="phone"]')).not.toHaveAttribute('required');
  await expect(page.locator('[name="phone"]')).not.toHaveAttribute('pattern');
  await expect(page.locator('#form input[type="checkbox"]')).toHaveCount(2);
});

for (const phone of ['', '555-0123']) {
  test(`an inquiry with ${phone ? 'a local phone' : 'no phone'} preserves the exact existing payload`, async ({ page }) => {
    const requests: { method: string; body: string; contentType: string }[] = [];
    await page.route(endpoint, async route => {
      requests.push({
        method: route.request().method(),
        body: route.request().postData() ?? '',
        contentType: route.request().headers()['content-type'],
      });
      await route.fulfill(confirmation);
    });
    await page.goto('/');
    await fillInquiry(page);
    await page.locator('[name="phone"]').fill(phone);
    await page.getByRole('button', { name: 'Send request', exact: true }).click();
    await expect(page.locator('#sent')).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('POST');
    expect(requests[0].contentType).toContain('application/x-www-form-urlencoded');
    expect([...new URLSearchParams(requests[0].body)]).toEqual([
      ['name', 'Private inquiry test'],
      ['business', 'Test business'],
      ['email', 'inquiry@example.com'],
      ['phone', phone],
      ['message', 'This message is not marketing consent.'],
      ['needs', 'Website'],
    ]);
    await expect(page.locator('#sent')).toContainText('This confirms your inquiry only. No email or SMS marketing subscription has been created.');
    await expect(page.locator('#sent')).not.toContainText(/you(?:’|')re subscribed|successfully subscribed|subscription confirmed/i);
    await page.locator('#again').click();
    for (const name of ['email_marketing', 'sms_marketing']) {
      await expect(page.locator(`[name="${name}"]`)).not.toBeChecked();
      await expect(page.locator(`[name="${name}"]`)).toBeDisabled();
    }
  });
}

for (const field of ['email_marketing', 'sms_marketing']) {
  for (const reenabled of [false, true]) {
    test(`rejects a selected unavailable ${field}, even if ${reenabled ? 're-enabled' : 'still disabled'}`, async ({ page }) => {
      let submissions = 0;
      await page.route(endpoint, route => {
        submissions++;
        return route.fulfill(confirmation);
      });
      await page.goto('/');
      await fillInquiry(page);
      await page.locator(`[name="${field}"]`).evaluate((element, enable) => {
        const checkbox = element as HTMLInputElement;
        checkbox.checked = true;
        if (enable) checkbox.disabled = false;
      }, reenabled);
      await page.getByRole('button', { name: 'Send request', exact: true }).click();
      await expect(page.locator('#permissionError')).toBeVisible();
      await expect(page.locator('#permissionError')).toContainText(field === 'email_marketing' ? 'Email marketing is unavailable' : 'SMS marketing is unavailable');
      await expect(page.locator('#permissionError')).toBeFocused();
      await expect(page.locator('#sent')).toBeHidden();
      await expect(page.locator('[name="message"]')).toHaveValue('This message is not marketing consent.');
      expect(submissions).toBe(0);
      // A deliberate correction, not silently dropping a selected permission,
      // allows the same visitor to send an inquiry without opting in.
      await page.locator(`[name="${field}"]`).evaluate(element => { (element as HTMLInputElement).checked = false; });
      await page.getByRole('button', { name: 'Send request', exact: true }).click();
      await expect(page.locator('#sent')).toBeVisible();
      expect(submissions).toBe(1);
    });
  }
}

test('synthetic submit events cannot bypass native required and email validation', async ({ page }) => {
  let submissions = 0;
  await page.route(endpoint, route => {
    submissions++;
    return route.fulfill(confirmation);
  });
  await page.goto('/');
  await page.locator('#form').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(submissions).toBe(0);
  await fillInquiry(page);
  await page.locator('[name="email"]').fill('not-an-email');
  await page.locator('#form').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(submissions).toBe(0);
  await expect(page.locator('#sent')).toBeHidden();
  await expect(page.locator('#form')).not.toHaveAttribute('aria-busy');
  await page.locator('[name="email"]').fill('inquiry@example.com');
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await expect(page.locator('#sent')).toBeVisible();
  expect(submissions).toBe(1);
});

test('freezes inquiry controls in flight, prevents duplicates and restores disabled permissions', async ({ page }) => {
  let pending: Route | undefined;
  let submissions = 0;
  await page.route(endpoint, route => {
    submissions++;
    pending = route;
  });
  await page.goto('/');
  await fillInquiry(page);
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await expect(page.locator('#form')).toHaveAttribute('aria-busy', 'true');
  expect(await page.locator('#form input, #form textarea, #form button').evaluateAll(controls =>
    controls.every(control => (control as HTMLInputElement).disabled))).toBe(true);
  await page.locator('#form').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect.poll(() => submissions).toBe(1);
  await expect.poll(() => !!pending).toBe(true);
  await pending!.fulfill({ ...confirmation, body: 'not confirmed' });
  await expect(page.locator('#submitError')).toBeVisible();
  await expect(page.locator('[name="name"]')).toBeEnabled();
  await expect(page.locator('[data-need="website"]')).toBeEnabled();
  await expect(page.locator('[name="email_marketing"]')).toBeDisabled();
  await expect(page.locator('[name="sms_marketing"]')).toBeDisabled();
  await expect(page.locator('[name="message"]')).toHaveValue('This message is not marketing consent.');
  await expect(page.locator('#sent')).toBeHidden();
});

test('footer preserves homepage anchors and exposes legal links and global cookie settings', async ({ page }) => {
  await page.goto('/');
  for (const section of ['services', 'websites', 'plans', 'faq', 'contact']) {
    await expect(page.locator(`footer a[href="#${section}"]`)).toHaveCount(1);
  }
  await expect(page.locator('footer a[href="/privacy"]')).toHaveText('Privacy & Cookies');
  await expect(page.locator('footer a[href="/sms-terms"]')).toHaveText('SMS Terms');
  await expect(page.locator('footer [data-cookie-settings]')).toHaveAttribute('type', 'button');
  // These routes are supplied by the legal workstream before integration tests.
  for (const route of ['/privacy', '/sms-terms']) {
    expect((await page.goto(route))?.status()).toBe(200);
    for (const section of ['services', 'websites', 'plans', 'faq', 'contact']) {
      await expect(page.locator(`footer a[href="/#${section}"]`)).toHaveCount(1);
    }
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('keeps direct email available and explains the cookie settings fallback', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#form')).toBeHidden();
    await expect(page.locator('#contact-form noscript p')).toContainText('Please use the email link');
    await expect(page.locator('#contact a[href^="mailto:"]')).toBeVisible();
    await expect(page.locator('footer [data-cookie-settings]')).toBeHidden();
    await expect(page.locator('footer noscript p')).toHaveText('Cookie settings require JavaScript. Optional tracking stays off.');
  });
});

test.describe('pure permission preparation (fixtures never enable live subscriptions)', () => {
  const input: ContactPermissionInput = {
    email_marketing: false, sms_marketing: false, email: 'inquiry@example.com', phone: '',
  };

  test('configured flags cannot bypass the unverified delivery release gate', () => {
    for (const email of [false, true]) for (const sms of [false, true]) {
      expect(contactPermissionAvailability({ email, sms })).toEqual({ email: false, sms: false });
    }
  });

  test('unselected options do not constrain inquiry phone numbers', () => {
    for (const phone of ['', '555-0123', 'Not an SMS number']) {
      const result = prepareContactPermissions({ ...input, phone }, { email: false, sms: false });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected inquiry preparation');
      expect(result.permissions.email.selected).toBe(false);
      expect(result.permissions.sms.selected).toBe(false);
      expect(result.permissions.sms.phone).toBeNull();
      expect(result.permissions.privacyNoticeVersion).toBe(noticeVersions.privacy);
    }
  });

  test('availability and selections remain independent', () => {
    const email = prepareContactPermissions({ ...input, email_marketing: true }, { email: true, sms: false });
    expect(email.ok).toBe(true);
    if (!email.ok) throw new Error('Expected email fixture preparation');
    expect(email.permissions.email).toEqual({ selected: true, address: input.email, noticeVersion: noticeVersions.email });
    expect(email.permissions.sms.selected).toBe(false);
    const sms = prepareContactPermissions({ ...input, sms_marketing: true, phone: '+14155552671' }, { email: false, sms: true });
    expect(sms.ok).toBe(true);
    if (!sms.ok) throw new Error('Expected SMS fixture preparation');
    expect(sms.permissions.sms).toEqual({ selected: true, phone: '+14155552671', noticeVersion: noticeVersions.sms, provider: 'Brevo' });
    expect(sms.permissions.email.selected).toBe(false);
    for (const selectedEmail of [false, true]) for (const selectedSms of [false, true]) {
      const bothAvailable = prepareContactPermissions({
        ...input, email_marketing: selectedEmail, sms_marketing: selectedSms, phone: '+14155552671',
      }, { email: true, sms: true });
      expect(bothAvailable.ok).toBe(true);
      if (!bothAvailable.ok) throw new Error('Expected independent fixture selections');
      expect(bothAvailable.permissions.email.selected).toBe(selectedEmail);
      expect(bothAvailable.permissions.sms.selected).toBe(selectedSms);
    }
    expect(prepareContactPermissions({ ...input, sms_marketing: true, phone: '+14155552671' }, { email: true, sms: false })).toMatchObject({ ok: false, field: 'sms_marketing' });
    expect(prepareContactPermissions({ ...input, email_marketing: true }, { email: false, sms: true })).toMatchObject({ ok: false, field: 'email_marketing' });
  });

  test('enabled SMS fixtures require an explicit international number of 8–15 digits', () => {
    for (const phone of ['', '4155552671', '004155552671', '+012345678', '+1234567', '+1234567890123456', '+1 415 555 2671', '+14155552671 ext 2', '+abcdefgh']) {
      expect(prepareContactPermissions({ ...input, sms_marketing: true, phone }, { email: false, sms: true })).toMatchObject({ ok: false, field: 'phone' });
    }
    for (const phone of ['+12345678', '+14155552671', '+123456789012345', ' +14155552671 ']) {
      const result = prepareContactPermissions({ ...input, sms_marketing: true, phone }, { email: false, sms: true });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected valid SMS fixture');
      expect(result.permissions.sms.phone).toBe(phone.trim());
    }
  });
});
