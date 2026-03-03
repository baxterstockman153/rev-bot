import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runAgent } from './agent.js';
import adminRouter from './routes/admin.js';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Verify DB connection on startup
pool.query('SELECT 1').then(() => {
  console.log('Database connected.');
}).catch(err => {
  console.error('Database connection failed:', err.message);
  console.error('Conversations will NOT be saved. Start Postgres and restart the server.');
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

// Customer chat route
app.post('/api/chat', async (req, res) => {
  const { messages, conversationId, sessionId } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const result = await runAgent(messages, conversationId, sessionId);
    res.json(result);
  } catch (err) {
    console.error('Agent error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Admin routes
app.use('/api/admin', adminRouter);

app.listen(PORT, () => {
  console.log(`Rev server running on http://localhost:${PORT}`);
});
