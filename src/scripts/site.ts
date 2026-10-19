import { ADS, EMAIL, NEEDS, SOCIAL, calculate, fmt, type Need, type PlanId, type PlanSelection, type Selection } from '../data/pricing';

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

// Mobile menu: preserve the original toggle and link behavior.
const menu = $('#mmenu');
const burger = $('#burger');
burger.onclick = () => {
  const open = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
};
$$('a', menu).forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

function setTab(tab: string) {
  $$('[data-tabbtn]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tabbtn === tab)));
  $$('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== tab; });
}
$$('[data-tabbtn]').forEach(b => { b.onclick = () => setTab(b.dataset.tabbtn!); });
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

function optBtn(label: string, price: string, on: boolean, callback: () => void, pill = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'opt' + (pill ? ' pill' : '') + (on ? ' on' : '');
  button.innerHTML = pill ? label : '<strong>' + label + '</strong><span>' + price + '</span>';
  button.onclick = callback;
  return button;
}

function calc() {
  summary = calculate(st);
  const { sp, nets, lines, combo, saving, total, custom } = summary;
  const mk = (element: HTMLElement, map: typeof EMAIL, key: 'cs' | 'ce') => {
    element.innerHTML = '';
    const select = (id: PlanSelection) => { st[key] = id; calc(); };
    element.appendChild(optBtn('None', 'Skip', st[key] === 'none', () => select('none')));
    (Object.keys(map) as PlanId[]).forEach(id => {
      element.appendChild(optBtn(map[id].name, fmt(map[id].price), st[key] === id, () => select(id)));
    });
  };
  mk($('#optSocial'), SOCIAL, 'cs');
  mk($('#optEmail'), EMAIL, 'ce');
  const oa = $('#optAds');
  oa.innerHTML = '';
  ADS.forEach(a => oa.appendChild(optBtn(a.label, '', st.ads === a.id, () => { st.ads = a.id; calc(); }, true)));
  $('#nets').textContent = String(nets);
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
function renderNeeds() {
  $$('[data-need]').forEach(b => b.classList.toggle('on', !!st.picks[b.dataset.need as Need]));
}
$$('[data-need]').forEach(b => {
  b.onclick = () => {
    const need = b.dataset.need as Need;
    st.picks[need] = !st.picks[need];
    $('#needError').hidden = true;
    renderNeeds();
  };
});
function showForm() {
  form.hidden = false;
  $('#sent').hidden = true;
  $('#sent').style.display = '';
}
function prefill(needs: Need[], text: string) {
  showForm();
  st.picks = {};
  needs.forEach(n => { st.picks[n] = true; });
  renderNeeds();
  $('#needError').hidden = true;
  message.value = text;
}
$$('[data-plan]').forEach(a => a.addEventListener('click', () => {
  const [kind, id] = a.dataset.plan!.split(':') as ['social' | 'email', PlanId];
  const isSocial = kind === 'social';
  const plan = (isSocial ? SOCIAL : EMAIL)[id];
  prefill([kind], "Hi! I'd like to get started with the " + (isSocial ? 'Social Media' : 'Email Marketing') + ' ' + plan.name + ' plan (' + fmt(plan.price) + '/month).' + (isSocial ? " I'll share which " + SOCIAL[id].nets + ' platforms I want to use.' : ''));
}));
$('[data-prefill="website"]').addEventListener('click', () => prefill(['website'], "Hi! I'd like a quote for a website for my business."));
$('#getPlan').addEventListener('click', () => {
  const s = summary;
  const needs = (Object.keys(s.needs) as (keyof typeof s.needs)[]).filter(k => s.needs[k]);
  if (!s.lines.length) { prefill(['social'], ''); return; }
  prefill(needs.length ? needs : ['social'], "Hi! I built a plan on your site and I'd like to get started:\n" + s.lines.map(l => '- ' + l[0] + ': ' + l[1]).join('\n') + '\nMonthly total: ' + s.total + '/month' + (s.custom ? ' plus a custom quote for ads' : '') + '.');
});
form.addEventListener('submit', e => {
  e.preventDefault();
  const selected = (Object.keys(st.picks) as Need[]).filter(k => st.picks[k]);
  if (!selected.length) { $('#needError').hidden = false; return; }
  const fd = new FormData(form);
  const body = new URLSearchParams();
  ['name', 'business', 'email', 'phone', 'message'].forEach(k => body.append(k, String(fd.get(k) || '')));
  body.append('needs', selected.map(k => NEEDS[k]).join(', '));
  // Preserve the original endpoint and fire-and-forget submission semantics.
  fetch('https://script.google.com/macros/s/AKfycbxTrBiAcoSGTOAf96VUBIAyZEBq7e3N7tNg6ilLPrzFki71ijlj-dgNFLQ1bKLtttnh2A/exec', { method: 'POST', mode: 'no-cors', body }).catch(() => {});
  form.hidden = true;
  const sent = $('#sent');
  sent.hidden = false;
  sent.style.display = 'flex';
});
$('#again').onclick = () => { form.reset(); showForm(); };

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
