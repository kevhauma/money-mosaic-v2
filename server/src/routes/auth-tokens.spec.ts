import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson, signInAs, startTestAppWithDb, type TestApp } from '../app.testing.js';
import { createApiToken } from '../auth/api-tokens.js';

type Issued = { id: number; name: string; createdAt: string; token: string };

/** An MCP `initialize` with the token — 200 if it authenticates, 401 if not. */
const mcpStatus = async (app: TestApp, token: string): Promise<number> =>
  (
    await fetch(`${app.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'spec', version: '0.0.0' },
        },
      }),
    })
  ).status;

describe('/api/auth/tokens (TICKET-MCP-05)', () => {
  it('creates a token that authenticates /mcp, and refuses a blank name', async () => {
    const app = await startTestAppWithDb({ seed: false });
    const alice = await signInAs(app, 'alice');

    const created = await apiJson<Issued>(app, '/api/auth/tokens', {
      as: alice,
      method: 'POST',
      body: { name: ' laptop ' },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'laptop', token: expect.stringMatching(/^mm_/) });
    expect(await mcpStatus(app, created.body.token)).toBe(200);

    const blank = await apiFetch(app, '/api/auth/tokens', {
      as: alice,
      method: 'POST',
      body: { name: '  ' },
    });
    expect(blank.status).toBe(400);
  });

  it("lists only the caller's tokens, never a hash or token", async () => {
    const app = await startTestAppWithDb({ seed: false });
    const alice = await signInAs(app, 'alice');
    const bob = await signInAs(app, 'bob');
    createApiToken(app.db, alice.id, 'laptop');
    createApiToken(app.db, bob.id, 'desktop');

    const { status, body } = await apiJson<Record<string, unknown>[]>(app, '/api/auth/tokens', {
      as: alice,
    });

    expect(status).toBe(200);
    expect(body.map((row) => row['name'])).toEqual(['laptop']);
    expect(Object.keys(body[0] ?? {}).sort()).toEqual(['createdAt', 'id', 'name']);
  });

  it("revokes the caller's own token, and 404s another user's or an unknown id", async () => {
    const app = await startTestAppWithDb({ seed: false });
    const alice = await signInAs(app, 'alice');
    const bob = await signInAs(app, 'bob');
    const mine = await apiJson<Issued>(app, '/api/auth/tokens', {
      as: alice,
      method: 'POST',
      body: { name: 'laptop' },
    });
    const bobs = await apiJson<Issued>(app, '/api/auth/tokens', {
      as: bob,
      method: 'POST',
      body: { name: 'desktop' },
    });

    const revoke = (id: number | string) =>
      apiFetch(app, `/api/auth/tokens/${id}`, { as: alice, method: 'DELETE' });

    expect((await revoke(bobs.body.id)).status).toBe(404);
    expect((await revoke(9999)).status).toBe(404);
    expect((await revoke('abc')).status).toBe(404);
    expect(await mcpStatus(app, bobs.body.token)).toBe(200);

    expect((await revoke(mine.body.id)).status).toBe(204);
    expect(await mcpStatus(app, mine.body.token)).toBe(401);
  });

  it('answers 401 without a session, and a bearer token does not count as one', async () => {
    const app = await startTestAppWithDb({ seed: false });
    const alice = await signInAs(app, 'alice');
    const token = createApiToken(app.db, alice.id, 'laptop');
    const asBearer = { ...alice, headers: { authorization: `Bearer ${token}` } };

    for (const as of [undefined, asBearer]) {
      expect((await apiFetch(app, '/api/auth/tokens', { as })).status).toBe(401);
      expect(
        (await apiFetch(app, '/api/auth/tokens', { as, method: 'POST', body: { name: 'x' } }))
          .status,
      ).toBe(401);
      expect((await apiFetch(app, '/api/auth/tokens/1', { as, method: 'DELETE' })).status).toBe(
        401,
      );
    }
  });
});
