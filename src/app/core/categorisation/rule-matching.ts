/**
 * The rule matcher lives in the repo-root `shared/` workspace so the server's `run_rules` tool
 * evaluates rules exactly as the UI does (TICKET-MCP-03). This re-export keeps every
 * `@/core/categorisation` import unchanged.
 */
export * from 'shared/rule-matching';
