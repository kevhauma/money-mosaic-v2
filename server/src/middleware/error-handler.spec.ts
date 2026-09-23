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
});
