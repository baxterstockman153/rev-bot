import Anthropic from '@anthropic-ai/sdk';
import { toolDefinitions, executeTool } from './tools.js';
import pool from './db.js';
import { randomBytes } from 'crypto';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Rev, a customer service agent for NRG Innovations (getnrg.com), a leading aftermarket automotive parts brand based in Irwindale, CA. NRG specializes in steering wheels, quick releases, short hubs, racing seats, and shift knobs.

You have three tools: lookup_order, search_products, and escalate_to_human. Use them whenever a customer asks about an order or a product.

Be knowledgeable, warm, and concise. You are passionate about cars and motorsport. Keep responses to 2-4 sentences unless more detail is clearly needed. Never make promises about refunds or delivery dates you cannot guarantee. If a customer asks to speak to a human, always honor that immediately.

When a customer is clearly frustrated, repeatedly asking the same question, or explicitly requests a human, use the escalate_to_human tool. Do not wait for the customer to ask multiple times. Err on the side of escalating — a human agent can always de-escalate back to Rev if needed.`;

const MAX_ITERATIONS = 5;

function genId(prefix) {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}

async function getOrCreateConversation(conversationId, sessionId) {
  if (conversationId) {
    const { rows } = await pool.query(
      'SELECT id FROM conversations WHERE id = $1',
      [conversationId]
    );
    if (rows.length > 0) return conversationId;
  }

  // Get or create customer by session
  let customerId = null;
  if (sessionId) {
    const { rows } = await pool.query(
      `INSERT INTO customers (session_id) VALUES ($1)
       ON CONFLICT (session_id) DO UPDATE SET session_id = EXCLUDED.session_id
       RETURNING id`,
      [sessionId]
    );
    customerId = rows[0].id;
  }

  const newId = genId('conv');
  await pool.query(
    `INSERT INTO conversations (id, customer_id) VALUES ($1, $2)`,
    [newId, customerId]
  );
  return newId;
}

async function saveMessage(conversationId, role, content, toolCalls = null) {
  const id = genId('msg');
  await pool.query(
    `INSERT INTO messages (id, conversation_id, role, content, tool_calls)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, conversationId, role, content, toolCalls ? JSON.stringify(toolCalls) : null]
  );

  await pool.query(
    `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
    [conversationId]
  );
  return id;
}

export async function runAgent(conversationHistory, conversationId, sessionId) {
  const convId = await getOrCreateConversation(conversationId, sessionId);

  // Save the latest user message (last in history)
  const lastMsg = conversationHistory[conversationHistory.length - 1];
  if (lastMsg?.role === 'user') {
    await saveMessage(convId, 'user', lastMsg.content);
  }

  const messages = [...conversationHistory];
  let iterations = 0;
  const toolCallsForMessage = [];

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      const replyText = textBlock ? textBlock.text : '';

      await saveMessage(
        convId,
        'assistant',
        replyText,
        toolCallsForMessage.length > 0 ? toolCallsForMessage : null
      );

      return { reply: replyText, conversationId: convId };
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const result = await executeTool(block.name, block.input, { conversationId: convId });
        toolCallsForMessage.push({ tool: block.name, input: block.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    const textBlock = response.content.find(b => b.type === 'text');
    const replyText = textBlock ? textBlock.text : 'Something went wrong. Please try again.';
    await saveMessage(convId, 'assistant', replyText, toolCallsForMessage.length > 0 ? toolCallsForMessage : null);
    return { reply: replyText, conversationId: convId };
  }

  const fallback = "I've hit my processing limit. Please try rephrasing your question.";
  await saveMessage(convId, 'assistant', fallback);
  return { reply: fallback, conversationId: convId };
}
