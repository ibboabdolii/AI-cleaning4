'use strict';

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/ai/chat', async (req, res) => {
  try {
    const body = req.body || {};
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ assistantMessage: 'Invalid request: messages[] required.' });
    }

    const last = messages[messages.length - 1];
    const userText = typeof last?.content === 'string' ? last.content : '';
    if (!userText.trim()) {
      return res.status(400).json({ assistantMessage: 'Invalid request: last message content required.' });
    }

    const lower = userText.toLowerCase();
    let nav = null;
    if (/(price|pricing|cost)/.test(lower)) nav = 'pricing';
    else if (/(feature|capabilit)/.test(lower)) nav = 'features';
    else if (/(book|booking|schedule)/.test(lower)) nav = 'booking';

    const assistantMessage =
      `Understood. You said: "${userText}". ` +
      (nav ? `I can take you to ${nav}.` : 'Ask me about pricing, features, or booking.');

    return res.json({
      assistantMessage,
      quickActions: [
        { text: 'Pricing', val: 'pricing' },
        { text: 'Features', val: 'features' },
        { text: 'Book', val: 'booking' }
      ],
      nav
    });
  } catch (e) {
    return res.status(500).json({ assistantMessage: 'Error occurred' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on :${PORT}`));
