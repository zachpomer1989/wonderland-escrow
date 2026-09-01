# Wonderland Escrow — website

Production source for wonderlandescrow.com. Static multi-page site, no build step.

> This repository also carries the **Wonderland Escrow design system** at the root —
> see [`readme.md`](readme.md) for the brand guide, tokens, components and content rules.
> `site/` is the website that consumes it.

**Escrow Done Right · Southern California's Top-Reviewed Escrow Company**

---

## Why this stack

The previous site was WordPress + Divi. This is plain HTML, one CSS system, and vanilla JS
modules, because for a marketing site with a calculator and a chat widget that is strictly
better:

- **SEO.** Every page is real server-delivered HTML with hand-written meta tags and JSON-LD.
  Nothing depends on JavaScript to render, so nothing depends on Google executing it.
- **Speed.** No PHP, no database, no plugin stack. The pages are files.
- **Nothing to rot.** No build tooling, no dependency tree, no framework upgrade treadmill.
  Open a `.html` file, edit it, push.
- **Deployment stays simple.** `site/` is the web root. FTP it, or let the GitHub Action do it.

The one thing that genuinely needs a server is the chatbot's API key. See `site/api/README.md`.

## Layout

```
site/                        ← this folder IS the web root
├── index.html               home
├── net-sheet.html           the net sheet tool
├── locations.html           offices hub
├── office-*.html            4 office/team pages
├── escrow-101.html          FAQ content + FAQPage schema
├── contact.html
├── open-escrow.html         new transaction intake
├── about|careers|wire-fraud|privacy|terms.html   ← placeholders, noindex
├── css/
│   ├── wonderland.css       entry point (@import list only)
│   ├── site.css             all page-level layout
│   ├── net-sheet.css        tool layout + print/PDF rules
│   └── tokens/*.css         design-system tokens — DO NOT edit by hand
├── js/
│   ├── site.js              icons, nav, scroll reveals
│   ├── fee-schedule.js      ⚠️ ALL net sheet numbers live here
│   ├── net-sheet.js         calculator (no hard-coded dollars)
│   └── chat.js              escrow assistant widget
├── content/escrow-faq.json  chatbot knowledge base + Escrow 101 source
├── api/                     reference serverless functions (not deployed by the Action)
├── assets/logos/            all brand lockups, light + dark + per-office
├── .htaccess                clean URLs, HTTPS, compression, caching, headers
├── robots.txt · sitemap.xml
```

`css/tokens/` is copied from the Wonderland Escrow design system. If the brand palette or type
scale changes, update it there and re-copy — don't diverge them.

## Editing the things you'll actually want to edit

| To change… | Edit |
|---|---|
| Any net sheet fee, rate, or tax | `site/js/fee-schedule.js` — the only file with dollar amounts |
| What the chatbot knows or says | `site/content/escrow-faq.json` (also regenerates Escrow 101 content) |
| Escrow 101 questions | same file — the page and its schema are generated from it |
| Team rosters, phone numbers, bios | the relevant `site/office-*.html` |
| Brand colors, type, spacing | the design system, then re-copy `css/tokens/` |
| Nav or footer | they're duplicated per page — search and replace, or ask Claude |

## Local preview

No tooling required, but use a server so `fetch` and ES modules work:

```bash
cd site && python3 -m http.server 8080   # → http://localhost:8080
```

## Deploying

`.github/workflows/deploy.yml` rsyncs `site/` to SiteGround over SFTP on every push to `main`.
Add these repository secrets first (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `SG_HOST` | SiteGround SFTP host, e.g. `giowg1234.siteground.biz` |
| `SG_USER` | SFTP username |
| `SG_KEY` | private key (public half goes in SiteGround → SSH Keys Manager) |
| `SG_PORT` | usually `18765` |
| `SG_PATH` | e.g. `/home/customer/www/wonderlandescrow.com/public_html` |

**Do a dry run first.** Set `DRY_RUN: "--dry-run"` in the workflow, push, read the log, then
remove it. The workflow uses `--delete`, so a wrong `SG_PATH` will delete files.

The workflow also fails the build if an Anthropic key ever appears in client-delivered code.

### Cache busting

Every `css`/`js` reference is written as `…?v=dev` in the repo, and the deploy workflow
rewrites that placeholder to the deploy commit's short SHA before it rsyncs. That includes the
`@import` list in `css/wonderland.css` — `site.css` is only reachable through it, so versioning
the `<link>` alone would not help — and the `./fee-schedule.js` module import.

This matters because **SiteGround serves static files from nginx, which ignores `.htaccess`**
and caches css/js for a year regardless of what the `mod_expires` block says. Without the
version query, a returning visitor keeps stale assets and never sees a deploy.

If you add a new stylesheet or script, reference it as `whatever.css?v=dev` so the workflow
picks it up. The build fails if a `?v=dev` placeholder survives the stamp.

## Before launch — open items

1. **⚠️ Every number in `js/fee-schedule.js` is a placeholder** based on typical Southern
   California practice. Replace with Wonderland's published escrow fee schedule and your title
   underwriter's current rate card. **The city transfer taxes need legal review** — they change
   by ballot measure and the Los Angeles figures in particular carry real exposure.
2. **Wire up the form endpoints.** `/api/contact` and `/api/open-escrow` currently 404. See
   `site/api/README.md`.
3. **Photography — needs full-resolution office exteriors.** Every image is hot-linked to the old
   WordPress uploads directory rather than served locally. Two specific gaps:

   - **Office hero photos are too small for a full-bleed band.** The largest files that exist on
     wonderlandescrow.com are 1000x686 (Los Angeles), 800x534 (Conejo Valley) and 1000x668
     (Coachella Valley) — all below the 1920px a full-width hero wants, so they upscale on large
     monitors. A deepened scrim currently masks this, but the real fix is new photography.
     Santa Clarita is fine. Marked in the markup with `data-lowres="true"` — search for it.
   - **Innesa Naboyshchikova (Los Angeles) has no headshot and no bio.** Her bio on the live site
     is a verbatim duplicate of Hasmik Sogomonyan's, so it was not copied; she renders as initials.

   Drop real files into `assets/photography/`, repoint, and remove the `data-lowres` attributes.
4. **Legal pages.** `privacy.html` and `terms.html` are placeholders marked `noindex`. Paste in
   your current counsel-reviewed text.
5. **Icons come from the Lucide CDN.** Fine for launch; vendor them into `assets/icons/` and
   change `ICON_BASE` in `js/site.js` if you'd rather not depend on unpkg.
6. **Verify the Ana Sanchez direct line.** The brand collateral shows both `760.688.7070` and
   `760.668.7070`. The site currently uses `760.688.7070`.
7. **301 redirects.** Map the old Divi URLs (e.g. `/wonderland-escrow-santa-clarita-2/`) to the
   new ones in `.htaccess` before you cut over, or you will drop the rankings you already have.

## Fonts

Sabon and Avenir stream from the brand's Adobe Fonts kit `pbd5rdb`, declared as `@font-face`
in `css/tokens/fonts.css`. The kit currently publishes only Roman (400) and Bold (700) — the
brand guidelines call for Avenir 65 Medium, 85 Heavy and 95 Black, so those weight tokens
collapse to Bold. Adding 65/85/95 to the kit fixes it with no code change.
