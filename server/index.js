import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runAgent } from './agent.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const reply = await runAgent(messages);
    res.json({ reply });
  } catch (err) {
    console.error('Agent error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Rev server running on http://localhost:${PORT}`);
});
