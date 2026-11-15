import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { DrizzleDb } from '../db.js';
import { registerAssignCategories } from './assign-categories.js';
import { registerCategoryTools } from './category-tools.js';
import { registerReadTools } from './read-tools.js';
import { registerRuleTools } from './rule-tools.js';
import { registerRunRules } from './run-rules.js';

/** Every MCP tool, bound to the token's user. */
export const registerTools = (server: McpServer, db: DrizzleDb, userId: number): void => {
  registerReadTools(server, db, userId);
  registerAssignCategories(server, db, userId);
  registerRunRules(server, db, userId);
  registerCategoryTools(server, db, userId);
  registerRuleTools(server, db, userId);
};
