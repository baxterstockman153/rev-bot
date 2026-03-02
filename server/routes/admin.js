import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM admin_users WHERE email = $1',
    [email]
  );
  const admin = rows[0];
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: 'admin' },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
});

// GET /api/admin/conversations
router.get('/conversations', requireAdmin, async (req, res) => {
  const {
    status = 'all',
    sort = 'created_at',
    order = 'desc',
    search = '',
    page = '1',
    limit = '25',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const allowedSorts = {
    created_at: 'c.created_at',
    escalated_at: 'c.escalated_at',
    message_count: 'message_count',
    sentiment: 'c.customer_sentiment',
  };
  const sortCol = allowedSorts[sort] || 'c.created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const conditions = [];
  const params = [];

  if (status !== 'all') {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(cu.name ILIKE $${params.length} OR cu.email ILIKE $${params.length})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      c.id,
      c.status,
      c.priority,
      c.customer_sentiment,
      c.escalation_reason,
      c.escalated_at,
      c.assigned_agent,
      c.created_at,
      c.updated_at,
      cu.name AS customer_name,
      cu.email AS customer_email,
      COUNT(m.id)::int AS message_count,
      MAX(m.created_at) AS last_message_at,
      (
        SELECT m2.content
        FROM messages m2
        WHERE m2.conversation_id = c.id
        ORDER BY m2.created_at DESC
        LIMIT 1
      ) AS last_message_content
    FROM conversations c
    LEFT JOIN customers cu ON c.customer_id = cu.id
    LEFT JOIN messages m ON m.conversation_id = c.id
    ${where}
    GROUP BY c.id, cu.name, cu.email
    ORDER BY ${sortCol} ${sortOrder} NULLS LAST
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  params.push(limitNum, offset);

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM conversations c
    LEFT JOIN customers cu ON c.customer_id = cu.id
    ${where}
  `;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, params.length - 2)),
  ]);

  const conversations = rows.map(r => ({
    id: r.id,
    customer: { name: r.customer_name, email: r.customer_email },
    status: r.status,
    priority: r.priority,
    customer_sentiment: r.customer_sentiment,
    escalation_reason: r.escalation_reason,
    message_count: r.message_count,
    last_message_preview: r.last_message_content
      ? r.last_message_content.slice(0, 100)
      : null,
    last_message_at: r.last_message_at,
    escalated_at: r.escalated_at,
    assigned_agent: r.assigned_agent,
    created_at: r.created_at,
  }));

  res.json({
    conversations,
    total: countRows[0].total,
    page: pageNum,
    limit: limitNum,
  });
});

// GET /api/admin/conversations/:id
router.get('/conversations/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const [convResult, msgResult] = await Promise.all([
    pool.query(
      `SELECT c.*, cu.name AS customer_name, cu.email AS customer_email
       FROM conversations c
       LEFT JOIN customers cu ON c.customer_id = cu.id
       WHERE c.id = $1`,
      [id]
    ),
    pool.query(
      `SELECT id, role, content, tool_calls, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    ),
  ]);

  if (convResult.rows.length === 0) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const conv = convResult.rows[0];
  res.json({
    conversation: {
      id: conv.id,
      customer: { name: conv.customer_name, email: conv.customer_email },
      status: conv.status,
      priority: conv.priority,
      customer_sentiment: conv.customer_sentiment,
      escalation_reason: conv.escalation_reason,
      escalated_at: conv.escalated_at,
      assigned_agent: conv.assigned_agent,
      resolved_at: conv.resolved_at,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
    },
    messages: msgResult.rows.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls,
      created_at: m.created_at,
    })),
  });
});

// PATCH /api/admin/conversations/:id
router.patch('/conversations/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, assigned_agent } = req.body;

  const fields = [];
  const params = [];

  if (status) {
    params.push(status);
    fields.push(`status = $${params.length}`);
    if (status === 'resolved') {
      fields.push(`resolved_at = NOW()`);
    }
  }

  if (assigned_agent !== undefined) {
    params.push(assigned_agent);
    fields.push(`assigned_agent = $${params.length}`);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE conversations SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ conversation: rows[0] });
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      ROUND(
        (SELECT COUNT(*)::numeric FROM messages) /
        NULLIF(COUNT(*), 0),
        1
      ) AS avg_messages_per_conversation
    FROM conversations
  `);

  res.json(rows[0]);
});

// GET /api/admin/agents - list admin users for assignment dropdown
router.get('/agents', requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email FROM admin_users ORDER BY name');
  res.json({ agents: rows });
});

export default router;
