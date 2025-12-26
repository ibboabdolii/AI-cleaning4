'use strict';

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Basic security headers (minimal, demo-friendly) ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Note: A strict CSP would require handling inline scripts & Tailwind CDN.
  next();
});

// --- Body parsing ---
app.use(express.json({ limit: '1mb' }));

// --- Tiny in-memory rate limiting (demo) ---
const hits = new Map(); // ip -> { count, ts }
app.use((req, res, next) => {
  if (req.path !== '/api/ai/chat') return next();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15_000; // 15s
  const max = 25;          // 25 requests / 15s / ip

  const entry = hits.get(ip) || { count: 0, ts: now };
  if (now - entry.ts > windowMs) {
    entry.count = 0;
    entry.ts = now;
  }
  entry.count += 1;
  hits.set(ip, entry);

  if (entry.count > max) {
    return res.status(429).json({ assistantMessage: 'Rate limit: please slow down.' });
  }
  next();
});

// --- Static site ---
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '0',
  etag: true
}));

app.get('/health', (req, res) => res.json({ ok: true }));

// --- AI endpoint ---
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { tenantId, locale, channel, messages, context } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ assistantMessage: 'Invalid request: messages[] is required.' });
    }

    const last = messages[messages.length - 1];
    const userText = String(last?.content || '').trim();

    // Basic intent routing (mock)
    const lower = userText.toLowerCase();
    let nav = null;

    if (/\bprice|pricing|cost|plan\b/.test(lower)) nav = 'pricing';
    else if (/\bfeature|capabilit|funktion|funcion|funktioner\b/.test(lower)) nav = 'features';
    else if (/\bbook|booking|schedule|appointment|städ|reservar\b/.test(lower)) nav = 'booking';

    // Build a helpful assistant response
    const assistantMessage = buildMockAssistantMessage({ tenantId, locale, channel, userText, context, nav });

    // Quick actions
    const quickActions = [
      { text: 'Pricing', val: 'pricing' },
      { text: 'Features', val: 'features' },
      { text: 'Book', val: 'booking' },
      { text: 'Request Demo', val: 'demo' }
    ];

    return res.json({
      assistantMessage,
      quickActions,
      nav
    });

  } catch (e) {
    console.error('AI endpoint error:', e);
    return res.status(500).json({ assistantMessage: 'Server error. Please try again.' });
  }
});

function buildMockAssistantMessage({ tenantId, locale, channel, userText, context, nav }) {
  const route = context?.route || 'home';
  const lang = (locale || 'en').toLowerCase();

  const prefixByLang = {
    en: 'Understood.',
    de: 'Verstanden.',
    sv: 'Uppfattat.',
    es: 'Entendido.'
  };

  const prefix = prefixByLang[lang] || prefixByLang.en;

  let nextHint = '';
  if (nav === 'pricing') nextHint = 'I can take you to Pricing.';
  if (nav === 'features') nextHint = 'I can take you to Features.';
  if (nav === 'booking') nextHint = 'I can take you to Booking.';

  // Keep it deterministic + business-like (mock)
  return [
    `${prefix} You said: "${userText}".`,
    `Context: route=${route}, tenant=${tenantId || 'demo'}, channel=${channel || 'web'}.`,
    nextHint ? nextHint : 'Ask me about pricing, features, or booking.'
  ].filter(Boolean).join(' ');
}

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CleanAI demo running on http://localhost:${PORT}`);
});
