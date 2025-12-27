import type { VercelRequest, VercelResponse } from '@vercel/node';

const responses: Record<string, any> = {
  en: {
    understood: "Understood.",
    youSaid: (text: string) => `You said: "${text}".`,
    howHelp: "How can I help?",
    takeTo: (page: string) => `I can take you to ${page}.`,
    actions: { pricing: 'Pricing', features: 'Features', book: 'Book', demo: 'Request Demo' }
  },
  de: {
    understood: "Verstanden.",
    youSaid: (text: string) => `Sie sagten: "${text}".`,
    howHelp: "Wie kann ich helfen?",
    takeTo: (page: string) => `Ich kann Sie zu ${page} bringen.`,
    actions: { pricing: 'Preise', features: 'Funktionen', book: 'Buchen', demo: 'Demo anfordern' }
  },
  sv: {
    understood: "Uppfattat.",
    youSaid: (text: string) => `Du sa: "${text}".`,
    howHelp: "Hur kan jag hjälpa?",
    takeTo: (page: string) => `Jag kan ta dig till ${page}.`,
    actions: { pricing: 'Priser', features: 'Funktioner', book: 'Boka', demo: 'Begär demo' }
  },
  es: {
    understood: "Entendido.",
    youSaid: (text: string) => `Dijiste: "${text}".`,
    howHelp: "¿Cómo puedo ayudar?",
    takeTo: (page: string) => `Puedo llevarte a ${page}.`,
    actions: { pricing: 'Precios', features: 'Características', book: 'Reservar', demo: 'Solicitar demo' }
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ assistantMessage: 'Method not allowed' });

  const { messages, locale = 'en' } = req.body || {};
  
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ assistantMessage: 'Invalid request' });
  }

  const lang = responses[locale] || responses.en;
  const userText = messages[messages.length - 1]?.content || '';
  const lower = userText.toLowerCase();
  
  let nav = null;
  let navName = '';
  
  if (/price|pricing|preis|pris|precio/.test(lower)) {
    nav = 'pricing';
    navName = lang.actions.pricing;
  } else if (/feature|funktion|función|características/.test(lower)) {
    nav = 'features';
    navName = lang.actions.features;
  } else if (/book|buchen|boka|reservar/.test(lower)) {
    nav = 'booking';
    navName = lang.actions.book;
  }

  const message = [
    lang.understood,
    lang.youSaid(userText),
    nav ? lang.takeTo(navName) : lang.howHelp
  ].join(' ');

  return res.json({
    assistantMessage: message,
    quickActions: [
      { text: lang.actions.pricing, val: 'pricing' },
      { text: lang.actions.features, val: 'features' },
      { text: lang.actions.book, val: 'booking' },
      { text: lang.actions.demo, val: 'demo' }
    ],
    nav
  });
}