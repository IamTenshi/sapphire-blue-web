import { ADS, EMAIL, NEEDS, SOCIAL, calculate, fmt, type Need, type PlanId, type PlanSelection, type Selection } from '../data/pricing';
import { marketingAvailability } from '../data/business';
import { contactPermissionAvailability, prepareContactPermissions } from '../data/contact-permissions';
import { recordConfirmedLead, recordMarketingEvent } from './marketing';

// Required elements belong to this page; fail explicitly if the template drifts.
function $<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error('Missing page element: ' + selector);
  return element;
}
const $$ = <T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

const st: Selection & { picks: Partial<Record<Need, boolean>> } = {
  cs: 'growth', ce: 'growth', nets: 0, ads: 'none', picks: { website: true },
};
let summary = calculate(st);

// A disclosure menu, not a modal: keep its expanded state synchronized.
const menu = $('#mmenu');
const burger = $('#burger');
function setMenu(open: boolean, restoreFocus = false) {
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  if (restoreFocus) burger.focus();
}
burger.onclick = () => setMenu(!menu.classList.contains('open'));
$$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.classList.contains('open')) setMenu(false, true);
});
document.addEventListener('click', event => {
  if (event.target instanceof Node && !menu.contains(event.target) && !burger.contains(event.target)) setMenu(false);
});
window.matchMedia('(min-width: 820px)').addEventListener('change', () => setMenu(false));

function setTab(tab: string) {
  $$('[data-tabbtn]').forEach(b => {
    const selected = b.dataset.tabbtn === tab;
    b.setAttribute('aria-selected', String(selected));
    b.tabIndex = selected ? 0 : -1;
  });
  $$('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== tab; });
}
const tabs = $$('[data-tabbtn]');
tabs.forEach((button, index) => {
  button.onclick = () => setTab(button.dataset.tabbtn!);
  button.addEventListener('keydown', event => {
    let target: number;
    if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[target].dataset.tabbtn!);
    tabs[target].focus();
  });
});
$$('a[data-tab]').forEach(a => a.addEventListener('click', () => setTab(a.dataset.tab!)));

$$('#faqList .faq').forEach(f => {
  const button = $('button', f);
  button.onclick = () => {
    const open = !f.classList.contains('open');
    $$('#faqList .faq').forEach(x => {
      x.classList.remove('open');
      $('button', x).setAttribute('aria-expanded', 'false');
    });
    if (open) {
      f.classList.add('open');
      button.setAttribute('aria-expanded', 'true');
    }
  };
});

function optBtn(value: string, label: string, price: string, callback: () => void, pill = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.value = value;
  button.className = 'opt' + (pill ? ' pill' : '');
  button.innerHTML = pill ? label : '<strong>' + label + '</strong><span>' + price + '</span>';
  button.onclick = callback;
  return button;
}

// Mount once: replacing the focused button on every calculation broke keyboard
// navigation. Updates below only change state, never the control's identity.
function mountPlans(element: HTMLElement, map: typeof EMAIL, key: 'cs' | 'ce') {
  const select = (id: PlanSelection) => { st[key] = id; calc(); };
  element.appendChild(optBtn('none', 'None', 'Skip', () => select('none')));
  (Object.keys(map) as PlanId[]).forEach(id => {
    element.appendChild(optBtn(id, map[id].name, fmt(map[id].price), () => select(id)));
  });
}
mountPlans($('#optSocial'), SOCIAL, 'cs');
mountPlans($('#optEmail'), EMAIL, 'ce');
ADS.forEach(ad => $('#optAds').appendChild(optBtn(ad.id, ad.label, '', () => { st.ads = ad.id; calc(); }, true)));

function calc() {
  summary = calculate(st);
  const { sp, nets, lines, combo, saving, total, custom } = summary;
  const update = (selector: string, value: string) => {
    $$<HTMLButtonElement>(selector).forEach(button => {
      const selected = button.dataset.value === value;
      button.classList.toggle('on', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  };
  update('#optSocial button', st.cs);
  update('#optEmail button', st.ce);
  update('#optAds button', st.ads);
  $('#nets').textContent = String(nets);
  $<HTMLButtonElement>('#netsDec').disabled = !sp || nets === 0;
  $<HTMLButtonElement>('#netsInc').disabled = !sp || nets === 5;
  $('#netsRow').style.opacity = sp ? '1' : '.45';
  $('#netsHint').textContent = sp
    ? 'Your ' + sp.name + ' plan already includes ' + sp.nets + ' platforms' + (nets ? ' · ' + (sp.nets + nets) + ' total' : '') + '. +$199/month each extra.'
    : 'Needs a social media plan';
  $('#lines').innerHTML = lines.length ? lines.map(l => '<div style="display:flex;justify-content:space-between;gap:16px;font-size:16px;line-height:1.3"><span style="color:#3D4A68">' + l[0] + '</span><strong style="color:' + (l[2] ? '#155DFC' : '#0B1B3A') + '">' + l[1] + '</strong></div>').join('')
    : '<span style="font-size:16px;color:#4A5675">Pick a plan to get started.</span>';
  $('#total').textContent = total;
  $('#customAds').hidden = !custom;
  const badge = $('#combo');
  badge.hidden = !combo;
  badge.textContent = 'Combo applied: you save ' + fmt(saving);
}
$('#netsInc').onclick = () => { if (st.cs !== 'none') { st.nets = Math.min(5, st.nets + 1); calc(); } };
$('#netsDec').onclick = () => { st.nets = Math.max(0, st.nets - 1); calc(); };
calc();

const form = $<HTMLFormElement>('#form');
const message = $<HTMLTextAreaElement>('textarea[name="message"]', form);
const submit = $<HTMLButtonElement>('button[type="submit"]', form);
const submitLabel = submit.textContent;
const emailMarketing = $<HTMLInputElement>('input[name="email_marketing"]', form);
const smsMarketing = $<HTMLInputElement>('input[name="sms_marketing"]', form);
const phone = $<HTMLInputElement>('input[name="phone"]', form);
const permissionError = $('#permissionError');
const availablePermissions = contactPermissionAvailability(marketingAvailability);
let submitting = false;
function clearPermissionError() {
  permissionError.hidden = true;
  [emailMarketing, smsMarketing, phone].forEach(control => control.removeAttribute('aria-invalid'));
}
[emailMarketing, smsMarketing, phone].forEach(control => control.addEventListener('input', clearPermissionError));
function renderNeeds() {
  $$('[data-need]').forEach(b => {
    const selected = !!st.picks[b.dataset.need as Need];
    b.classList.toggle('on', selected);
    b.setAttribute('aria-pressed', String(selected));
  });
}
$$('[data-need]').forEach(b => {
  b.onclick = () => {
    if (submitting) return;
    const need = b.dataset.need as Need;
    st.picks[need] = !st.picks[need];
    $('#needError').hidden = true;
    $('#needs').removeAttribute('aria-invalid');
    renderNeeds();
  };
});
function showForm() {
  form.hidden = false;
  $('#sent').hidden = true;
  $('#sent').style.display = '';
  $('#submitError').hidden = true;
  clearPermissionError();
}
function prefill(needs: Need[], text: string) {
  if (submitting) return;
  showForm();
  st.picks = {};
  needs.forEach(n => { st.picks[n] = true; });
  renderNeeds();
  $('#needError').hidden = true;
  $('#needs').removeAttribute('aria-invalid');
  message.value = text;
}
$$('[data-plan]').forEach(a => a.addEventListener('click', () => {
  const [kind, id] = a.dataset.plan!.split(':') as ['social' | 'email', PlanId];
  const isSocial = kind === 'social';
  const plan = (isSocial ? SOCIAL : EMAIL)[id];
  recordMarketingEvent('plan_selected', { service: kind, plan: id });
  prefill([kind], "Hi! I'd like to get started with the " + (isSocial ? 'Social Media' : 'Email Marketing') + ' ' + plan.name + ' plan (' + fmt(plan.price) + '/month).' + (isSocial ? " I'll share which " + SOCIAL[id].nets + ' platforms I want to use.' : ''));
}));
$('[data-prefill="website"]').addEventListener('click', () => prefill(['website'], "Hi! I'd like a quote for a website for my business."));
$('#getPlan').addEventListener('click', () => {
  recordMarketingEvent('plan_built', { social: st.cs, email: st.ce, extra_platforms: summary.nets, ads: st.ads });
  const s = summary;
  const needs = (Object.keys(s.needs) as (keyof typeof s.needs)[]).filter(k => s.needs[k]);
  if (!s.lines.length) { prefill(['social'], ''); return; }
  prefill(needs.length ? needs : ['social'], "Hi! I built a plan on your site and I'd like to get started:\n" + s.lines.map(l => '- ' + l[0] + ': ' + l[1]).join('\n') + '\nMonthly total: ' + s.total + '/month' + (s.custom ? ' plus a custom quote for ads' : '') + '.');
});
$$<HTMLAnchorElement>('a[href="#contact"]').forEach(link => link.addEventListener('click', () => {
  recordMarketingEvent('contact_click', { source: link.dataset.plan ? 'plan' : link.id === 'getPlan' ? 'calculator' : link.dataset.prefill === 'website' ? 'website' : 'link' });
}));
$$<HTMLAnchorElement>('a[href^="mailto:"]').forEach(link => link.addEventListener('click', () => {
  recordMarketingEvent('email_click', {});
}));

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (submitting) return;
  clearPermissionError();
  $('#submitError').hidden = true;
  // Read checked properties directly: FormData omits disabled controls and would
  // silently discard stale/tampered opt-ins instead of rejecting them visibly.
  const permissionPreparation = prepareContactPermissions({
    email_marketing: emailMarketing.checked,
    sms_marketing: smsMarketing.checked,
    email: $<HTMLInputElement>('input[name="email"]', form).value,
    phone: phone.value,
  }, availablePermissions);
  if (!permissionPreparation.ok) {
    permissionError.textContent = permissionPreparation.error;
    permissionError.hidden = false;
    const invalidControl = permissionPreparation.field === 'phone' ? phone
      : permissionPreparation.field === 'email_marketing' ? emailMarketing : smsMarketing;
    invalidControl.setAttribute('aria-invalid', 'true');
    permissionError.focus();
    return;
  }
  // Native submit validation can be bypassed by synthetic submit events.
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const selected = (Object.keys(st.picks) as Need[]).filter(k => st.picks[k]);
  if (!selected.length) {
    $('#needError').hidden = false;
    $('#needs').setAttribute('aria-invalid', 'true');
    $('[data-need]').focus();
    return;
  }
  const fd = new FormData(form);
  const body = new URLSearchParams();
  ['name', 'business', 'email', 'phone', 'message'].forEach(k => body.append(k, String(fd.get(k) || '')));
  body.append('needs', selected.map(k => NEEDS[k]).join(', '));
  // permissionPreparation.permissions remains local-only. No consent fields may
  // be appended until their mapping AND saved records have been verified.
  const requestId = crypto.randomUUID();
  const controls = Array.from(form.elements).filter(
    (control): control is HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | HTMLSelectElement =>
      control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement
      || control instanceof HTMLButtonElement || control instanceof HTMLSelectElement,
  );
  const previousDisabled = controls.map(control => control.disabled);
  submitting = true;
  controls.forEach(control => { control.disabled = true; });
  submit.textContent = 'Sending…';
  form.setAttribute('aria-busy', 'true');
  $('#submitError').hidden = true;
  recordMarketingEvent('form_submit', { needs: selected.join(',') });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    // Keep a simple form POST (no custom headers/preflight) and follow Google's
    // ContentService redirect. Apps Script returns "ok" after saving and notifying.
    const response = await fetch('https://script.google.com/macros/s/AKfycbxTrBiAcoSGTOAf96VUBIAyZEBq7e3N7tNg6ilLPrzFki71ijlj-dgNFLQ1bKLtttnh2A/exec', { method: 'POST', mode: 'cors', redirect: 'follow', credentials: 'omit', body, signal: controller.signal });
    if (!response.ok || (await response.text()).trim() !== 'ok') throw new Error('Submission not confirmed');
    recordConfirmedLead(requestId);
    form.hidden = true;
    const sent = $('#sent');
    sent.hidden = false;
    sent.style.display = 'flex';
    $('#sent-heading').focus();
    recordMarketingEvent('form_success', { needs: selected.join(',') });
  } catch {
    $('#submitError').hidden = false;
    recordMarketingEvent('form_error', { reason: 'network_timeout_or_rejection' });
  } finally {
    window.clearTimeout(timeout);
    submitting = false;
    controls.forEach((control, index) => { control.disabled = previousDisabled[index]; });
    submit.textContent = submitLabel;
    form.removeAttribute('aria-busy');
  }
});
$('#again').onclick = () => {
  if (submitting) return;
  form.reset();
  st.picks = { website: true };
  renderNeeds();
  $('#needError').hidden = true;
  $('#needs').removeAttribute('aria-invalid');
  showForm();
  $('input[name="name"]', form).focus();
};

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target as HTMLElement;
      if (element.hasAttribute('data-hl')) element.style.backgroundSize = '100% 74%';
      else { element.style.opacity = '1'; element.style.transform = 'none'; }
      observer.unobserve(element);
    });
  }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
  let k = 0;
  $$('[data-reveal]').forEach(element => {
    const inView = element.getBoundingClientRect().top < window.innerHeight;
    const delay = inView ? k++ * .15 : 0;
    element.style.opacity = '0';
    element.style.transform = 'translateY(28px)';
    element.style.transition = 'opacity .9s ease ' + delay + 's, transform .9s cubic-bezier(.2,.7,.2,1) ' + delay + 's';
  });
  $$('[data-hl]').forEach(element => {
    element.style.backgroundSize = '0% 74%';
    element.style.transition = 'background-size .8s cubic-bezier(.7,0,.2,1) .45s';
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('[data-reveal],[data-hl]').forEach(element => observer.observe(element));
  }));
}
