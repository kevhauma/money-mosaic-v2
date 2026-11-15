import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { onTestFinished } from 'vitest';

import type { TestApp } from '../app.testing.js';
import { createApiToken } from '../auth/api-tokens.js';

/** A tool call's outcome: the parsed JSON on success, the error text on a tool error. */
export type ToolOutcome<T> = { ok: true; value: T } | { ok: false; error: string };

export type McpTestClient = {
  /** The server's `instructions`, as the client received them. */
  readonly instructions: string | undefined;
  /** Every tool the server lists. */
  readonly toolNames: () => Promise<string[]>;
  readonly call: <T = unknown>(
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<ToolOutcome<T>>;
  /** `call`, asserting success. */
  readonly value: <T = unknown>(name: string, args?: Record<string, unknown>) => Promise<T>;
};

/**
 * Testing-only: a real MCP client over HTTP to the test app's `/mcp`, authenticated with a fresh
 * token for `userId` (TICKET-MCP-01). Closes when the test ends.
 */
export const connectMcp = async (app: TestApp, userId: number): Promise<McpTestClient> => {
  const token = createApiToken(app.db, userId, 'spec');
  const client = new Client({ name: 'spec', version: '0.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${app.baseUrl}/mcp`), {
      requestInit: { headers: { authorization: `Bearer ${token}` } },
    }),
  );
  onTestFinished(() => client.close());

  const call = async <T>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<ToolOutcome<T>> => {
    const result = await client.callTool({ name, arguments: args });
    const [first] = result.content as { type: string; text: string }[];
    const text = first?.text ?? '';
    return result.isError === true
      ? { ok: false, error: text }
      : { ok: true, value: JSON.parse(text) as T };
  };

  return {
    instructions: client.getInstructions(),
    toolNames: async () => (await client.listTools()).tools.map((tool) => tool.name),
    call,
    value: async <T>(name: string, args: Record<string, unknown> = {}): Promise<T> => {
      const outcome = await call<T>(name, args);
      if (!outcome.ok) throw new Error(`${name} failed: ${outcome.error}`);
      return outcome.value;
    },
  };
};
