import type { VercelRequest, VercelResponse } from '@vercel/node';

type ChatResponse = {
  ok: boolean;
  sessionId: string;
  message: { role: 'assistant'; text: string };
  quickReplies?: { id: string; label: string; value: string }[];
  nav?: { label: string; href: string }[];
  error?: { code: string; message: string };
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      sessionId: '',
      error: { code: 'method_not_allowed', message: 'Method not allowed' }
    } as ChatResponse);
  }

  const { messages, sessionId } = (req.body || {}) as { messages?: unknown; sessionId?: unknown };
  const session = typeof sessionId === 'string' && sessionId ? sessionId : `s-${Date.now()}`;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({
      ok: false,
      sessionId: session,
      error: { code: 'invalid_request', message: 'messages array is required' }
    } as ChatResponse);
  }

  const latest = messages[messages.length - 1] as { text?: unknown; content?: unknown };
  const text = String(latest?.text || latest?.content || '').trim();
  const lower = text.toLowerCase();
  let assistantMessage = text ? `You said: "${text}". How can I help?` : 'How can I assist with your booking?';
  let navLink: ChatResponse['nav'];

  if (/price|pricing/.test(lower)) {
    assistantMessage = 'I can guide you to pricing.';
    navLink = [{ label: 'Pricing', href: '/pricing' }];
  } else if (/feature/.test(lower)) {
    assistantMessage = 'Here are our key features.';
    navLink = [{ label: 'Features', href: '/features' }];
  } else if (/book/.test(lower)) {
    assistantMessage = 'Ready to book? I can help finalize details.';
    navLink = [{ label: 'Booking', href: '/book' }];
  }

  const body: ChatResponse = {
    ok: true,
    sessionId: session,
    message: { role: 'assistant', text: assistantMessage },
    quickReplies: [
      { id: 'pricing', label: 'Pricing', value: 'pricing' },
      { id: 'features', label: 'Features', value: 'features' },
      { id: 'book', label: 'Book a cleaning', value: 'book' }
    ],
    nav: navLink
  };

  return res.status(200).json(body);
}
