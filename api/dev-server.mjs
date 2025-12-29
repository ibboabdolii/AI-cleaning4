import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/ai/chat', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { message, messages, sessionId } = req.body || {};
  const collected = Array.isArray(messages) && messages.length ? messages : message ? [{ content: message }] : [];
  if (!collected.length || !collected[collected.length - 1]?.content) {
    return res.status(400).json({ assistantMessage: 'Invalid request' });
  }

  const text = collected[collected.length - 1].content || '';
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
    assistantMessage,
    sessionId: sessionId || `s-${Date.now()}`,
    quickActions: [
      { text: 'Pricing', val: 'pricing' },
      { text: 'Features', val: 'features' }
    ],
    nav
  });
});

app.options('/api/ai/chat', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.status(200).end();
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`[dev-api] listening on http://localhost:${port}`);
});
