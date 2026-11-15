import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { DrizzleDb } from '../db.js';
import { registerAssignCategories } from './assign-categories.js';
import { registerReadTools } from './read-tools.js';

/** Every MCP tool, bound to the token's user. */
export const registerTools = (server: McpServer, db: DrizzleDb, userId: number): void => {
  registerReadTools(server, db, userId);
  registerAssignCategories(server, db, userId);
};
