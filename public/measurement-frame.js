/* Deliberately a classic script: this sandbox has an opaque origin, no cookies,
 * no access to the parent document and no form content. No third-party code runs
 * until the consent manager transfers a private MessagePort. */
(() => {
  const origin = 'https://www.sapphireblue.studio';
  const googleId = 'G-L07HB79EBQ';
  const metaId = '1053877131029984';
  let connected = false;
  let analytics = false;
  let advertising = false;
  let page = '/404';
  const leads = new Set();
  const pending = new Set();
  const gtag = function () { (window.dataLayer ||= []).push(arguments); };

  // No Meta SDK, auto-configuration, matching, cookies or implicit DOM/URL capture.
  // This is the browser Pixel GET transport, NOT a server-side Conversion API.
  function meta(event, id) {
    const query = new URLSearchParams({ id: metaId, ev: event, dl: origin + page, rl: '', if: 'true' });
    if (id) query.set('eid', id);
    const controller = new AbortController();
    pending.add(controller);
    fetch('https://www.facebook.com/tr/?' + query, {
      mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: controller.signal,
    }).catch(() => {}).finally(() => pending.delete(controller));
  }

  function enable(next) {
    if (next.analytics === true && !analytics) {
      analytics = true;
      window.gtag = gtag;
      // No persistent client identifier; a fresh ID is generated inside this frame.
      gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      gtag('js', new Date());
      gtag('config', googleId, {
        send_page_view: false, client_storage: 'none', client_id: crypto.randomUUID(),
        page_location: origin + page, page_referrer: '', page_title: 'Sapphire Blue',
        allow_google_signals: false, allow_ad_personalization_signals: false,
        ignore_referrer: true,
      });
      gtag('event', 'page_view', { page_location: origin + page, page_referrer: '', page_title: 'Sapphire Blue' });
      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + googleId;
      script.referrerPolicy = 'no-referrer';
      script.async = true;
      document.head.append(script);
    }
    if (next.advertising === true && !advertising) {
      advertising = true;
      meta('PageView');
    }
  }

  window.addEventListener('message', event => {
    if (connected || window.parent === window || event.source !== window.parent || event.origin !== origin
      || document.documentElement.dataset.production !== 'true' || event.data?.type !== 'sapphire:connect'
      || !event.ports[0] || !['/', '/privacy', '/sms-terms', '/404'].includes(event.data.page)) return;
    connected = true;
    page = event.data.page;
    const port = event.ports[0];
    port.onmessage = ({ data }) => {
      if (data?.type === 'enable') enable(data);
      if (data?.type === 'lead' && typeof data.id === 'string' && /^[a-f0-9-]{36}$/.test(data.id) && !leads.has(data.id)) {
        leads.add(data.id);
        if (data.analytics === true && analytics) gtag('event', 'generate_lead', { page_location: origin + page, page_referrer: '' });
        if (data.advertising === true && advertising) meta('Lead', data.id);
      }
    };
    enable(event.data);
    port.postMessage({ type: 'ready' });
  });
  window.addEventListener('pagehide', () => pending.forEach(controller => controller.abort()));
})();
