import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "api-gateway" }));

// ترجمه‌های پاسخ‌ها
const responses = {
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

app.post("/api/ai/chat", async (req, res) => {
  const { messages, locale = 'en' } = req.body || {};
  
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ assistantMessage: 'Invalid request' });
  }

  const lang = responses[locale as keyof typeof responses] || responses.en;
  const userText = messages[messages.length - 1]?.content || '';
  const lower = userText.toLowerCase();
  
  let nav = null;
  let navName = '';
  
  if (/price|pricing|قیمت|preis|pris|precio/.test(lower)) {
    nav = 'pricing';
    navName = lang.actions.pricing;
  } else if (/feature|امکانات|funktion|función|características/.test(lower)) {
    nav = 'features';
    navName = lang.actions.features;
  } else if (/book|رزرو|buchen|boka|reservar/.test(lower)) {
    nav = 'booking';
    navName = lang.actions.book;
  }

  const message = [
    lang.understood,
    lang.youSaid(userText),
    nav ? lang.takeTo(navName) : lang.howHelp
  ].join(' ');

  res.json({
    assistantMessage: message,
    quickActions: [
      { text: lang.actions.pricing, val: 'pricing' },
      { text: lang.actions.features, val: 'features' },
      { text: lang.actions.book, val: 'booking' },
      { text: lang.actions.demo, val: 'demo' }
    ],
    nav
  });
});

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => console.log(`[api-gateway] listening on :${port}`));