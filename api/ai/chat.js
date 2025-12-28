module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ assistantMessage: 'Method not allowed' });

  const { messages, locale = 'en' } = req.body || {};
  const userText = messages?.[messages.length - 1]?.content || '';
  
  let nav = null;
  if (/price|pricing/i.test(userText)) nav = 'pricing';
  else if (/feature/i.test(userText)) nav = 'features';
  else if (/book/i.test(userText)) nav = 'booking';

  return res.json({
    assistantMessage: `Understood. You said: "${userText}". How can I help?`,
    quickActions: [
      { text: 'Pricing', val: 'pricing' },
      { text: 'Features', val: 'features' },
      { text: 'Book', val: 'booking' }
    ],
    nav
  });
};
