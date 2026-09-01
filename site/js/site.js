/* Wonderland Escrow — shared site behaviour.
   Icons: real Lucide SVGs, masked so they inherit currentColor. Swap ICON_BASE for a local
   folder (assets/icons/) before launch if you'd rather not depend on a CDN. */
const ICON_BASE = 'https://unpkg.com/lucide-static@0.544.0/icons/';

function paintIcons(root = document) {
  root.querySelectorAll('.ico[data-i]').forEach((el) => {
    if (el.dataset.painted) return;
    const url = `url("${ICON_BASE}${el.dataset.i}.svg")`;
    el.style.webkitMaskImage = url;
    el.style.maskImage = url;
    el.dataset.painted = '1';
  });
}

function initNav() {
  const toggle = document.querySelector('.nav__toggle');
  const nav = document.querySelector('.nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}


/* Mega menu. CSS already opens it on :hover and :focus-within, so this only adds what CSS
   cannot: a first-tap-opens rule for touch, and Escape to close. Below 821px the panel is
   part of the stacked mobile nav and none of this applies. */
function initMega() {
  const isDesktop = () => window.matchMedia("(min-width:821px)").matches;
  document.querySelectorAll("[data-mega]").forEach((group) => {
    const link = group.querySelector("[aria-controls]");
    const panel = link && document.getElementById(link.getAttribute("aria-controls"));
    if (!panel) return;
    const set = (open) => {
      panel.classList.toggle("is-open", open);
      link.setAttribute("aria-expanded", String(open));
    };
    // Escape dismisses the panel while focus stays on the trigger; without this flag the
    // focus handler below would immediately reopen it.
    let dismissed = false;
    group.addEventListener("pointerenter", (e) => {
      if (!isDesktop() || e.pointerType !== "mouse") return;
      dismissed = false;
      set(true);
    });
    group.addEventListener("pointerleave", (e) => { if (isDesktop() && e.pointerType === "mouse") set(false); });
    group.addEventListener("focusin", () => { if (isDesktop() && !dismissed) set(true); });
    group.addEventListener("focusout", () => {
      if (!isDesktop() || group.contains(document.activeElement)) return;
      dismissed = false;
      set(false);
    });
    link.addEventListener("click", (e) => {
      // Touch has no hover: the first tap reveals the panel, a second follows the link.
      if (isDesktop() && !window.matchMedia("(hover:hover)").matches && !panel.classList.contains("is-open")) {
        e.preventDefault();
        set(true);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !panel.classList.contains("is-open")) return;
      set(false);
      dismissed = true;
      link.focus();
    });
  });
}


/* Escrow timeline: fills the rail and slides the W marker as the list scrolls past, and
   lights each step as it arrives. Without JS the CSS leaves every step readable. */
function initTimeline() {
  const tl = document.querySelector(".tl");
  if (!tl) return;
  const steps = Array.from(tl.querySelectorAll(".tl__step"));
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !("IntersectionObserver" in window)) {
    tl.style.setProperty("--tl-progress", "1");
    steps.forEach((s) => s.classList.add("is-active"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-active");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -30% 0px", threshold: 0.15 });
  steps.forEach((s) => io.observe(s));
  let queued = false;
  const update = () => {
    queued = false;
    const r = tl.getBoundingClientRect();
    // The rail fills to wherever the list crosses 55% of the viewport height.
    const p = (window.innerHeight * 0.55 - r.top) / r.height;
    tl.style.setProperty("--tl-progress", String(Math.min(1, Math.max(0, p))));
  };
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}

/* Territory map: hovering or focusing an office card below lights that office's pin, so the
   two halves of the section read as one thing. The pins themselves are hover-only in CSS. */
function initMap() {
  const map = document.querySelector('.map__svg');
  if (!map) return;
  const pinFor = (key) => map.querySelector(`.map__pin[data-office="${key}"]`);
  document.querySelectorAll('[data-office].card').forEach((card) => {
    const pin = pinFor(card.dataset.office);
    if (!pin) return;
    const lit = (on) => pin.classList.toggle('is-lit', on);
    card.addEventListener('pointerenter', () => lit(true));
    card.addEventListener('pointerleave', () => lit(false));
    card.addEventListener('focus', () => lit(true));
    card.addEventListener('blur', () => lit(false));
  });
}

/* Wire fraud "spot the fake": each tell in the mock email reveals its explanation and bumps
   the count. Nothing is scored or sent anywhere -- finding all four just unlocks the rule
   that actually protects people. */
function initWireFraud() {
  document.querySelectorAll('.wf').forEach((wf) => {
    const tells = Array.from(wf.querySelectorAll('.wf__tell'));
    const count = wf.querySelector('.wf__count');
    const done = wf.querySelector('.wf__done');
    let found = 0;
    tells.forEach((tell) => {
      tell.addEventListener('click', () => {
        if (tell.getAttribute('aria-pressed') === 'true') return;
        tell.setAttribute('aria-pressed', 'true');
        const note = wf.querySelector(`.wf__note[data-note="${tell.dataset.tell}"]`);
        if (note) note.hidden = false;
        found += 1;
        if (count) count.textContent = String(found);
        if (found === tells.length && done) done.hidden = false;
      });
    });
  });
}

function initReveal() {


  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  items.forEach((el) => io.observe(el));
}

/* Marks the current page in the nav without per-page markup. */
function markCurrentPage() {
  const here = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav a[href]').forEach((a) => {
    const target = new URL(a.getAttribute('href'), location.href).pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
    if (target === here) a.setAttribute('aria-current', 'page');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  paintIcons();
  initNav();
  initMega();
  initTimeline();
  initMap();
  initWireFraud();
  initReveal();
  markCurrentPage();
});

window.WLSite = { paintIcons, ICON_BASE };
