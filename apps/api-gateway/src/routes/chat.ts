import { Router } from 'express';
import { handleChatMessage } from '../services/chat-service';

const router = Router();

router.post('/ai/chat', async (req, res) => {
  try {
    const { tenantId, locale, messages, sessionId } = req.body;

    if (!tenantId || !locale || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      return res.status(400).json({ error: 'No message content' });
    }

    const response = await handleChatMessage({
      tenantId,
      locale,
      utterance: lastMessage.content,
      sessionId: sessionId || undefined,
    });

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;