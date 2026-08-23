# API endpoints

Three endpoints the front end will call if they exist. **All three are optional** — the site
degrades gracefully without them:

| Endpoint | Used by | Without it |
|---|---|---|
| `POST /api/chat` | `js/chat.js` | Assistant falls back to the grounded FAQ matcher, which runs entirely in the browser. Fully functional. |
| `POST /api/net-sheet` | `js/net-sheet.js` | "Email it to me" shows a message pointing at "Download PDF", which needs no server. |
| `POST /api/contact`, `POST /api/open-escrow` | form `action` attributes | Forms do a normal POST and 404. **Wire these before launch.** |

## Hosting choices

**Staying on SiteGround (simplest).** SiteGround runs PHP, not Node. Port `chat.js` to a small
PHP file that proxies to the Anthropic API, and use PHP `mail()` or SMTP for the form endpoints.
Nothing about the front end changes.

**Split hosting (recommended).** Serve the static files from SiteGround and put the three
functions on Vercel or Cloudflare Workers, then point `/api/*` at them with a proxy rule in
`.htaccess`. This keeps the API key off shared hosting and gives you real logs.

## Security notes

- `ANTHROPIC_API_KEY` must never appear in browser-delivered code. If you see it in
  `js/`, something has gone wrong.
- Rate-limit `/api/chat` per IP. An unmetered LLM endpoint on a public marketing site is a
  billing incident waiting to happen.
- `/api/open-escrow` accepts a PDF upload. Cap the size, verify the MIME type, and store
  outside the web root — purchase agreements contain personal financial information.
- Never accept or transmit wire instructions through any of these endpoints.
