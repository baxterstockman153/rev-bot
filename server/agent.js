import Anthropic from '@anthropic-ai/sdk';
import { toolDefinitions, executeTool } from './tools.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Rev, a customer service agent for NRG Innovations (getnrg.com), a leading aftermarket automotive parts brand based in Irwindale, CA. NRG specializes in steering wheels, quick releases, short hubs, racing seats, and shift knobs.

You have two tools: lookup_order and search_products. Use them whenever a customer asks about an order or a product.

Be knowledgeable, warm, and concise. You are passionate about cars and motorsport. Keep responses to 2-4 sentences unless more detail is clearly needed. Never make promises about refunds or delivery dates you cannot guarantee. If a customer asks to speak to a human, always honor that immediately.`;

const MAX_ITERATIONS = 5;

export async function runAgent(conversationHistory) {
  const messages = [...conversationHistory];
  let iterations = 0;

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
      // Extract the final text content
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock ? textBlock.text : '';
    }

    if (response.stop_reason === 'tool_use') {
      // Append assistant message with all content blocks
      messages.push({ role: 'assistant', content: response.content });

      // Execute all tool calls and collect results
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const result = executeTool(block.name, block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      // Append tool results as a user message
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop reason — return whatever text we have
    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock ? textBlock.text : 'Something went wrong. Please try again.';
  }

  return "I've hit my processing limit. Please try rephrasing your question.";
}
