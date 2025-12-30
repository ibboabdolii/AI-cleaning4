import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { messages, message } = req.body || {};
  const incomingMessages = Array.isArray(messages) && messages.length ? messages : message ? [{ content: message }] : [];
  if (!incomingMessages.length) {
    return res.status(400).json({ ok: false, error: 'Invalid request' });
  }

  const text = incomingMessages[incomingMessages.length - 1]?.content || '';
  const lower = text.toLowerCase();
  let nav;
  let assistantMessage = 'I can help with pricing, features, or booking details. What would you like to do?';
  
  if (/price|pricing/.test(lower)) {
    nav = 'pricing';
    assistantMessage = 'I can take you to our Pricing page.';
  } else if (/feature/.test(lower)) {
    nav = 'features';
    assistantMessage = 'Here are our key features.';
  } else if (/book/.test(lower)) {
    nav = 'booking';
    assistantMessage = 'Let me help you schedule a cleaning.';
  }

  return res.json({
    ok: true,
    reply: {
      text: assistantMessage,
      quickReplies: ['Pricing', 'Features'],
      cards: nav ? [{ type: `${nav}_card`, title: nav }] : undefined
    }
  });
}
