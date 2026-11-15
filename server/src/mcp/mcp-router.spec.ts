import { describe, expect, it } from 'vitest';

import { apiFetch, signInAs, startTestAppWithDb, type TestApp } from '../app.testing.js';
import { createApiToken, findTokenUser } from '../auth/api-tokens.js';
import { runTokenCommand } from '../auth/token-command.js';
import { users } from '../schema/users.js';
import { apiTokens } from '../schema/api-tokens.js';
import { eq } from 'drizzle-orm';
import { connectMcp } from './mcp.testing.js';

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'spec', version: '0.0.0' },
  },
};

const postMcp = (app: TestApp, headers: Record<string, string>): Promise<Response> =>
  fetch(`${app.baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(INITIALIZE),
  });

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

describe('/mcp authentication', () => {
  it('accepts a valid bearer token', async () => {
    const app = await startTestAppWithDb({ seed: false });
    const { id } = await signInAs(app, 'alice');

    const response = await postMcp(app, bearer(createApiToken(app.db, id, 'cli')));

    expect(response.status).toBe(200);
  });

  it('answers 401 with no token, an unknown token or a malformed header', async () => {
    const app = await startTestAppWithDb({ seed: false });

    expect((await postMcp(app, {})).status).toBe(401);
    expect((await postMcp(app, bearer('mm_nope'))).status).toBe(401);
    expect((await postMcp(app, { authorization: 'Basic abc' })).status).toBe(401);
  });

  it('answers 401 to a valid session cookie without a token', async () => {
    const app = await startTestAppWithDb({ seed: false });
    const alice = await signInAs(app, 'alice');

    expect((await postMcp(app, alice.headers)).status).toBe(401);
  });

  it('answers 401 once the token is revoked', async () => {
    const app = await startTestAppWithDb({ seed: false });
    const { id } = await signInAs(app, 'alice');
    const token = createApiToken(app.db, id, 'cli');
    const [row] = app.db.select().from(apiTokens).all();

    runTokenCommand(app.db, ['revoke', String(row!.id)]);

    expect((await postMcp(app, bearer(token))).status).toBe(401);
  });

  it("answers 401 to a disabled user's token", async () => {
    const app = await startTestAppWithDb({ seed: false });
    const { id } = await signInAs(app, 'alice');
    const token = createApiToken(app.db, id, 'cli');

    app.db.update(users).set({ disabled: true }).where(eq(users.id, id)).run();

    expect((await postMcp(app, bearer(token))).status).toBe(401);
  });

  it('ignores a token sent to /api', async () => {
    const app = await startTestAppWithDb({ seed: false });
    const { id } = await signInAs(app, 'alice');
    const token = createApiToken(app.db, id, 'cli');

    const response = await fetch(`${app.baseUrl}/api/accounts`, { headers: bearer(token) });

    expect(response.status).toBe(401);
  });

  it('refuses GET, which a stateless server has no stream for', async () => {
    const app = await startTestAppWithDb({ seed: false });
    const { id } = await signInAs(app, 'alice');

    const response = await fetch(`${app.baseUrl}/mcp`, {
      headers: bearer(createApiToken(app.db, id, 'cli')),
    });

    expect(response.status).toBe(405);
  });

  it('tells the agent the conventions in its instructions, and lists the read tools', async () => {
    const app = await startTestAppWithDb({ seed: false });
    const { id } = await signInAs(app, 'alice');
    const client = await connectMcp(app, id);

    expect(client.instructions).toMatch(/EUR/);
    expect(client.instructions).toMatch(/YYYY-MM-DD/);
    expect(client.instructions).toMatch(/confirm: true/);
    expect(await client.toolNames()).toEqual(
      expect.arrayContaining([
        'list_accounts',
        'get_balances',
        'list_categories',
        'list_rules',
        'search_transactions',
        'get_loans',
        'get_future',
        'get_income',
      ]),
    );
  });
});

describe('token storage and the token command', () => {
  it('stores only the hash, and create prints the token once', async () => {
    const app = await startTestAppWithDb({ seed: false });
    await signInAs(app, 'alice');

    const output = runTokenCommand(app.db, ['create', 'alice', 'laptop']);
    const token = /mm_[0-9a-f]{64}/.exec(output)?.[0];

    expect(token).toBeDefined();
    const [row] = app.db.select().from(apiTokens).all();
    expect(row?.tokenHash).not.toBe(token);
    expect(JSON.stringify(row)).not.toContain(token!);
    expect(findTokenUser(app.db, token!)?.email).toBe('alice');
  });

  it('lists id, login, name and date but never a hash', async () => {
    const app = await startTestAppWithDb({ seed: false });
    const { id } = await signInAs(app, 'alice');
    createApiToken(app.db, id, 'laptop');
    const [row] = app.db.select().from(apiTokens).all();

    const output = runTokenCommand(app.db, ['list']);

    expect(output).toContain('alice');
    expect(output).toContain('laptop');
    expect(output).not.toContain(row!.tokenHash);
  });

  it('refuses an unknown login, an unknown id and bad arguments', async () => {
    const app = await startTestAppWithDb({ seed: false });

    expect(() => runTokenCommand(app.db, ['create', 'nobody', 'x'])).toThrow(/No user/);
    expect(() => runTokenCommand(app.db, ['revoke', '99'])).toThrow(/No token/);
    expect(() => runTokenCommand(app.db, ['create'])).toThrow(/Usage/);
  });

  it("goes with its user when the user is deleted, and isn't part of DELETE /api/data", async () => {
    const app = await startTestAppWithDb({ seed: false });
    const alice = await signInAs(app, 'alice');
    createApiToken(app.db, alice.id, 'laptop');

    expect((await apiFetch(app, '/api/data', { as: alice, method: 'DELETE' })).status).toBe(204);
    expect(app.db.select().from(apiTokens).all()).toHaveLength(1);

    app.db.delete(users).where(eq(users.id, alice.id)).run();
    expect(app.db.select().from(apiTokens).all()).toEqual([]);
  });
});
