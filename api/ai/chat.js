module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ assistantMessage: 'Method not allowed' });

  const { messages } = req.body || {};
  const userText = messages?.[messages.length - 1]?.content || '';
  
  return res.json({
    assistantMessage: `You said: "${userText}". How can I help?`,
    quickActions: [
      { text: 'Pricing', val: 'pricing' },
      { text: 'Book', val: 'booking' }
    ]
  });
};
