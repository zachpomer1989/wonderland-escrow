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
  initReveal();
  markCurrentPage();
});

window.WLSite = { paintIcons, ICON_BASE };
