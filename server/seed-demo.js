/**
 * Seeds demo conversations for the admin panel.
 * Run with: node seed-demo.js
 */
import 'dotenv/config';
import pool from './db.js';
import { randomBytes } from 'crypto';

function id(prefix) {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}

const customers = [
  { name: 'Alex Martinez', email: 'alex@example.com' },
  { name: 'Jordan Kim', email: 'jordan.kim@example.com' },
  { name: 'Sam Torres', email: 'sam.torres@example.com' },
  { name: 'Casey Rivera', email: 'casey@example.com' },
  { name: 'Morgan Lee', email: 'morgan.lee@example.com' },
];

const conversations = [
  {
    status: 'escalated',
    priority: 'high',
    sentiment: 'negative',
    reason: 'Customer requesting refund for damaged item, very frustrated, multiple follow-ups',
    messages: [
      { role: 'user', content: "I received my order and the steering wheel is cracked. This is completely unacceptable." },
      { role: 'assistant', content: "I'm so sorry to hear that — a cracked steering wheel is definitely not okay. Let me look into this right away.", tool_calls: [{ tool: 'lookup_order', input: { identifier: 'NRG-10042' }, result: { found: true, order: { id: 'NRG-10042', status: 'Delivered' } } }] },
      { role: 'user', content: "I want a refund NOW. I've been waiting for 2 weeks and this is what I get?" },
      { role: 'assistant', content: "I completely understand your frustration and I sincerely apologize. I'm escalating this to our team immediately.", tool_calls: [{ tool: 'escalate_to_human', input: { reason: 'Customer requesting refund for damaged item', sentiment: 'negative', priority: 'high' }, result: { success: true } }] },
      { role: 'user', content: "I just want my money back, this is ridiculous..." },
    ],
    escalated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    status: 'active',
    priority: 'medium',
    sentiment: null,
    messages: [
      { role: 'user', content: "Hi, what's the difference between the 2.0 and 3.0 quick release?" },
      { role: 'assistant', content: "Great question! The NRG 2.0 uses a push-button mechanism and is our most popular pick for street builds. The 3.0 uses a rotating collar for a more race-grade feel with slightly more resistance.", tool_calls: [{ tool: 'search_products', input: { query: 'quick release', category: 'quick_releases' }, result: { products: [] } }] },
      { role: 'user', content: "Which one works with a 350mm steering wheel?" },
      { role: 'assistant', content: "Both are compatible with any 350mm wheel using the standard Momo/6-bolt pattern. The 2.0 is the sweet spot for most builds at $79 — the 3.0 at $115 is better if you're tracking the car regularly." },
    ],
  },
  {
    status: 'resolved',
    priority: 'low',
    sentiment: 'positive',
    messages: [
      { role: 'user', content: "Where is my order NRG-10051?" },
      { role: 'assistant', content: "Your order NRG-10051 is currently processing — it was placed on March 1st. You should receive a tracking number within 1-2 business days!", tool_calls: [{ tool: 'lookup_order', input: { identifier: 'NRG-10051' }, result: { found: true } }] },
      { role: 'user', content: "Awesome, thanks so much!" },
      { role: 'assistant', content: "Of course! Happy to help. Let us know if you need anything else — excited for you to get that wheel on the car! 🏁" },
    ],
    resolved_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    status: 'escalated',
    priority: 'medium',
    sentiment: 'neutral',
    reason: 'Customer wants to exchange for different size, complex fitment issue',
    messages: [
      { role: 'user', content: "I ordered a short hub but I'm not sure it fits my car. I have a 2005 Honda S2000." },
      { role: 'assistant', content: "Good news — we have a short hub specifically for the Honda RSX 02-06 and S2000 00-09. That part number is HUB-H25 and it should fit your 2005 S2000 perfectly.", tool_calls: [{ tool: 'search_products', input: { query: 'short hub S2000', category: 'short_hubs' }, result: { products: [] } }] },
      { role: 'user', content: "I already ordered one and it doesn't fit. Can I exchange it?" },
      { role: 'assistant', content: "I'm sorry to hear that! For exchange requests, I'll connect you with our team who can walk through fitment details and arrange the swap.", tool_calls: [{ tool: 'escalate_to_human', input: { reason: 'Customer wants to exchange short hub due to fitment issue', sentiment: 'neutral', priority: 'medium' }, result: { success: true } }] },
    ],
    escalated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    status: 'active',
    priority: 'low',
    sentiment: null,
    messages: [
      { role: 'user', content: "Do you sell racing seats?" },
      { role: 'assistant', content: "Absolutely! NRG has a great lineup of racing seats. Our FRP Fiberglass & Suede Bolster Bucket is a popular track-ready option, and the Echelon Bucket Seat is perfect for daily drivers who want a sporty look.", tool_calls: [{ tool: 'search_products', input: { query: 'racing seat', category: 'seats' }, result: { products: [] } }] },
    ],
  },
];

async function seedDemo() {
  for (let i = 0; i < customers.length; i++) {
    const cust = customers[i];
    const convData = conversations[i];
    if (!convData) continue;

    // Create customer
    const { rows: custRows } = await pool.query(
      `INSERT INTO customers (name, email, session_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [cust.name, cust.email, `demo_${i}`]
    );
    const customerId = custRows[0].id;

    // Create conversation
    const convId = id('conv');
    await pool.query(
      `INSERT INTO conversations (id, customer_id, status, priority, escalation_reason, escalated_at, resolved_at, customer_sentiment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        convId,
        customerId,
        convData.status,
        convData.priority,
        convData.reason || null,
        convData.escalated_at || null,
        convData.resolved_at || null,
        convData.sentiment,
      ]
    );

    // Create messages
    for (const msg of convData.messages) {
      await pool.query(
        `INSERT INTO messages (id, conversation_id, role, content, tool_calls)
         VALUES ($1, $2, $3, $4, $5)`,
        [id('msg'), convId, msg.role, msg.content, msg.tool_calls ? JSON.stringify(msg.tool_calls) : null]
      );
    }

    console.log(`Seeded: ${cust.name} (${convData.status})`);
  }

  console.log('Demo data seeded.');
  await pool.end();
}

seedDemo().catch(err => { console.error(err); process.exit(1); });
