import { Router } from 'express';
import { processDialog } from '../state-machine/processor';

const router = Router();

router.post('/dialog', async (req, res) => {
  try {
    const response = await processDialog(req.body);
    res.json(response);
  } catch (error) {
    console.error('Dialog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;