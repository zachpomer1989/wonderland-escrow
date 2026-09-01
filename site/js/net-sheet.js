/* Wonderland Escrow — net sheet calculator.
   All dollar amounts and rates come from fee-schedule.js. Nothing is hard-coded here. */
import { SCHEDULE, escrowFee, titlePremium, countyTransferTax, cityTransferTax, taxProration } from './fee-schedule.js?v=dev';

const money = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
const num = (id) => {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(v) ? v : 0;
};
const str = (id) => (document.getElementById(id)?.value || '').trim();

/* ---------------------------------------------------------------- seller side */
function sellerSheet() {
  const price = num('s-price');
  const closing = str('s-closing');
  const annualTax = price * (num('s-taxrate') / 100);
  const prorate = taxProration(annualTax, closing);

  const lines = [];
  const add = (label, amount, note) => { if (amount) lines.push({ label, amount, note }); };

  add('Listing brokerage commission', price * (num('s-listing') / 100), num('s-listing') + '% of sale price');
  add('Selling brokerage commission', price * (num('s-selling') / 100), num('s-selling') + '% of sale price');
  add(SCHEDULE.escrow.label + ' (seller half)', escrowFee(price));
  add(SCHEDULE.titleOwner.label, titlePremium(price, SCHEDULE.titleOwner));
  add('County documentary transfer tax', countyTransferTax(price), '$1.10 per $1,000');

  const cityKey = str('s-city');
  const cityAmt = cityTransferTax(price, cityKey);
  if (cityAmt) add('City transfer tax — ' + SCHEDULE.cityTransferTax[cityKey].label, cityAmt);

  Object.values(SCHEDULE.sellerFlat).forEach((f) => add(f.label, f.amount));
  add('Home warranty', num('s-warranty'));
  add('Termite inspection &amp; work', num('s-termite'));
  add('HOA documents &amp; transfer fee', num('s-hoa'));
  add('Property tax proration', prorate.sellerAmount, prorate.sellerDays + ' days at seller&rsquo;s expense');
  add('Credit to buyer for closing costs', num('s-credit'));
  add('Repairs &amp; other credits', num('s-repairs'));

  const payoff1 = num('s-payoff1');
  const payoff2 = num('s-payoff2');
  add('First loan payoff', payoff1);
  add('Second loan / HELOC payoff', payoff2);

  const costs = lines.reduce((t, l) => t + l.amount, 0);
  return { price, lines, costs, net: price - costs, prorate };
}

/* ------------------------------------------------- where the money goes (seller bar)
   Buckets the seller line items by kind so the bar stays readable no matter how many
   individual fees are filled in. Labels are matched against the labels built in
   sellerSheet() above -- if you rename one there, rename it here too. */
const MBAR_BUCKETS = [
  { key: 'payoff', name: 'Loan payoffs', test: (l) => /^(first|second) loan/i.test(l) },
  { key: 'commission', name: 'Commissions', test: (l) => /commission/i.test(l) },
  { key: 'transfer', name: 'Transfer taxes', test: (l) => /transfer tax/i.test(l) },
  { key: 'titleescrow', name: 'Title &amp; escrow', test: (l) => /escrow|title|notary|recording|wire|courier|demand|subordination/i.test(l) },
  { key: 'other', name: 'Credits, prorations &amp; other', test: () => true },
];

const pct = (n) => (n < 1 ? n.toFixed(1) : n.toFixed(0));

function renderMoneyBar(r) {
  const track = document.getElementById('s-mbar-track');
  const legend = document.getElementById('s-mbar-legend');
  const figure = document.getElementById('s-mbar');
  if (!track || !legend || !figure) return;

  if (!r.price) { figure.hidden = true; return; }
  figure.hidden = false;

  const totals = {};
  r.lines.forEach((l) => {
    const b = MBAR_BUCKETS.find((x) => x.test(l.label));
    totals[b.key] = (totals[b.key] || 0) + l.amount;
  });

  const parts = MBAR_BUCKETS
    .filter((b) => totals[b.key] > 0)
    .map((b) => ({ key: b.key, name: b.name, amount: totals[b.key] }));

  // When costs exceed the price there is no net to show -- the overage gets its own segment
  // rather than a negative width, so the seller sees the shortfall instead of a broken bar.
  const short = r.net < 0;
  if (short) parts.push({ key: 'over', name: 'Short at closing', amount: -r.net });
  else parts.push({ key: 'net', name: 'Your net proceeds', amount: r.net });

  const span = short ? r.costs : r.price;
  track.innerHTML = parts.map((p) =>
    `<span class="mbar__seg mbar__seg--${p.key}" style="width:${(p.amount / span * 100).toFixed(3)}%"></span>`
  ).join('');

  legend.innerHTML = parts.map((p) =>
    `<span class="mbar__item mbar__item--${p.key}">` +
      `<span class="mbar__swatch mbar__seg--${p.key}"></span>` +
      `<span class="mbar__name">${p.name}</span>` +
      `<span class="mbar__val">${money(p.amount)} &middot; ${pct(p.amount / span * 100)}%</span>` +
    '</span>'
  ).join('');

  figure.setAttribute('aria-label',
    'Where the sale price goes: ' + parts.map((p) => `${p.name.replace(/&amp;/g, 'and')} ${money(p.amount)}`).join(', ') + '.');
}

/* ----------------------------------------------------------------- buyer side */
function buyerSheet() {
  const price = num('b-price');
  const closing = str('b-closing');
  const downPct = num('b-down');
  const down = price * (downPct / 100);
  const loan = Math.max(0, price - down);
  const annualTax = price * (num('b-taxrate') / 100);
  const prorate = taxProration(annualTax, closing);
  const rate = num('b-rate') / 100;

  const lines = [];
  const add = (label, amount, note) => { if (amount) lines.push({ label, amount, note }); };

  add('Loan origination', loan * (num('b-origination') / 100), num('b-origination') + '% of loan amount');
  add(SCHEDULE.escrow.label + ' (buyer half)', escrowFee(price));
  add(SCHEDULE.titleLender.label, titlePremium(price, SCHEDULE.titleLender));
  Object.values(SCHEDULE.buyerFlat).forEach((f) => add(f.label, f.amount));

  const daysPrepaid = num('b-prepaiddays');
  add('Prepaid interest', (loan * rate / 365) * daysPrepaid, daysPrepaid + ' days at ' + num('b-rate') + '%');

  const hazard = num('b-hazard');
  add('Hazard insurance — first year', hazard);
  add('Insurance impound reserve', (hazard / 12) * num('b-impound'), num('b-impound') + ' months');
  add('Property tax impound reserve', (annualTax / 12) * num('b-impound'), num('b-impound') + ' months');
  add('Property tax proration', prorate.buyerAmount, prorate.buyerDays + ' days at buyer&rsquo;s expense');
  add('HOA transfer &amp; prorated dues', num('b-hoa'));
  add('Home inspection', num('b-inspection'));

  const closingCosts = lines.reduce((t, l) => t + l.amount, 0);
  const credit = num('b-credit');
  const deposit = num('b-deposit');
  return { price, down, loan, lines, closingCosts, credit, deposit, cash: down + closingCosts - credit - deposit, prorate };
}

/* ------------------------------------------------------------------ rendering */
function renderLines(el, lines) {
  el.innerHTML = lines.map((l) => `
    <div class="sheet__line">
      <div><span class="sheet__label">${l.label}</span>${l.note ? `<span class="sheet__note">${l.note}</span>` : ''}</div>
      <span class="sheet__amt">${money(l.amount)}</span>
    </div>`).join('') || '<p class="small">Enter a sale price to see the breakdown.</p>';
}

function renderSeller() {
  const r = sellerSheet();
  renderLines(document.getElementById('s-lines'), r.lines);
  document.getElementById('s-gross').textContent = money(r.price);
  document.getElementById('s-costs').textContent = money(r.costs);
  document.getElementById('s-net').textContent = money(r.net);
  document.getElementById('s-pct').textContent = r.price ? (r.costs / r.price * 100).toFixed(1) + '% of sale price' : '—';
  renderMoneyBar(r);
  return r;
}

function renderBuyer() {
  const r = buyerSheet();
  renderLines(document.getElementById('b-lines'), r.lines);
  document.getElementById('b-down').textContent = money(r.down);
  document.getElementById('b-loan').textContent = money(r.loan);
  document.getElementById('b-costs').textContent = money(r.closingCosts);
  document.getElementById('b-cash').textContent = money(r.cash);
  return r;
}

function renderAll() {
  const seller = renderSeller();
  const buyer = renderBuyer();
  const cmp = document.getElementById('compare-body');
  if (cmp) {
    cmp.innerHTML = `
      <div class="sheet__line"><span class="sheet__label">Seller net proceeds</span><span class="sheet__amt">${money(seller.net)}</span></div>
      <div class="sheet__line"><span class="sheet__label">Seller total costs</span><span class="sheet__amt">${money(seller.costs)}</span></div>
      <div class="sheet__line"><span class="sheet__label">Buyer cash to close</span><span class="sheet__amt">${money(buyer.cash)}</span></div>
      <div class="sheet__line"><span class="sheet__label">Buyer closing costs</span><span class="sheet__amt">${money(buyer.closingCosts)}</span></div>`;
  }
  syncPrintHeader();
}

/* --------------------------------------------------------------- co-branding */
function syncPrintHeader() {
  const set = (id, v, fallback) => { const el = document.getElementById(id); if (el) el.textContent = v || fallback; };
  set('print-agent', str('c-agent'), 'Prepared by Wonderland Escrow');
  set('print-brokerage', [str('c-brokerage'), str('c-dre') && 'DRE #' + str('c-dre')].filter(Boolean).join(' · '), '');
  set('print-property', str('c-property'), 'Property address');
  set('print-client', str('c-client') ? 'Prepared for ' + str('c-client') : '', '');
  set('print-officer', str('c-officer'), '');
  set('print-date', new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), '');
}

/* -------------------------------------------------------------------- tabs */
function initTabs() {
  const tabs = document.querySelectorAll('[data-tab]');
  const panels = document.querySelectorAll('[data-panel]');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    panels.forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
    document.body.dataset.sheet = t.dataset.tab;
  }));
}

/* --------------------------------------------------------------- email hand-off
   POST target is your form endpoint — SiteGround PHP mail, Formspree, or the same
   serverless function that powers the chatbot. See site/README.md. */
async function emailSheet(e) {
  e.preventDefault();
  const status = document.getElementById('send-status');
  const payload = {
    kind: document.body.dataset.sheet || 'seller',
    agent: { name: str('c-agent'), brokerage: str('c-brokerage'), dre: str('c-dre'), email: str('c-email') },
    client: str('c-client'),
    property: str('c-property'),
    officer: str('c-officer'),
    seller: sellerSheet(),
    buyer: buyerSheet(),
  };
  if (!payload.agent.email) { status.textContent = 'Add your email address first.'; return; }
  status.textContent = 'Sending…';
  try {
    const res = await fetch('/api/net-sheet', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    status.textContent = res.ok
      ? 'Sent. Check your inbox — a copy went to your Wonderland officer too.'
      : 'The email endpoint is not connected yet. Use “Download PDF” for now.';
  } catch {
    status.textContent = 'The email endpoint is not connected yet. Use “Download PDF” for now.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const d = SCHEDULE.defaults;
  const seed = {
    's-listing': d.listingCommissionPct, 's-selling': d.sellingCommissionPct,
    's-warranty': d.homeWarranty, 's-termite': d.termite, 's-hoa': d.hoaDocs,
    's-taxrate': d.annualPropertyTaxRate,
    'b-down': d.downPaymentPct, 'b-rate': d.interestRatePct,
    'b-origination': d.originationPct, 'b-hazard': d.hazardInsuranceAnnual,
    'b-impound': d.impoundMonths, 'b-taxrate': d.annualPropertyTaxRate, 'b-prepaiddays': 15,
  };
  Object.entries(seed).forEach(([id, v]) => { const el = document.getElementById(id); if (el && !el.value) el.value = v; });

  const today = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  ['s-closing', 'b-closing'].forEach((id) => { const el = document.getElementById(id); if (el && !el.value) el.value = today; });

  document.querySelectorAll('.sheet-form input, .sheet-form select').forEach((el) => {
    el.addEventListener('input', renderAll);
    el.addEventListener('change', renderAll);
  });

  document.getElementById('disclaimer-text').innerHTML = SCHEDULE.disclaimer;
  document.getElementById('print-disclaimer').innerHTML = SCHEDULE.disclaimer;
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());
  document.getElementById('email-form')?.addEventListener('submit', emailSheet);

  initTabs();
  document.body.dataset.sheet = 'seller';
  renderAll();
});
