import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** A tool's answer as one JSON text block — what every tool here returns. */
export const toolResult = (value: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value) }],
});

/** `YYYY-MM-DD`, as every date in the data model is stored. */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
