/* Wonderland Escrow — officer directory.

   This page deliberately has no roster of its own. It fetches the five office pages and reads
   their officer cards, so rosters stay edited in exactly one place (the office-*.html files),
   which is the rule the README sets. The cost is five HTML fetches on load; they are ordinary
   cached pages and the whole set is smaller than one headshot.

   If the fetch fails the page falls back to plain links to the office pages, so nobody ends up
   at a dead end. */

const OFFICES = [
  { key: 'santa-clarita',         page: 'office-santa-clarita.html',         label: 'Santa Clarita Valley' },
  { key: 'los-angeles',           page: 'office-los-angeles.html',           label: 'Los Angeles' },
  { key: 'conejo-valley',         page: 'office-conejo-valley.html',         label: 'Conejo Valley' },
  { key: 'coachella-valley',      page: 'office-coachella-valley.html',      label: 'Coachella Valley West' },
  { key: 'coachella-valley-east', page: 'office-coachella-valley-east.html', label: 'Coachella Valley East' },
];

const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

function readOfficers(html, office) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('article.officer')).map((card) => {
    const img = card.querySelector('.officer__photo img');
    const tel = card.querySelector('a[href^="tel:"]');
    const mail = card.querySelector('a[href^="mailto:"]');
    const nameEl = card.querySelector('.officer__name');
    return {
      name: text(nameEl),
      // the title is the eyebrow sitting immediately after the name
      title: text(nameEl && nameEl.parentElement && nameEl.parentElement.querySelector('.eyebrow')),
      photo: img ? img.getAttribute('src') : '',
      initials: text(card.querySelector('.officer__initials')),
      phone: text(tel),
      tel: tel ? tel.getAttribute('href') : '',
      email: text(mail),
      mailto: mail ? mail.getAttribute('href') : '',
      bio: text(card.querySelector('.officer__bio p')),
      office: office.key,
      officeLabel: office.label,
      officePage: office.page,
    };
  });
}

function cardFor(o) {
  const face = o.photo
    ? `<div class="dir__photo"><img src="${o.photo}" alt="" loading="lazy" width="800" height="800"></div>`
    : `<div class="dir__photo dir__photo--none"><span class="officer__initials">${o.initials || o.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</span></div>`;
  const phone = o.tel ? `<a href="${o.tel}"><span class="ico" data-i="phone" style="font-size:13px"></span>${o.phone}</a>` : '';
  const email = o.mailto ? `<a href="${o.mailto}"><span class="ico" data-i="mail" style="font-size:13px"></span>${o.email}</a>` : '';
  return `<article class="dir__card">
    ${face}
    <div class="dir__body">
      <h2 class="dir__name">${o.name}</h2>
      <p class="dir__title">${o.title}</p>
      <a class="dir__office" href="${o.officePage}"><span class="ico" data-i="map-pin" style="font-size:12px"></span>${o.officeLabel}</a>
      <div class="dir__contact">${phone}${email}</div>
    </div>
  </article>`;
}

function initDirectory() {
  const grid = document.getElementById('dir-grid');
  if (!grid) return;
  const q = document.getElementById('dir-q');
  const count = document.getElementById('dir-count');
  const empty = document.getElementById('dir-empty');
  const fallback = document.getElementById('dir-fallback');
  const chips = Array.from(document.querySelectorAll('.dir__chip'));

  let all = [];
  let office = '';

  const render = () => {
    const term = q.value.trim().toLowerCase();
    const hits = all.filter((o) =>
      (!office || o.office === office) &&
      (!term || o.name.toLowerCase().includes(term) || o.title.toLowerCase().includes(term)));
    grid.innerHTML = hits.map(cardFor).join('');
    if (window.paintIcons) window.paintIcons(grid);
    empty.hidden = hits.length > 0;
    const scope = office ? ` in ${OFFICES.find((x) => x.key === office).label}` : '';
    count.textContent = hits.length === all.length && !term
      ? `${all.length} officers across five offices`
      : `${hits.length} of ${all.length}${scope}`;
  };

  q.addEventListener('input', render);
  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => c.classList.toggle('is-on', c === chip));
    office = chip.dataset.office;
    render();
  }));

  Promise.all(OFFICES.map((o) =>
    fetch(o.page)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((html) => readOfficers(html, o))
      .catch(() => [])
  )).then((sets) => {
    all = sets.flat().filter((o) => o.name);
    if (!all.length) {
      count.hidden = true;
      fallback.hidden = false;
      return;
    }
    all.sort((a, b) => a.name.localeCompare(b.name));
    render();
  });
}

document.addEventListener('DOMContentLoaded', initDirectory);
