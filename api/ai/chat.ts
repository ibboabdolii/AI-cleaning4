import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      sessionId: '',
      error: { code: 'method_not_allowed', message: 'Method not allowed' }
    });
  }

  const { messages, sessionId } = req.body || {};
  const session = typeof sessionId === 'string' && sessionId ? sessionId : `s-${Date.now()}`;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({
      ok: false,
      sessionId: session,
      error: { code: 'invalid_request', message: 'Messages array is required.' }
    });
  }

  const text = String(messages[messages.length - 1]?.text || messages[messages.length - 1]?.content || '').trim();
  const lower = text.toLowerCase();
  let assistantMessage = `You said: "${text}". How can I help?`;
  let navLink;
  if (/price|pricing/.test(lower)) {
    navLink = { label: 'Pricing', href: '/pricing' };
    assistantMessage = 'I can take you to our Pricing page.';
  } else if (/feature/.test(lower)) {
    navLink = { label: 'Features', href: '/features' };
    assistantMessage = 'Here are our key features.';
  } else if (/book/.test(lower)) {
    navLink = { label: 'Booking', href: '/book' };
    assistantMessage = 'Let me help you schedule a cleaning.';
  }

  return res.json({
    ok: true,
    sessionId: session,
    message: { role: 'assistant', text: assistantMessage },
    quickReplies: [
      { id: 'pricing', label: 'Pricing', value: 'pricing' },
      { id: 'features', label: 'Features', value: 'features' }
    ],
    nav: navLink ? [navLink] : undefined
  });
}
