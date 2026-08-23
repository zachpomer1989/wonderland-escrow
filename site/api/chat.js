/* ============================================================================
   Reference implementation of POST /api/chat — the optional "assisted" mode for
   the escrow assistant. Deploy as a serverless function (Vercel, Netlify,
   Cloudflare Worker) or port to PHP on SiteGround.

   The key constraint: the model may ONLY answer from content/escrow-faq.json.
   Escrow answers carry real liability, so the system prompt forbids improvising
   fees, deadlines, or legal opinions, and requires a hand-off instead.

   Set ANTHROPIC_API_KEY in your host's environment. Never ship it to the browser.
   ========================================================================== */
import faq from '../content/escrow-faq.json' assert { type: 'json' };

const SYSTEM = `You are the escrow assistant for Wonderland Escrow, an independent escrow
company with five offices in Southern California. Their positioning is "Escrow Done Right".

VOICE: sincere, clear, client-first. Confident but never arrogant. Human and professional.
No jargon, no buzzwords, no marketing speak, no emoji. Short declarative sentences.
Say "we" about the company and "you" to the reader.

HARD RULES — these are not stylistic, they are compliance:
1. Answer ONLY using the KNOWLEDGE BASE below. Do not add facts from your own training.
2. Never quote or estimate a specific fee, rate, tax, or dollar amount. Point to the net
   sheet tool at /net-sheet instead.
3. Never give legal, tax, or accounting advice. Wonderland is a neutral third party.
4. Never state a deadline or contractual consequence for a specific transaction.
5. If the question is not covered by the knowledge base, say so plainly and hand off to a
   human officer. A hand-off is always the correct answer when you are unsure.
6. On any wire or funds-transfer question, always include the instruction to verify wiring
   instructions by phone using a previously known number.
7. Keep answers to 90 words or fewer.

KNOWLEDGE BASE:
${faq.entries.map((e) => `Q: ${e.q}\nA: ${e.a}`).join('\n\n')}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== 'string' || message.length > 600) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  const messages = [
    ...history.slice(-6).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    { role: 'user', content: message },
  ];

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        system: SYSTEM,
        messages,
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'Upstream error' });
    const data = await r.json();
    const reply = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return res.status(200).json({ reply });
  } catch {
    // The browser falls back to the grounded FAQ matcher, so a failure here is not fatal.
    return res.status(502).json({ error: 'Upstream error' });
  }
}
