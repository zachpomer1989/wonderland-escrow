/* ============================================================================
   Wonderland Escrow — escrow assistant widget.

   Two modes, decided at runtime:
   1. GROUNDED (default, works with zero backend). Matches the question against
      content/escrow-faq.json and returns the curated answer verbatim. It cannot
      invent a fee, a deadline, or legal advice, because it can only quote the file.
   2. ASSISTED (optional). If /api/chat responds, the same FAQ is passed to Claude
      as context with instructions to answer only from it and otherwise hand off.
      See site/api/chat.js for the reference implementation.

   Either way the assistant always offers a human. Escrow answers carry real
   liability, so the default is deliberately conservative.
   ========================================================================== */
(() => {
  const API = '/api/chat';
  const FAQ_URL = 'content/escrow-faq.json';
  const STORE = 'wl-chat-log';

  let faq = null;
  let apiAvailable = null;   // null = untested
  let log = [];

  const OPENER = "Hi — I can answer common escrow questions: timelines, who pays what, wire safety, contingencies, net sheets. What can I help with?";
  const CHIPS = ['What is escrow?', 'How long does escrow take?', 'Who pays for escrow?', 'How do I send my wire safely?'];
  const HANDOFF = "I'd rather hand that to a person than guess at it. Our officers reply the same business day — <a href=\"contact.html\">send us a note</a> or call the office nearest the property.";

  /* ------------------------------------------------------------------ matching */
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set(['the','a','an','is','are','do','does','i','my','me','you','your','of','for','to','in','on','it','and','what','how','when','who','can','with','be','get','that','this']);

  function score(query, entry) {
    const q = normalize(query);
    for (const k of entry.keywords) if (q.includes(normalize(k))) return 100;
    const words = q.split(' ').filter((w) => w.length > 2 && !STOP.has(w));
    if (!words.length) return 0;
    const hay = normalize(entry.q + ' ' + entry.keywords.join(' '));
    return words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) / words.length * 60;
  }

  function localAnswer(query) {
    const q = normalize(query);
    if (faq.refuse.patterns.some((p) => q.includes(normalize(p)))) return { text: faq.refuse.answer, handoff: true };
    const ranked = faq.entries.map((e) => ({ e, s: score(query, e) })).sort((a, b) => b.s - a.s);
    if (!ranked.length || ranked[0].s < 28) return { text: HANDOFF, handoff: true };
    const best = ranked[0];
    const also = ranked.slice(1, 3).filter((r) => r.s >= 28).map((r) => r.e.q);
    return { text: best.e.a, related: also };
  }

  /* ------------------------------------------------------------------ transport */
  async function ask(query) {
    if (apiAvailable !== false) {
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: query, history: log.slice(-6) }),
        });
        if (res.ok) {
          apiAvailable = true;
          const data = await res.json();
          if (data && data.reply) return { text: data.reply, related: data.related || [] };
        }
        apiAvailable = false;
      } catch { apiAvailable = false; }
    }
    return localAnswer(query);
  }

  /* -------------------------------------------------------------------- markup */
  function mount() {
    const el = document.createElement('div');
    el.className = 'wl-chat';
    el.innerHTML = `
      <button class="wl-chat__fab" aria-expanded="false" aria-controls="wl-chat-panel">
        <span class="ico" data-i="message-circle"></span>
        <span class="wl-chat__fab-label">Escrow Questions?</span>
      </button>
      <section class="wl-chat__panel" id="wl-chat-panel" hidden aria-label="Escrow assistant">
        <header class="wl-chat__head">
          <div>
            <p class="wl-chat__eyebrow">Wonderland Escrow</p>
            <p class="wl-chat__title">Escrow Assistant</p>
          </div>
          <button class="wl-chat__close" aria-label="Close"><span class="ico" data-i="x"></span></button>
        </header>
        <div class="wl-chat__log" role="log" aria-live="polite"></div>
        <div class="wl-chat__chips"></div>
        <form class="wl-chat__form">
          <label class="sr-only" for="wl-chat-input">Your question</label>
          <input class="wl-chat__input" id="wl-chat-input" autocomplete="off" placeholder="Ask an escrow question…">
          <button class="wl-chat__send" type="submit" aria-label="Send"><span class="ico" data-i="arrow-up"></span></button>
        </form>
        <p class="wl-chat__legal">General information only &mdash; not legal, tax or financial advice. Never act on wire instructions received by email.</p>
      </section>`;
    document.body.appendChild(el);
    return el;
  }

  function bubble(logEl, who, html) {
    const b = document.createElement('div');
    b.className = 'wl-msg wl-msg--' + who;
    b.innerHTML = html;
    logEl.appendChild(b);
    logEl.scrollTop = logEl.scrollHeight;
    return b;
  }

  function renderChips(host, items, onPick) {
    host.innerHTML = '';
    items.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wl-chip';
      b.textContent = c;
      b.addEventListener('click', () => onPick(c));
      host.appendChild(b);
    });
  }

  /* ---------------------------------------------------------------------- init */
  async function init() {
    try {
      faq = await (await fetch(FAQ_URL)).json();
    } catch {
      return; // no knowledge base, no widget — better silent than wrong
    }

    const root = mount();
    const fab = root.querySelector('.wl-chat__fab');
    const panel = root.querySelector('.wl-chat__panel');
    const logEl = root.querySelector('.wl-chat__log');
    const chips = root.querySelector('.wl-chat__chips');
    const form = root.querySelector('.wl-chat__form');
    const input = root.querySelector('.wl-chat__input');

    window.WLSite && window.WLSite.paintIcons(root);

    try { log = JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch { log = []; }
    if (log.length) log.forEach((m) => bubble(logEl, m.role === 'user' ? 'you' : 'bot', m.text));
    else bubble(logEl, 'bot', OPENER);
    renderChips(chips, CHIPS, submit);

    const open = (state) => {
      panel.hidden = !state;
      fab.setAttribute('aria-expanded', String(state));
      root.classList.toggle('is-open', state);
      if (state) setTimeout(() => input.focus(), 60);
    };
    fab.addEventListener('click', () => open(panel.hidden));
    root.querySelector('.wl-chat__close').addEventListener('click', () => open(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) open(false); });

    form.addEventListener('submit', (e) => { e.preventDefault(); submit(input.value); });

    async function submit(text) {
      const q = String(text || '').trim();
      if (!q) return;
      input.value = '';
      chips.innerHTML = '';
      bubble(logEl, 'you', q.replace(/</g, '&lt;'));
      log.push({ role: 'user', text: q });

      const thinking = bubble(logEl, 'bot', '<span class="wl-dots"><i></i><i></i><i></i></span>');
      const res = await ask(q);
      thinking.classList.add('wl-msg--settled');
      thinking.innerHTML = res.text;
      log.push({ role: 'assistant', text: res.text });
      sessionStorage.setItem(STORE, JSON.stringify(log.slice(-20)));

      if (res.handoff) {
        const cta = document.createElement('div');
        cta.className = 'wl-msg wl-msg--bot wl-msg--cta';
        cta.innerHTML = '<a class="btn btn--primary btn--sm" href="contact.html">Talk To An Officer</a>';
        logEl.appendChild(cta);
      }
      renderChips(chips, (res.related && res.related.length ? res.related : CHIPS).slice(0, 3), submit);
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
