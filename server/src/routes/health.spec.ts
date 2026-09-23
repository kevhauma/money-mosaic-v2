import { describe, expect, it } from 'vitest';

import { startTestApp } from '../app.testing.js';
import type { HealthResponse } from './health.js';

describe('api: GET /api/health', () => {
  it('answers { ok: true, schemaVersion } as JSON', async () => {
    const baseUrl = await startTestApp();

    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = (await response.json()) as HealthResponse;
    expect(body.ok).toBe(true);
    expect(typeof body.schemaVersion).toBe('number');
    expect(body.schemaVersion).toBeGreaterThanOrEqual(0);
  });

  it('answers an unknown route with a JSON error body, not an HTML stack page', async () => {
    const baseUrl = await startTestApp();

    const response = await fetch(`${baseUrl}/api/nope`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect((await response.json()) as { error: string }).toEqual({
      error: 'No route for GET /api/nope',
    });
  });
});
