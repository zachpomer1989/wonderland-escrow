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
  initReveal();
  markCurrentPage();
});

window.WLSite = { paintIcons, ICON_BASE };
