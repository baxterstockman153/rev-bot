import { lookupOrder, searchProducts } from './knowledge.js';

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
];

export function executeTool(name, input) {
  if (name === 'lookup_order') {
    return lookupOrder(input.identifier);
  }
  if (name === 'search_products') {
    return searchProducts(input.query, input.category);
  }
  return { error: `Unknown tool: ${name}` };
}
