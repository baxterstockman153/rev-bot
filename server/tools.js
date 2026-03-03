import { lookupOrder, searchProducts } from './knowledge.js';
import pool from './db.js';

export const toolDefinitions = [
  {
    name: 'lookup_order',
    description: 'Look up an order by order ID (e.g. NRG-10042) or customer email address. Returns order status, tracking info, and items.',
    input_schema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'The order ID (e.g. NRG-10042) or the customer email address.',
        },
      },
      required: ['identifier'],
    },
  },
  {
    name: 'search_products',
    description: 'Search the NRG product catalog by keyword. Optionally filter by category. Returns up to 5 matching products and any relevant policy info.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keywords, e.g. "leather steering wheel", "350mm", "suede quick release".',
        },
        category: {
          type: 'string',
          enum: ['steering_wheels', 'quick_releases', 'seats', 'shift_knobs', 'short_hubs'],
          description: 'Optional product category to filter results.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Hand the conversation off to a human support agent. Use when: the customer explicitly asks for a human, the issue is a complex dispute, you cannot resolve the problem, or the customer is very frustrated. Include a brief reason and the customer\'s sentiment.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Brief explanation of why escalation is needed' },
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'], description: "Customer's emotional state" },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['reason', 'sentiment', 'priority'],
    },
  },
];

export async function executeTool(name, input, context = {}) {
  if (name === 'lookup_order') {
    return lookupOrder(input.identifier);
  }
  if (name === 'search_products') {
    return searchProducts(input.query, input.category);
  }
  if (name === 'escalate_to_human') {
    const { conversationId } = context;
    if (conversationId) {
      await pool.query(
        `UPDATE conversations
         SET status = 'escalated',
             escalation_reason = $1,
             escalated_at = NOW(),
             customer_sentiment = $2,
             priority = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [input.reason, input.sentiment, input.priority, conversationId]
      );
    }
    return {
      success: true,
      message: 'A human agent has been notified and will follow up shortly.',
    };
  }
  return { error: `Unknown tool: ${name}` };
}
