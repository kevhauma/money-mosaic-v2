import { describe, expect, it, vi } from 'vitest';
import express from 'express';

import { startTestServer } from '../app.testing.js';
import { requestLogger } from './request-logger.js';

/** A minimal app that records its log lines into `lines`, rather than the whole backend. */
const startLoggingApp = async (lines: string[]): Promise<string> => {
  const app = express();
  app.use(requestLogger((line) => lines.push(line)));
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  return startTestServer(app);
};

describe('middleware: request logger', () => {
  it('logs one line per finished request, with method, url and status', async () => {
    const lines: string[] = [];
    const baseUrl = await startLoggingApp(lines);

    await fetch(`${baseUrl}/api/health`);
    // The line is written from the response's `finish` event, which can land just after fetch
    // resolves — poll for it rather than sleeping a fixed span this machine might not honour.
    await vi.waitFor(() => expect(lines).toHaveLength(1));

    expect(lines[0]).toMatch(/^GET \/api\/health 200 \d+ms$/);
  });
});
