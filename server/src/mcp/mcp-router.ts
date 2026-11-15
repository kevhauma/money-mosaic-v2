import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Router, type RequestHandler } from 'express';

import { findTokenUser } from '../auth/api-tokens.js';
import type { DrizzleDb } from '../db.js';
import { httpError } from '../http/errors.js';
import { registerTools } from './tools.js';

/** What the agent is told about the data before it calls anything (TICKET-MCP-01). */
export const MCP_INSTRUCTIONS = [
  'Money Mosaic is a personal finance app; every tool acts as the user who owns the token.',
  'Amounts are in EUR; a negative amount is money going out.',
  'Dates are YYYY-MM-DD.',
  '"Manual" (categoryManual) means a category set by a person or an agent rather than by a rule; rules never overwrite it.',
  'Tools marked destructive preview their changes first and only apply them when called again with confirm: true.',
].join('\n');

const BEARER = /^Bearer (\S+)$/;

/**
 * Bearer-only: `/mcp` never reads the session cookie, so a page open in a signed-in browser on the
 * LAN cannot drive it (CSRF), and `/api` never reads this header (TICKET-MCP-01).
 */
const requireToken =
  (db: DrizzleDb): RequestHandler =>
  (req, res, next) => {
    const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
    const user = token === undefined ? undefined : findTokenUser(db, token);
    if (user === undefined) {
      next(httpError(401, 'Missing or invalid API token'));
      return;
    }
    res.locals['userId'] = user.id;
    next();
  };

/**
 * `/mcp` — the Streamable HTTP transport in **stateless** mode: a fresh server per request, no
 * session store, so nothing outlives the request but the database.
 */
export const createMcpRouter = (db: DrizzleDb): Router => {
  const router = Router();
  router.use(requireToken(db));

  router.post('/', async (req, res) => {
    const server = new McpServer(
      { name: 'money-mosaic', version: '1.0.0' },
      { instructions: MCP_INSTRUCTIONS },
    );
    registerTools(server, db, res.locals['userId'] as number);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Stateless: there is no session to stream to (GET) or end (DELETE).
  router.all('/', (_req, res) => {
    res.set('Allow', 'POST').status(405).json({ error: 'Method not allowed' });
  });

  return router;
};
