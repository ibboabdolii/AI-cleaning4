import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  sessionId?: string;
  locale?: string;
  tenantId?: string;
  context?: Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ assistantMessage: 'Method not allowed' });
  }

  try {
    const body = req.body as ChatRequest;
    
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ assistantMessage: 'Invalid request: messages required' });
    }

    const lastMessage = body.messages[body.messages.length - 1];
    const userText = String(lastMessage?.content || '').trim();
    const locale = body.locale || 'en';
    
    if (!userText) {
      return res.status(400).json({ assistantMessage: 'Message content required' });
    }

    const lower = userText.toLowerCase();
    let nav: string | undefined;
    let assistantMessage = '';

    if (/\b(price|pricing|cost|plan)\b/.test(lower)) {
      nav = 'pricing';
      assistantMessage = locale === 'de' 
        ? 'Ich leite Sie zur Preisseite weiter.' 
        : 'I can take you to our Pricing page.';
    } else if (/\b(feature|capability|funktion|función)\b/.test(lower)) {
      nav = 'features';
      assistantMessage = locale === 'de'
        ? 'Hier sind unsere Funktionen.'
        : 'Here are our key features.';
    } else if (/\b(book|booking|schedule|appointment|städ|reservar)\b/.test(lower)) {
      nav = 'booking';
      assistantMessage = locale === 'de'
        ? 'Lassen Sie uns Ihre Reinigung planen.'
        : 'Let me help you schedule a cleaning.';
    } else if (/\b(demo|contact|sales)\b/.test(lower)) {
      assistantMessage = locale === 'de'
        ? 'Ich öffne das Demo-Formular für Sie.'
        : 'I can open the demo request form for you.';
    } else {
      assistantMessage = locale === 'de'
        ? `Verstanden. Sie sagten: "${userText}". Wie kann ich helfen?`
        : `Understood. You said: "${userText}". How can I help?`;
    }

    const quickActions = [
      { text: locale === 'de' ? 'Preise' : 'Pricing', val: 'pricing' },
      { text: locale === 'de' ? 'Funktionen' : 'Features', val: 'features' },
      { text: locale === 'de' ? 'Buchen' : 'Book', val: 'booking' },
      { text: locale === 'de' ? 'Demo' : 'Demo', val: 'demo' }
    ];

    const sessionId = body.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return res.status(200).json({
      assistantMessage,
      sessionId,
      quickActions,
      nav
    });

  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({
      assistantMessage: 'Internal server error. Please try again.'
    });
  }
}
