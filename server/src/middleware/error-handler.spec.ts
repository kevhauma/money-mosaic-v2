import { describe, expect, it } from 'vitest';
import express from 'express';

import { startTestServer } from '../app.testing.js';
import { createErrorHandler, type HttpError } from './error-handler.js';

/** Mounts a route that throws `error`, behind the JSON error handler, and returns its base URL. */
const startThrowingApp = async (
  error: unknown,
  logError: (error: unknown) => void = () => undefined,
): Promise<string> => {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(createErrorHandler(logError));

  return startTestServer(app);
};

describe('middleware: JSON error handler', () => {
  it('turns a thrown error into a 500 with an { error } body', async () => {
    const baseUrl = await startThrowingApp(new Error('kaboom'));

    const response = await fetch(`${baseUrl}/boom`);

    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect((await response.json()) as { error: string }).toEqual({
      error: 'Internal server error',
    });
  });

  it('keeps an unexpected 500 message off the wire but hands it to the logger', async () => {
    const logged: unknown[] = [];
    const baseUrl = await startThrowingApp(
      new Error('UNIQUE constraint failed: users.email'),
      (error) => logged.push(error),
    );

    const response = await fetch(`${baseUrl}/boom`);

    expect((await response.json()) as { error: string }).toEqual({
      error: 'Internal server error',
    });
    expect((logged[0] as Error).message).toBe('UNIQUE constraint failed: users.email');
  });

  it('honours a status carried by the error', async () => {
    const error: HttpError = Object.assign(new Error('nope'), { status: 422 });
    const baseUrl = await startThrowingApp(error);

    const response = await fetch(`${baseUrl}/boom`);

    expect(response.status).toBe(422);
    expect((await response.json()) as { error: string }).toEqual({ error: 'nope' });
  });

  it('passes on a code a 4xx chose, for the client to branch on', async () => {
    const error: HttpError = Object.assign(new Error('nope'), {
      status: 401,
      clientCode: 'wrong_current_password',
    });
    const baseUrl = await startThrowingApp(error);

    const response = await fetch(`${baseUrl}/boom`);

    expect((await response.json()) as { error: string; code: string }).toEqual({
      error: 'nope',
      code: 'wrong_current_password',
    });
  });

  it('withholds a 5xx code, which nobody chose and so is an internal detail', async () => {
    // What better-sqlite3 and Node's fs throw: `code` is not a field only our own errors carry, so
    // echoing it unconditionally would put back the internals `messageOf` is careful to withhold.
    const error = Object.assign(new Error('UNIQUE constraint failed: users.email'), {
      code: 'SQLITE_CONSTRAINT_UNIQUE',
    });
    const baseUrl = await startThrowingApp(error);

    const response = await fetch(`${baseUrl}/boom`);

    expect(response.status).toBe(500);
    expect((await response.json()) as { error: string }).toEqual({
      error: 'Internal server error',
    });
  });

  it('withholds a foreign code on a 4xx it did not choose', async () => {
    // `express.json()` is mounted app-wide, and body-parser answers 400 for an aborted or malformed
    // body while passing the underlying stream error's `code` through untouched. Filtering by status
    // alone would let that reach the client, which is why the handler reads `clientCode` instead.
    const error = Object.assign(new Error('request aborted'), {
      status: 400,
      code: 'ECONNABORTED',
    });
    const baseUrl = await startThrowingApp(error);

    const response = await fetch(`${baseUrl}/boom`);

    expect(response.status).toBe(400);
    expect((await response.json()) as { error: string }).toEqual({ error: 'request aborted' });
  });
});
